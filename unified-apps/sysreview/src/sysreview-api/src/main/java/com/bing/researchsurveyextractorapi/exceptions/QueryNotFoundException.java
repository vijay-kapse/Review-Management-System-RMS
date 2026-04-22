package com.bing.researchsurveyextractorapi.exceptions;

public class QueryNotFoundException extends RuntimeException {

    public QueryNotFoundException(long queryId) {
        super(String.format("No query with query id: %s exists!", queryId));
    }
}
