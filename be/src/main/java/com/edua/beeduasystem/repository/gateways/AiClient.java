package com.edua.beeduasystem.repository.gateways;

public interface AiClient {

    String generate(String prompt);

    String generate(String prompt, byte[] image, String mimeType);
}
