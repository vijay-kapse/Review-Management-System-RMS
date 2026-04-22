package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.mapper.DocumentCollectionMapper;
import com.bing.researchsurveyextractorapi.models.DocumentCollection;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionDto;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionRequest;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionUpdateRequest;
import com.bing.researchsurveyextractorapi.service.DocumentCollectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Collection;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("${API_V1_URI}/collections")
public class DocumentCollectionController {

    private final DocumentCollectionService documentCollectionService;

    @GetMapping("/{collectionId}")
    public DocumentCollectionDto getCollection(@PathVariable long collectionId) {
        DocumentCollection documentCollection = documentCollectionService.loadDocumentCollectionById(collectionId);
        return DocumentCollectionMapper.toDto(documentCollection);
    }

    @GetMapping("/project/{projectId}")
    public Collection<DocumentCollectionDto> getCollectionsForProject(@PathVariable long projectId) {
        Collection<DocumentCollection> documentCollections = documentCollectionService.loadDocumentCollectionsByProjectId(projectId);
        return documentCollections.stream()
                .map(DocumentCollectionMapper::toDto)
                .collect(Collectors.toList());
    }

    @PostMapping("")
    public DocumentCollectionDto createDocumentCollection(@RequestBody DocumentCollectionRequest request) {
        return DocumentCollectionMapper.toDto(documentCollectionService.createDocumentCollection(request));
    }

    @PatchMapping("/{collectionId}")
    public void patchSearchResults(@PathVariable long collectionId, @RequestBody Collection<Long> searchResultIds) {
        documentCollectionService.updateSearchResultsInDocumentCollection(collectionId, searchResultIds);
    }

    @PutMapping("/{collectionId}")
    public DocumentCollectionDto updateDocumentCollection(@PathVariable long collectionId, @RequestBody DocumentCollectionUpdateRequest request) {
        return DocumentCollectionMapper.toDto(documentCollectionService.updateDocumentCollection(collectionId, request));
    }

    @DeleteMapping("/{collectionId}")
    public void deleteDocumentCollectionById(@PathVariable long collectionId) {
        documentCollectionService.deleteDocumentCollectionById(collectionId);
    }
}
