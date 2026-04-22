package com.bing.researchsurveyextractorapi.models;

import lombok.*;
import org.hibernate.Hibernate;

import javax.persistence.*;
import java.io.Serializable;
import java.util.Collection;
import java.util.Objects;

@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "projects")
public class Project implements Serializable {

    @Id
    @GeneratedValue
    @Column(nullable = false)
    private Long projectId;

    @Column(nullable = false)
    private String projectName;

    @Column(nullable = false)
    private String description;

    @ManyToOne(cascade = CascadeType.REFRESH)
    @JoinColumn(name = "user_id")
    private User owner;

    @ManyToMany(cascade = CascadeType.ALL)
    @JoinTable(
            name = "project_collaborators",
            joinColumns = @JoinColumn(name = "project_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    @ToString.Exclude
    private Collection<User> collaborators;

    @ToString.Exclude
    @OneToMany(cascade = {CascadeType.ALL}, mappedBy = "project")
    private Collection<Category> categories;

    @ToString.Exclude
    @OneToMany(cascade = CascadeType.ALL, mappedBy = "project")
    private Collection<Query> queries;

    @ToString.Exclude
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    private Collection<DocumentCollection> documentCollections;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || Hibernate.getClass(this) != Hibernate.getClass(o)) return false;
        Project project = (Project) o;
        return getProjectId() != null && Objects.equals(getProjectId(), project.getProjectId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(projectId, projectName, description);
    }
}
