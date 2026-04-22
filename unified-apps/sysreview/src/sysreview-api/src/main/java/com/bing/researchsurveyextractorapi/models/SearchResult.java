package com.bing.researchsurveyextractorapi.models;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import lombok.*;
import org.hibernate.Hibernate;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.TypeDef;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Objects;

@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "search_results")
@TypeDef(name = "json", typeClass = JsonType.class)
public class SearchResult implements Serializable {

    @Id
    @GeneratedValue
    private Long resultId;

    @Type(type = "json")
    @Column(columnDefinition = "jsonb", nullable = false)
    private Document document;

    @Column(nullable = false)
    private DatasourceApi datasource;

    @ManyToOne(optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @ManyToOne(optional = false)
    @JoinColumn(name = "query_id", nullable = false)
    @ToString.Exclude
    private Query query;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        SearchResult searchResult = (SearchResult) o;
        return getResultId() != null && Objects.equals(getResultId(), searchResult.getResultId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(resultId);
    }
}
