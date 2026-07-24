package com.edua.beeduasystem.domain.model.library;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record LibraryContent(UUID id, UUID ownerId, LibraryContentType type, String title, Subject subject,
                             LibraryContentStatus status, JsonNode payload, String thumbnailUrl,
                             Instant createdAt, Instant updatedAt, Instant deletedAt) { }
