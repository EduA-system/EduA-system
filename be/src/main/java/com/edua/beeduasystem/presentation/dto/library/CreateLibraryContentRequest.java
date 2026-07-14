package com.edua.beeduasystem.presentation.dto.library;
import com.fasterxml.jackson.databind.JsonNode;
public record CreateLibraryContentRequest(String type, String title, String subject, JsonNode payload, String thumbnailUrl) { }
