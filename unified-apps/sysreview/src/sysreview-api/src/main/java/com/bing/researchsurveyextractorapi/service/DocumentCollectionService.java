package com.bing.researchsurveyextractorapi.service;


import com.bing.researchsurveyextractorapi.models.DocumentCollection;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionRequest;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionUpdateRequest;

import java.util.Collection;

public interface DocumentCollectionService {
    DocumentCollection loadDocumentCollectionById(long collectionId);

    Collection<DocumentCollection> loadDocumentCollectionsByProjectId(long projectId);

    DocumentCollection createDocumentCollection(DocumentCollectionRequest documentCollection);

    void updateSearchResultsInDocumentCollection(long collectionId, Collection<Long> searchResults);

    DocumentCollection updateDocumentCollection(long collectionId, DocumentCollectionUpdateRequest collectionName);

    void deleteDocumentCollectionById(long collectionId);
}
