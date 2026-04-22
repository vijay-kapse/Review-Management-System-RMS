package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.DocumentCollectionNotFoundException;
import com.bing.researchsurveyextractorapi.mapper.DocumentCollectionMapper;
import com.bing.researchsurveyextractorapi.models.DocumentCollection;
import com.bing.researchsurveyextractorapi.models.SearchResult;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionRequest;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionUpdateRequest;
import com.bing.researchsurveyextractorapi.repository.DocumentCollectionRepository;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import com.bing.researchsurveyextractorapi.repository.SearchResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class DocumentCollectionServiceImpl implements DocumentCollectionService {

    private final DocumentCollectionRepository documentCollectionRepository;
    private final ProjectRepository projectRepository;
    private final SearchResultRepository searchResultRepository;

    @Override
    public DocumentCollection loadDocumentCollectionById(long collectionId) {
        return documentCollectionRepository.findById(collectionId).orElseThrow(() -> new DocumentCollectionNotFoundException(collectionId));
    }

    @Override
    public Collection<DocumentCollection> loadDocumentCollectionsByProjectId(long projectId) {
        return documentCollectionRepository.findByProjectProjectId(projectId);
    }

    @Override
    public DocumentCollection createDocumentCollection(DocumentCollectionRequest request) {
        DocumentCollection documentCollection = DocumentCollectionMapper.toDocumentCollection(request);
        documentCollection.setProject(projectRepository.getById(request.getProjectId()));
        return documentCollectionRepository.save(documentCollection);
    }

    @Override
    public void updateSearchResultsInDocumentCollection(long collectionId, Collection<Long> searchResultIds) {
        DocumentCollection documentCollection = documentCollectionRepository.findById(collectionId).orElseThrow(() -> new DocumentCollectionNotFoundException(collectionId));
        Set<SearchResult> searchResults = getSearchResultsByIds(searchResultIds);
        documentCollection.getSearchResults().addAll(searchResults);
        documentCollectionRepository.save(documentCollection);
    }

    private Set<SearchResult> getSearchResultsByIds(Collection<Long> searchResultIds) {
        return searchResultIds.stream()
                .map(searchResultRepository::getById)
                .collect(Collectors.toSet());
    }

    @Override
    public DocumentCollection updateDocumentCollection(long collectionId, DocumentCollectionUpdateRequest request) {
        DocumentCollection documentCollection = documentCollectionRepository.getById(collectionId);
        documentCollection.setCollectionName(request.getCollectionName());
        documentCollection.getSearchResults().clear();
        documentCollection.setSearchResults(getSearchResultsByIds(request.getSearchResultIds()));
        return documentCollectionRepository.save(documentCollection);
    }

    @Override
    public void deleteDocumentCollectionById(long collectionId) {
        documentCollectionRepository.deleteById(collectionId);
    }
}
