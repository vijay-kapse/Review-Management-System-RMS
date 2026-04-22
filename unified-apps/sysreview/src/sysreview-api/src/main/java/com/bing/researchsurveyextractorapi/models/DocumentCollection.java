package com.bing.researchsurveyextractorapi.models;

import lombok.*;
import org.hibernate.Hibernate;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Objects;
import java.util.Set;

@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "document_collections")
public class DocumentCollection implements Serializable {

    @Id
    @GeneratedValue
    private Long collectionId;

    @Column(nullable = false)
    private String collectionName;

    @ManyToMany
    @JoinTable(
            name = "result_collections",
            joinColumns = @JoinColumn(name = "collection_id"),
            inverseJoinColumns = @JoinColumn(name = "result_id")
    )
    @ToString.Exclude
    private Set<SearchResult> searchResults;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @ToString.Exclude
    private Project project;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        DocumentCollection that = (DocumentCollection) o;
        return getCollectionId() != null && Objects.equals(getCollectionId(), that.getCollectionId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(collectionId, collectionName);
    }
}
