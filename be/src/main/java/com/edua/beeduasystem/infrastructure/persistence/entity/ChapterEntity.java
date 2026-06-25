package com.edua.beeduasystem.infrastructure.persistence.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "chapters")
@Getter
@Setter
@NoArgsConstructor
public class ChapterEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "textbook_id", nullable = false)
    private TextbookEntity textbook;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @OneToMany(mappedBy = "chapter", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<LessonEntity> lessons = new ArrayList<>();
}
