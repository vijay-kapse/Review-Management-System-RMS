package com.bing.researchsurveyextractorapi.repository;

import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.SearchResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface SearchResultRepository extends JpaRepository<SearchResult, Long> {
    @Transactional
    @Modifying
    @Query("update SearchResult s set s.category = ?1 where s.resultId = ?2")
    int updateCategoryByResultId(Category category, Long resultId);

    boolean existsByCategory_CategoryId(Long categoryId);
}