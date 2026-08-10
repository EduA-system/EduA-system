package com.edua.beeduasystem.repository.gateways;

public interface DocumentPdfRenderer {
    byte[] render(String html);
}

