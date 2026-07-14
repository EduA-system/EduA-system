package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.MoleculeStructure;
import com.edua.beeduasystem.presentation.dto.molecule.MoleculeAtomResponse;
import com.edua.beeduasystem.presentation.dto.molecule.MoleculeBondResponse;
import com.edua.beeduasystem.presentation.dto.molecule.MoleculeBuildRequest;
import com.edua.beeduasystem.presentation.dto.molecule.MoleculeBuildResponse;
import com.edua.beeduasystem.service.molecule.MoleculeService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/molecules")
public class MoleculeController {
    private final MoleculeService moleculeService;
    public MoleculeController(MoleculeService moleculeService) { this.moleculeService = moleculeService; }

    @PostMapping("/build")
    public MoleculeBuildResponse build(@Valid @RequestBody MoleculeBuildRequest request) {
        MoleculeStructure molecule = moleculeService.build(request.input());
        return new MoleculeBuildResponse(molecule.name(),
                molecule.atoms().stream().map(a -> new MoleculeAtomResponse(a.element())).toList(),
                molecule.bonds().stream().map(b -> new MoleculeBondResponse(b.from(), b.to(), b.order())).toList());
    }
}
