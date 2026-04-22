package com.bing.researchsurveyextractorapi.repository;

import com.bing.researchsurveyextractorapi.models.DocumentCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface DocumentCollectionRepository extends JpaRepository<DocumentCollection, Long> {
    Collection<DocumentCollection> findByProjectProjectId(long projectId);
}
