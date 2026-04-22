package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.CategoryNotFoundException;
import com.bing.researchsurveyextractorapi.mapper.CategoryMapper;
import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryRequest;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryUpdateRequest;
import com.bing.researchsurveyextractorapi.repository.CategoryRepository;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import com.bing.researchsurveyextractorapi.repository.SearchResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProjectRepository projectRepository;
    private final SearchResultRepository searchResultRepository;


    @Override
    public List<Category> loadAllCategoriesForProjectId(long projectId) {
        return categoryRepository.findByProjectProjectId(projectId);
    }

    @Override
    public Category loadCategory(long categoryId) {
        return categoryRepository.findById(categoryId).orElseThrow(() -> new CategoryNotFoundException(categoryId));
    }

    @Override
    public List<Category> createCategory(CategoryRequest[] categories, long projectId) {
        Project project = getProject(projectId);
        List<Category> categoriesToCreate = Arrays.stream(categories)
                .map(dto -> CategoryMapper.fromRequest(dto, project))
                .collect(Collectors.toList());
        return categoryRepository.saveAll(categoriesToCreate);
    }

    @Override
    public Category addCategoryToProject(CategoryRequest request, long projectId) {
        Project project = getProject(projectId);
        return categoryRepository.save(CategoryMapper.fromRequest(request, project));
    }

    @Override
    public void updateCategory(long categoryId, CategoryUpdateRequest request) {
        categoryRepository.updatePriorityAndLabelAndColorByCategoryId(request.getPriority(), request.getLabel(), request.getColor(), categoryId);
    }

    @Override
    public void deleteCategory(long categoryId) {
        categoryRepository.deleteById(categoryId);
    }

    @Override
    public boolean isCategoryInUse(long categoryId) {
        return searchResultRepository.existsByCategory_CategoryId(categoryId);
    }

    private Project getProject(long projectId) {
        return projectRepository.getById(projectId);
    }
}
