package com.bing.researchsurveyextractorapi.repository;

import com.bing.researchsurveyextractorapi.models.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    @Transactional
    @Modifying
    @Query("update Category c set c.priority = ?1, c.label = ?2, c.color = ?3 where c.categoryId = ?4")
    int updatePriorityAndLabelAndColorByCategoryId(int priority, String label, String color, long categoryId);

    List<Category> findByProjectProjectId(long projectId);
}
