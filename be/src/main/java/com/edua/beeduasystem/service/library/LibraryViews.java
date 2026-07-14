package com.edua.beeduasystem.service.library;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.*;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.*;
public final class LibraryViews { private LibraryViews() {} public record Page(List<Summary> items,int page,int size,long total) {} public record Summary(UUID id,LibraryContentType type,String title,Subject subject,LibraryContentStatus status,String thumbnailUrl,Instant createdAt,Instant updatedAt) {} public record Detail(UUID id,LibraryContentType type,String title,Subject subject,LibraryContentStatus status,JsonNode payload,String thumbnailUrl,Instant createdAt,Instant updatedAt) {} }
