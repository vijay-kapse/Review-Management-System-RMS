package com.bing.researchsurveyextractorapi.exceptions;

public class DocumentCollectionNotFoundException extends RuntimeException {
    public DocumentCollectionNotFoundException(long collectionId) {
        super(String.format("No collection with collection id: %s exists!", collectionId));
    }
}
