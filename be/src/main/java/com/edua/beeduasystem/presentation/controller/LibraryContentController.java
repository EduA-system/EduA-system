package com.edua.beeduasystem.presentation.controller;
import com.edua.beeduasystem.presentation.dto.library.*;
import com.edua.beeduasystem.service.library.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/library/contents") @PreAuthorize("hasAnyRole('TEACHER', 'MODERATOR')")
public class LibraryContentController {
    private final LibraryContentService service;
    public LibraryContentController(LibraryContentService service) { this.service = service; }
    @GetMapping public LibraryViews.Page list(@RequestParam(required=false) String type,@RequestParam(required=false) String subject,@RequestParam(required=false) String q,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="updatedAt") String sort) { return service.list(type,subject,q,page,size,sort); }
    @GetMapping("/{id}") public LibraryViews.Detail get(@PathVariable UUID id) { return service.get(id); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public LibraryViews.Detail create(@RequestBody CreateLibraryContentRequest r) { return service.create(r.type(),r.title(),r.subject(),r.grade(),r.payload(),r.thumbnailUrl()); }
    @PatchMapping("/{id}") public LibraryViews.Detail update(@PathVariable UUID id,@RequestBody UpdateLibraryContentRequest r) { return service.update(id,r.title(),r.subject(),r.subject()!=null,r.grade(),r.grade()!=null,r.payload(),r.payload()!=null,r.thumbnailUrl(),r.thumbnailUrl()!=null); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id) { service.delete(id); }
    @PostMapping("/{id}/submission") public LibraryViews.Detail submit(@PathVariable UUID id) { return service.submit(id); }
    @DeleteMapping("/{id}/submission") public LibraryViews.Detail unsubmit(@PathVariable UUID id) { return service.unsubmit(id); }
    @GetMapping("/moderation-queue") @PreAuthorize("hasRole('MODERATOR')") public LibraryViews.Page moderationQueue(@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return service.listModerationQueue(page,size); }
    @PostMapping("/{id}/approval") @PreAuthorize("hasRole('MODERATOR')") public LibraryViews.Detail approve(@PathVariable UUID id) { return service.approve(id); }
    @PostMapping("/{id}/rejection") @PreAuthorize("hasRole('MODERATOR')") public LibraryViews.Detail reject(@PathVariable UUID id,@RequestBody RejectLibraryContentRequest r) { return service.reject(id,r.reason()); }
}
