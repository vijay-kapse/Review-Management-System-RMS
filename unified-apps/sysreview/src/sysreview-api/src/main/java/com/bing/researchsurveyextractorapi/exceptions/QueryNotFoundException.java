package com.bing.researchsurveyextractorapi.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class QueryNotFoundException extends RuntimeException {

    public QueryNotFoundException(long queryId) {
        super(String.format("No query with query id: %s exists!", queryId));
    }
}
