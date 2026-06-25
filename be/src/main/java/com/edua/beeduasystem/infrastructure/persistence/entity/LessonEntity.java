package com.edua.beeduasystem.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.UUID;

@Entity
@Table(name = "lessons")
@Getter
@Setter
@NoArgsConstructor
public class LessonEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapter_id", nullable = false)
    private ChapterEntity chapter;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String name;

    private Integer page;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Nội dung SGK số hóa (summary, sections, formulas, ...). Null nếu chưa số hóa. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "knowledge_json")
    private String knowledgeJson;
}
