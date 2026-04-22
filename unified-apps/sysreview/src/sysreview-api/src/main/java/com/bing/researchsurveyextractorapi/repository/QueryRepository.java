package com.bing.researchsurveyextractorapi.repository;

import com.bing.researchsurveyextractorapi.models.Query;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QueryRepository extends JpaRepository<Query, Long> {
    List<Query> findByProjectProjectId(long projectId);
}
