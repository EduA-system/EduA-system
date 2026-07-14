package com.edua.beeduasystem.presentation.dto.library;
import com.fasterxml.jackson.databind.JsonNode;
public record UpdateLibraryContentRequest(String title, String subject, JsonNode payload, String thumbnailUrl) { }
