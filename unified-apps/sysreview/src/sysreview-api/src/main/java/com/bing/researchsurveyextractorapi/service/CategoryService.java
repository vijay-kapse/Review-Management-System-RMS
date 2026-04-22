package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryRequest;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryUpdateRequest;

import java.util.List;

public interface CategoryService {

    List<Category> loadAllCategoriesForProjectId(long projectId);

    Category loadCategory(long categoryId);

    List<Category> createCategory(CategoryRequest[] categories, long projectId);

    Category addCategoryToProject(CategoryRequest request, long project);

    void updateCategory(long categoryId, CategoryUpdateRequest request);

    void deleteCategory(long categoryId);
    boolean isCategoryInUse(long categoryId);

}
