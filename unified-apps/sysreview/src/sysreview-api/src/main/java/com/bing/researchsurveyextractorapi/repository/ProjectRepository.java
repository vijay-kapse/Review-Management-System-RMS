package com.bing.researchsurveyextractorapi.repository;

import com.bing.researchsurveyextractorapi.models.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    @Transactional
    @Modifying
    @Query("update Project p set p.projectName = ?1, p.description = ?2 where p.projectId = ?3")
    void updateProjectNameAndDescriptionByProjectId(String projectName, String description, long projectId);

    @Transactional
    @Modifying
    @Query("update Project p set p.archived = ?1 where p.projectId = ?2")
    void updateArchivedByProjectId(boolean archived, long projectId);

    List<Project> findByOwnerUsername(String username);
}