package com.bing.researchsurveyextractorapi.exceptions;

public class UserDoesNotExistException extends RuntimeException {

    public UserDoesNotExistException(String field, String value) {
        super(String.format("No user exists with %s: %s", field, value));
    }
}
