package com.bing.researchsurveyextractorapi.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class DocumentCollectionNotFoundException extends RuntimeException {
    public DocumentCollectionNotFoundException(long collectionId) {
        super(String.format("No collection with collection id: %s exists!", collectionId));
    }
}
