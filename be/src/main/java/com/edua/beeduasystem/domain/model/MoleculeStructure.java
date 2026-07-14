package com.edua.beeduasystem.domain.model;

import java.util.List;

public record MoleculeStructure(String name, List<MoleculeAtom> atoms, List<MoleculeBond> bonds) {
}
