package com.bing.researchsurveyextractorapi.exceptions;

public class CategoryDoesNotExistException extends RuntimeException {
    public CategoryDoesNotExistException(int priority) {
        super(String.format("Category with priority: %s doesn't exist for this project", priority));
    }
}
