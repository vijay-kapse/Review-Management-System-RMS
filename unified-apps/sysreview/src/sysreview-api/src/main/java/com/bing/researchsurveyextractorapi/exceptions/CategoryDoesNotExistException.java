package com.bing.researchsurveyextractorapi.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class CategoryDoesNotExistException extends RuntimeException {
    public CategoryDoesNotExistException(int priority) {
        super(String.format("Category with priority: %s doesn't exist for this project", priority));
    }
}
