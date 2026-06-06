package com.edua.beeduasystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class BeEduaSystemApplicationTests {

    @LocalServerPort
    private int port;

    @Test
    void contextLoads() {
    }

    @Test
    void healthEndpointReturnsExpectedPayload() throws Exception {
        HttpURLConnection connection = getConnection("/api/health");

        org.junit.jupiter.api.Assertions.assertEquals(200, connection.getResponseCode());
        String body = new String(connection.getInputStream().readAllBytes());
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"status\":\"UP\""));
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"service\":\"be-edua-system\""));
    }

    @Test
    void openApiDocsAreAvailable() throws Exception {
        HttpURLConnection connection = getConnection("/v3/api-docs");

        org.junit.jupiter.api.Assertions.assertEquals(200, connection.getResponseCode());
        String body = new String(connection.getInputStream().readAllBytes());
        org.junit.jupiter.api.Assertions.assertTrue(body.contains("\"openapi\""));
    }

    @Test
    void swaggerUiIsAvailable() throws Exception {
        HttpURLConnection connection = getConnection("/swagger-ui/index.html");

        org.junit.jupiter.api.Assertions.assertEquals(200, connection.getResponseCode());
    }

    private HttpURLConnection getConnection(String path) throws IOException {
        URI uri = URI.create("http://localhost:" + port + path);
        HttpURLConnection connection = (HttpURLConnection) uri.toURL().openConnection();
        connection.setRequestMethod("GET");
        return connection;
    }
}
