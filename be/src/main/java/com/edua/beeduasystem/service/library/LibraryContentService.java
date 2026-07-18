package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.*;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.UUID;

@Service
public class LibraryContentService {
    private final LibraryContentRepository repository;
    private final CurrentUserProvider currentUser;
    public LibraryContentService(LibraryContentRepository repository, CurrentUserProvider currentUser) { this.repository = repository; this.currentUser = currentUser; }
    public LibraryViews.Page list(String rawType, String rawSubject, String q, int page, int size, String sort) {
        return toPage(repository.search(currentUser.requireUserId(), parseType(rawType), parseSubject(rawSubject), q, page, size, "title".equalsIgnoreCase(sort)), page, size);
    }
    public LibraryViews.Detail get(UUID id) { return toDetail(requireOwner(id)); }
    public LibraryViews.Detail create(String rawType, String title, String rawSubject, JsonNode payload, String thumbnailUrl) {
        LibraryContentType type = parseTypeRequired(rawType); Instant now = Instant.now();
        return toDetail(repository.save(new LibraryContent(UUID.randomUUID(), currentUser.requireUserId(), type, requiredTitle(title), parseSubject(rawSubject), LibraryContentStatus.PRIVATE, payload == null ? JsonNodeFactory.instance.objectNode() : payload, cleanUrl(thumbnailUrl), now, now, null)));
    }
    public LibraryViews.Detail update(UUID id, String title, String rawSubject, boolean subjectProvided, JsonNode payload, boolean payloadProvided, String thumbnailUrl, boolean thumbnailProvided) {
        LibraryContent c = requireOwner(id);
        return toDetail(repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(), title == null ? c.title() : requiredTitle(title), subjectProvided ? parseSubject(rawSubject) : c.subject(), c.status(), payloadProvided ? (payload == null ? JsonNodeFactory.instance.objectNode() : payload) : c.payload(), thumbnailProvided ? cleanUrl(thumbnailUrl) : c.thumbnailUrl(), c.createdAt(), Instant.now(), null)));
    }
    public void delete(UUID id) { LibraryContent c = requireOwner(id); repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.status(),c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),Instant.now())); }
    private LibraryContent requireOwner(UUID id) { LibraryContent c = repository.findActiveById(id).orElseThrow(() -> new ResourceNotFoundException("Library content not found.")); if (!c.ownerId().equals(currentUser.requireUserId())) throw new ForbiddenOperationException("You can only access your own library content."); return c; }
    private static LibraryViews.Page toPage(LibraryContentRepository.SearchResult r, int page, int size) { return new LibraryViews.Page(r.items().stream().map(LibraryContentService::toSummary).toList(), Math.max(0,page), Math.min(Math.max(1,size),100), r.total()); }
    private static LibraryViews.Summary toSummary(LibraryContent c) { return new LibraryViews.Summary(c.id(),c.type(),c.title(),c.subject(),c.status(),c.thumbnailUrl(),c.createdAt(),c.updatedAt()); }
    private static LibraryViews.Detail toDetail(LibraryContent c) { return new LibraryViews.Detail(c.id(),c.type(),c.title(),c.subject(),c.status(),c.payload(),c.thumbnailUrl(),c.createdAt(),c.updatedAt()); }
    private static String requiredTitle(String title) { if (title == null || title.isBlank()) throw new IllegalArgumentException("Title is required."); return title.trim(); }
    private static String cleanUrl(String url) { return url == null || url.isBlank() ? null : url.trim(); }
    private static LibraryContentType parseTypeRequired(String value) { LibraryContentType type = parseType(value); if(type == null) throw new IllegalArgumentException("Type is required. Allowed: LESSON_PLAN, SLIDE_DECK, TEST, SIMULATION."); return type; }
    private static LibraryContentType parseType(String value) { if(value == null || value.isBlank()) return null; try { return LibraryContentType.valueOf(value.trim().toUpperCase()); } catch(IllegalArgumentException e) { throw new IllegalArgumentException("Invalid type."); } }
    private static Subject parseSubject(String value) { if(value == null || value.isBlank()) return null; try { return Subject.valueOf(value.trim().toUpperCase()); } catch(IllegalArgumentException e) { throw new IllegalArgumentException("Invalid subject. Allowed: MATH, CHEMISTRY, PHYSICS."); } }
}
