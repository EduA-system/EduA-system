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
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
    private final AiClient aiClient;
    private final MoleculePromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final long aiTimeoutSeconds;
    private final AiSystemPromptService systemPromptService;

    @Autowired
    public MoleculeService(
            AiClient aiClient,
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
        MoleculeStructure formulaStructure = buildFromFormula(input.strip());
        if (formulaStructure != null) return formulaStructure;
        RawStructure raw;
        try {
            raw = objectMapper.readValue(extractJson(generateWithTimeout(input)), RawStructure.class);
            return validate(raw);
        } catch (MoleculeBuildException e) {
            throw e;
        } catch (Exception e) {
            throw new MoleculeBuildException("AI không trả về cấu trúc phân tử hợp lệ.");
        }
    }

    /**
     * Common formula requests do not need an external model. This provides a
     * deterministic, immediately viewable connection table while preserving AI
     * generation for chemical names and natural-language requests.
     */
    private MoleculeStructure buildFromFormula(String input) {
        if (!input.matches(".*\\d.*")) return null;
        Matcher matcher = FORMULA_PART.matcher(input);
        List<String> elements = new ArrayList<>();
        int cursor = 0;
        while (matcher.find()) {
            if (matcher.start() != cursor) return null;
            cursor = matcher.end();
            String element = normalize(matcher.group(1));
            int count = matcher.group(2).isBlank() ? 1 : Integer.parseInt(matcher.group(2));
            if (count < 1 || count > 100 || !MAX_VALENCE.containsKey(element) && !"H".equals(element)) return null;
            if (!"H".equals(element)) {
                for (int i = 0; i < count; i++) elements.add(element);
            }
        }
        if (cursor != input.length() || elements.isEmpty()) return null;

        List<MoleculeAtom> atoms = elements.stream().map(MoleculeAtom::new).toList();
        List<MoleculeBond> bonds = new ArrayList<>();
        List<Integer> carbons = new ArrayList<>();
        for (int i = 0; i < atoms.size(); i++) if ("C".equals(atoms.get(i).element())) carbons.add(i);
        for (int i = 1; i < carbons.size(); i++) bonds.add(new MoleculeBond(carbons.get(i - 1), carbons.get(i), 1));
        int anchor = carbons.isEmpty() ? 0 : 0;
        for (int i = 0; i < atoms.size(); i++) {
            if (i == anchor || "C".equals(atoms.get(i).element())) continue;
            int target = carbons.isEmpty() ? anchor : carbons.get((i - (carbons.size())) % carbons.size());
            bonds.add(new MoleculeBond(target, i, 1));
        }
        return new MoleculeStructure(input, atoms, List.copyOf(bonds));
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

    private MoleculeStructure validate(RawStructure raw) {
        if (raw == null || raw.name == null || raw.name.isBlank() || raw.atoms == null || raw.atoms.isEmpty() || raw.bonds == null) {
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
        return new MoleculeStructure(raw.name.strip(), List.copyOf(atoms), List.copyOf(bonds));
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
    private record RawStructure(String name, List<RawAtom> atoms, List<RawBond> bonds) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawAtom(String element) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawBond(Integer from, Integer to, Integer order) { }
}
