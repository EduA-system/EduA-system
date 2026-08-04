package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Resolve tên hiển thị của tác giả (fullName, fallback email) cho view blog. */
@Component
public class BlogAuthorResolver {

    public record Profile(String name, String avatarUrl) { }

    private final AppUserRepository userRepository;

    public BlogAuthorResolver(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Tên hiển thị của một tác giả; {@code null} nếu không tìm thấy. */
    public String name(UUID authorId) {
        return profile(authorId).name();
    }

    public Profile profile(UUID authorId) {
        return userRepository.findById(authorId).map(BlogAuthorResolver::profileOf).orElse(new Profile(null, null));
    }

    /** Map authorId → tên hiển thị cho nhiều tác giả (batch, tránh N+1). */
    public Map<UUID, String> names(Collection<UUID> authorIds) {
        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(AppUser::id, BlogAuthorResolver::displayName, (a, b) -> a));
    }

    public Map<UUID, Profile> profiles(Collection<UUID> authorIds) {
        return userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(AppUser::id, BlogAuthorResolver::profileOf, (a, b) -> a));
    }

    /** Tên hiển thị cho từng phần tử của một danh sách, dùng lại 1 lượt nạp. */
    public <T> Map<UUID, String> names(Collection<T> items, Function<T, UUID> authorIdOf) {
        return names(items.stream().map(authorIdOf).distinct().toList());
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }

    private static Profile profileOf(AppUser user) {
        return new Profile(displayName(user), user.avatarUrl());
    }
}
