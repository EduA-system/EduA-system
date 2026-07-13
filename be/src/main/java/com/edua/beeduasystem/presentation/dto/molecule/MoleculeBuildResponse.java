package com.edua.beeduasystem.presentation.dto.molecule;

import java.util.List;

public record MoleculeBuildResponse(String name, List<MoleculeAtomResponse> atoms, List<MoleculeBondResponse> bonds) {
}
