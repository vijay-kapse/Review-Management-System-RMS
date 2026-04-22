package com.bing.researchsurveyextractorapi.models;

import lombok.*;
import org.hibernate.Hibernate;

import javax.persistence.*;
import java.io.Serializable;
import java.time.YearMonth;
import java.util.Collection;
import java.util.Map;
import java.util.Objects;

@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "queries")
public class Query implements Serializable {

    @Id
    @GeneratedValue
    private Long queryId;

    @Column(nullable = false, columnDefinition = "VARCHAR(250) DEFAULT 'New Query'")
    private String queryName;

    @Column(nullable = false, length = 3000)
    private String searchText;

    private YearMonth fromMonth;
    private YearMonth toMonth;

    @ToString.Exclude
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "query")
    private Collection<SearchResult> searchResults;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    @ToString.Exclude
    private Project project;

    @ToString.Exclude
    @ElementCollection
    private Map<DatasourceApi, Integer> datasourceApiFetchCount;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        Query query = (Query) o;
        return getQueryId() != null && Objects.equals(getQueryId(), query.getQueryId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(queryId);
    }
}
