package com.edua.beeduasystem.service.molecule;

import com.edua.beeduasystem.domain.exception.MoleculeBuildException;
import com.edua.beeduasystem.domain.model.MoleculeAtom;
import com.edua.beeduasystem.domain.model.MoleculeBond;
import com.edua.beeduasystem.domain.model.MoleculeStructure;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MoleculeService {
    private static final Map<String, Integer> MAX_VALENCE = Map.of(
            "C", 4, "N", 3, "O", 2, "F", 1, "P", 5, "S", 6, "Cl", 1, "Br", 1, "I", 1);
    private static final Pattern FORMULA_PART = Pattern.compile("([A-Za-z][a-z]?)(\\d*)");
    private static final Map<String, MoleculeStructure> KNOWN_FORMULA_STRUCTURES = Map.of(
            "H2", structure("Hydrogen", "H", "H", 1),
            "N2", structure("Nitrogen", "N", "N", 3),
            "O2", structure("Oxygen", "O", "O", 2),
            "F2", structure("Fluorine", "F", "F", 1),
            "Cl2", structure("Chlorine", "Cl", "Cl", 1),
            "Br2", structure("Bromine", "Br", "Br", 1),
            "I2", structure("Iodine", "I", "I", 1));
    private final AiClient aiClient;
    private final MoleculePromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final long aiTimeoutSeconds;
    private final AiSystemPromptService systemPromptService;

    @Autowired
    public MoleculeService(
            @Qualifier("jsonAiClient") AiClient aiClient,
            MoleculePromptBuilder promptBuilder,
            ObjectMapper objectMapper,
            @Value("${app.ai.molecule.timeout-seconds:10}") long aiTimeoutSeconds,
            AiSystemPromptService systemPromptService) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
        this.aiTimeoutSeconds = aiTimeoutSeconds;
        this.systemPromptService = systemPromptService;
    }

    MoleculeService(AiClient aiClient, MoleculePromptBuilder promptBuilder, ObjectMapper objectMapper, long aiTimeoutSeconds) {
        this(aiClient, promptBuilder, objectMapper, aiTimeoutSeconds, null);
    }

    public MoleculeStructure build(String input) {
        if (input == null || input.isBlank()) throw new MoleculeBuildException("Hãy nhập tên hoặc công thức chất.");
        String normalizedInput = input.strip();
        MoleculeStructure formulaStructure = KNOWN_FORMULA_STRUCTURES.get(normalizedInput);
        if (formulaStructure != null) return formulaStructure;
        RawStructure raw;
        try {
            raw = objectMapper.readValue(extractJson(generateWithTimeout(normalizedInput)), RawStructure.class);
            return validate(normalizedInput, raw, parseFormula(normalizedInput));
        } catch (MoleculeBuildException e) {
            throw e;
        } catch (Exception e) {
            throw new MoleculeBuildException("AI không trả về cấu trúc phân tử hợp lệ.");
        }
    }

    private static MoleculeStructure structure(String name, String firstElement, String secondElement, int bondOrder) {
        return new MoleculeStructure(name,
                List.of(new MoleculeAtom(firstElement), new MoleculeAtom(secondElement)),
                List.of(new MoleculeBond(0, 1, bondOrder)));
    }

    /** Parses a plain molecular formula for validation only; it must never infer bonds. */
    private FormulaCounts parseFormula(String input) {
        if (!input.matches("(?:[A-Z][a-z]?\\d*)+")) return null;
        Matcher matcher = FORMULA_PART.matcher(input);
        Map<String, Integer> counts = new HashMap<>();
        int cursor = 0;
        while (matcher.find()) {
            if (matcher.start() != cursor) return null;
            cursor = matcher.end();
            String element = normalize(matcher.group(1));
            int count = matcher.group(2).isBlank() ? 1 : Integer.parseInt(matcher.group(2));
            if (count < 1 || count > 100 || !MAX_VALENCE.containsKey(element) && !"H".equals(element)) return null;
            counts.merge(element, count, Integer::sum);
        }
        return cursor == input.length() && !counts.isEmpty() ? new FormulaCounts(Map.copyOf(counts)) : null;
    }

    private String generateWithTimeout(String input) {
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            Future<String> task = executor.submit(() -> aiClient.generate(systemPromptService == null
                    ? promptBuilder.build(input) : systemPromptService.apply(AiPromptKey.MOLECULE_STRUCTURE, promptBuilder.build(input))));
            try {
                return task.get(aiTimeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                task.cancel(true);
                throw new MoleculeBuildException("AI phản hồi quá lâu. Vui lòng thử lại sau.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new MoleculeBuildException("Yêu cầu tạo cấu trúc đã bị gián đoạn.");
            } catch (ExecutionException e) {
                throw new MoleculeBuildException("Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.");
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private MoleculeStructure validate(String input, RawStructure raw, FormulaCounts formula) {
        if (raw == null) {
            throw new MoleculeBuildException("AI trả về thiếu tên, nguyên tử hoặc liên kết.");
        }
        if (raw.errorCode != null || raw.message != null && (raw.name == null || raw.name.isBlank())) {
            throw new MoleculeBuildException(toUserFacingAiError(input, raw));
        }
        if (raw.name == null || raw.name.isBlank() || raw.atoms == null || raw.atoms.isEmpty() || raw.bonds == null) {
            throw new MoleculeBuildException("AI trả về thiếu tên, nguyên tử hoặc liên kết.");
        }
        List<MoleculeAtom> atoms = new ArrayList<>();
        int[] oldToNew = new int[raw.atoms.size()];
        for (int i = 0; i < raw.atoms.size(); i++) {
            RawAtom rawAtom = raw.atoms.get(i);
            if (rawAtom == null) throw new MoleculeBuildException("Nguyên tử không hợp lệ.");
            String element = normalize(rawAtom.element);
            if ("H".equals(element)) { oldToNew[i] = -1; continue; }
            if (!MAX_VALENCE.containsKey(element)) throw new MoleculeBuildException("Nguyên tố không được hỗ trợ: " + element);
            oldToNew[i] = atoms.size();
            atoms.add(new MoleculeAtom(element));
        }
        if (atoms.isEmpty()) throw new MoleculeBuildException("Cấu trúc phải có ít nhất một nguyên tử không phải hydro.");
        List<MoleculeBond> bonds = new ArrayList<>();
        int[] valence = new int[atoms.size()];
        for (RawBond bond : raw.bonds) {
            if (bond == null || bond.from == null || bond.to == null || bond.order == null
                    || bond.from < 0 || bond.to < 0 || bond.from >= oldToNew.length || bond.to >= oldToNew.length) {
                throw new MoleculeBuildException("Liên kết có chỉ số nguyên tử không hợp lệ.");
            }
            if (bond.order < 1 || bond.order > 3) throw new MoleculeBuildException("Bậc liên kết phải từ 1 đến 3.");
            if (bond.from.equals(bond.to)) throw new MoleculeBuildException("Liên kết không thể nối một nguyên tử với chính nó.");
            int from = oldToNew[bond.from], to = oldToNew[bond.to];
            if (from < 0 || to < 0) continue;
            valence[from] += bond.order; valence[to] += bond.order;
            bonds.add(new MoleculeBond(from, to, bond.order));
        }
        for (int i = 0; i < atoms.size(); i++) {
            if (valence[i] > MAX_VALENCE.get(atoms.get(i).element())) {
                throw new MoleculeBuildException("Cấu trúc vượt hoá trị của " + atoms.get(i).element() + ".");
            }
        }
        validateFormulaConsistency(formula, atoms, valence);
        return new MoleculeStructure(raw.name.strip(), List.copyOf(atoms), List.copyOf(bonds));
    }

    /** Ensures model bonds produce exactly the atoms and implicit hydrogens in a formula request. */
    private void validateFormulaConsistency(FormulaCounts formula, List<MoleculeAtom> atoms, int[] valence) {
        if (formula == null) return;
        Map<String, Integer> actualHeavyAtoms = new HashMap<>();
        for (MoleculeAtom atom : atoms) actualHeavyAtoms.merge(atom.element(), 1, Integer::sum);
        Map<String, Integer> expectedHeavyAtoms = new HashMap<>(formula.counts());
        expectedHeavyAtoms.remove("H");
        if (!actualHeavyAtoms.equals(expectedHeavyAtoms)) {
            throw new MoleculeBuildException("Cấu trúc AI không khớp với công thức hoá học đã yêu cầu.");
        }
        int impliedHydrogens = 0;
        for (int i = 0; i < atoms.size(); i++) impliedHydrogens += MAX_VALENCE.get(atoms.get(i).element()) - valence[i];
        if (impliedHydrogens != formula.counts().getOrDefault("H", 0)) {
            throw new MoleculeBuildException("Bậc liên kết AI không khớp với công thức hoá học đã yêu cầu.");
        }
    }

    private static String toUserFacingAiError(String input, RawStructure raw) {
        String code = raw.errorCode == null ? "" : raw.errorCode.strip();
        if ("not_a_chemical_request".equals(code)) {
            return "Không nhận ra \"" + input + "\" là tên hoặc công thức hoá học. Hãy nhập tên chất cụ thể như etanol hoặc công thức như C2H4.";
        }
        if ("ambiguous_chemical_request".equals(code)) {
            return "Yêu cầu \"" + input + "\" chưa đủ cụ thể để xác định một phân tử đơn lẻ. Hãy nhập tên/công thức cụ thể hơn, ví dụ C2H4 hoặc PVC repeat unit.";
        }
        if (raw.message != null && !raw.message.isBlank()) return raw.message.strip();
        return "Chưa tạo được mô hình phân tử cho \"" + input + "\". Hãy thử nhập tên hoặc công thức hoá học cụ thể hơn.";
    }

    private static String extractJson(String response) {
        if (response == null) throw new MoleculeBuildException("AI không trả về dữ liệu.");
        String text = response.strip().replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        int start = text.indexOf('{'), end = text.lastIndexOf('}');
        if (start < 0 || end <= start) throw new MoleculeBuildException("AI không trả về JSON hợp lệ.");
        return text.substring(start, end + 1);
    }

    private static String normalize(String element) {
        if (element == null || element.isBlank()) throw new MoleculeBuildException("Nguyên tố không hợp lệ.");
        String value = element.strip();
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1).toLowerCase(Locale.ROOT);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawStructure(String name, List<RawAtom> atoms, List<RawBond> bonds, String errorCode, String message) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawAtom(String element) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawBond(Integer from, Integer to, Integer order) { }
    private record FormulaCounts(Map<String, Integer> counts) { }
}
