package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.mapper.CategoryMapper;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryDto;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryRequest;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryUpdateRequest;
import com.bing.researchsurveyextractorapi.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("${API_V1_URI}/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/{categoryId}")
    public CategoryDto getResultCategory(@PathVariable long categoryId) {
        return CategoryMapper.toDto(categoryService.loadCategory(categoryId));
    }

    @GetMapping("/project/{projectId}")
    public List<CategoryDto> getResultCategories(@PathVariable long projectId) {
        return categoryService.loadAllCategoriesForProjectId(projectId)
                .stream()
                .map(CategoryMapper::toDto)
                .collect(Collectors.toList());
    }

    @PostMapping("/project/{projectId}")
    public List<CategoryDto> createResultCategories(@PathVariable long projectId, @RequestBody CategoryRequest[] categories) {
        return categoryService.createCategory(categories, projectId)
                .stream()
                .map(CategoryMapper::toDto)
                .collect(Collectors.toList());
    }

    @PutMapping("/{categoryId}")
    public void updateResultCategory(@PathVariable long categoryId, @RequestBody CategoryUpdateRequest request) {
        categoryService.updateCategory(categoryId, request);
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<String> deleteResultCategory(@PathVariable long categoryId) {
        if (categoryService.isCategoryInUse(categoryId)) {
            return ResponseEntity.badRequest().body("Category is already in use, kindly re-map result before deleting");
        } else {
            categoryService.deleteCategory(categoryId);
            return ResponseEntity.accepted().build();
        }
    }

    @PatchMapping("/project/{projectId}")
    public CategoryDto addResultCategory(@PathVariable long projectId, @RequestBody CategoryRequest category) {
        return CategoryMapper.toDto(categoryService.addCategoryToProject(category, projectId));
    }
}
