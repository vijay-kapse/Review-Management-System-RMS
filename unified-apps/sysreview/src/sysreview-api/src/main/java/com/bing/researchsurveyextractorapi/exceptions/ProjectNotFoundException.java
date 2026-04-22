package com.bing.researchsurveyextractorapi.exceptions;

public class ProjectNotFoundException extends RuntimeException {

    public ProjectNotFoundException(long projectId) {
        super(String.format("No project with project id: %s exists!", projectId));
    }
}
