package com.bing.researchsurveyextractorapi.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class ProjectNotFoundException extends RuntimeException {

    public ProjectNotFoundException(long projectId) {
        super(String.format("No project with project id: %s exists!", projectId));
    }
}
