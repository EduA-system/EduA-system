package com.edua.beeduasystem.service.molecule;

import com.edua.beeduasystem.domain.exception.MoleculeBuildException;
import com.edua.beeduasystem.domain.model.MoleculeStructure;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MoleculeServiceTest {
    private AiClient aiClient;
    private MoleculeService service;

    @BeforeEach
    void setUp() {
        aiClient = mock(AiClient.class);
        service = new MoleculeService(aiClient, new MoleculePromptBuilder(), new ObjectMapper(), 1);
    }

    @Test
    void buildsValidStructureAndRemovesHydrogenAtoms() {
        when(aiClient.generate(anyString())).thenReturn("```json\n{\"name\":\"Ethanol\",\"atoms\":[{\"element\":\"c\"},{\"element\":\"O\"},{\"element\":\"H\"}],\"bonds\":[{\"from\":0,\"to\":1,\"order\":1},{\"from\":1,\"to\":2,\"order\":1}]}\n```");

        MoleculeStructure result = service.build("etanol");

        assertEquals("Ethanol", result.name());
        assertEquals(2, result.atoms().size());
        assertEquals("C", result.atoms().getFirst().element());
        assertEquals(1, result.bonds().size());
    }

    @Test
    void rejectsBlankInput() {
        assertThrows(MoleculeBuildException.class, () -> service.build(" "));
    }

    @Test
    void buildsFormulaWithoutWaitingForAi() {
        MoleculeStructure result = service.build("C12H22O11");

        assertEquals(23, result.atoms().size());
        assertEquals(12, result.atoms().stream().filter(atom -> atom.element().equals("C")).count());
        assertEquals(11, result.atoms().stream().filter(atom -> atom.element().equals("O")).count());
        verifyNoInteractions(aiClient);
    }

    @Test
    void rejectsInvalidJson() {
        when(aiClient.generate(anyString())).thenReturn("not json");
        assertThrows(MoleculeBuildException.class, () -> service.build("etan"));
    }

    @Test
    void rejectsNonChemicalRequestWithUserFacingMessage() {
        when(aiClient.generate(anyString())).thenReturn("{\"errorCode\":\"not_a_chemical_request\",\"message\":\"Không nhận ra đây là tên hoặc công thức hoá học.\"}");

        MoleculeBuildException error = assertThrows(MoleculeBuildException.class, () -> service.build("abcc"));

        assertEquals("Không nhận ra \"abcc\" là tên hoặc công thức hoá học. Hãy nhập tên chất cụ thể như etanol hoặc công thức như C2H4.", error.getMessage());
    }

    @Test
    void rejectsUnsupportedElement() {
        when(aiClient.generate(anyString())).thenReturn("{\"name\":\"Salt\",\"atoms\":[{\"element\":\"Na\"}],\"bonds\":[]}");
        assertThrows(MoleculeBuildException.class, () -> service.build("muối"));
    }

    @Test
    void rejectsBadBondIndexOrderAndValence() {
        when(aiClient.generate(anyString())).thenReturn("{\"name\":\"X\",\"atoms\":[{\"element\":\"C\"}],\"bonds\":[{\"from\":0,\"to\":2,\"order\":1}]}");
        assertThrows(MoleculeBuildException.class, () -> service.build("x"));
        when(aiClient.generate(anyString())).thenReturn("{\"name\":\"X\",\"atoms\":[{\"element\":\"C\"},{\"element\":\"O\"}],\"bonds\":[{\"from\":0,\"to\":1,\"order\":4}]}");
        assertThrows(MoleculeBuildException.class, () -> service.build("x"));
        when(aiClient.generate(anyString())).thenReturn("{\"name\":\"X\",\"atoms\":[{\"element\":\"O\"},{\"element\":\"C\"},{\"element\":\"C\"}],\"bonds\":[{\"from\":0,\"to\":1,\"order\":2},{\"from\":0,\"to\":2,\"order\":2}]}");
        assertThrows(MoleculeBuildException.class, () -> service.build("x"));
    }
}
