package com.bing.researchsurveyextractorapi.mapper;

import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryDto;
import com.bing.researchsurveyextractorapi.pojo.category.CategoryRequest;

public class CategoryMapper {

    private CategoryMapper() {
        throw new IllegalStateException("Mapper class");
    }

    public static CategoryDto toDto(Category category) {
        return CategoryDto.builder()
                .categoryId(category.getCategoryId())
                .label(category.getLabel())
                .color(category.getColor())
                .priority(category.getPriority())
                .build();
    }

    public static Category fromRequest(CategoryRequest categoryRequest, Project project) {
        return Category.builder()
                .priority(categoryRequest.getPriority())
                .color(categoryRequest.getColor())
                .label(categoryRequest.getLabel())
                .project(project)
                .build();
    }
}
