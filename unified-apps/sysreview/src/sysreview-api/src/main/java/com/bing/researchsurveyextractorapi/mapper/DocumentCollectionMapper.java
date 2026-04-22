package com.bing.researchsurveyextractorapi.mapper;

import com.bing.researchsurveyextractorapi.models.DocumentCollection;
import com.bing.researchsurveyextractorapi.models.SearchResult;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionDto;
import com.bing.researchsurveyextractorapi.pojo.documentcollection.DocumentCollectionRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultDto;
import org.springframework.util.CollectionUtils;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

public class DocumentCollectionMapper {

    private DocumentCollectionMapper() {
        throw new IllegalStateException("Mapper class");
    }

    public static DocumentCollection toDocumentCollection(DocumentCollectionRequest request) {
        return DocumentCollection.builder()
                .collectionName(request.getCollectionName())
                .build();
    }

    public static DocumentCollectionDto toDto(DocumentCollection documentCollection) {
        return DocumentCollectionDto.builder()
                .collectionId(documentCollection.getCollectionId())
                .collectionName(documentCollection.getCollectionName())
                .searchResults(getSearchResults(documentCollection.getSearchResults()))
                .projectId(documentCollection.getProject().getProjectId())
                .build();
    }

    private static List<SearchResultDto> getSearchResults(Collection<SearchResult> searchResults) {
        return CollectionUtils.isEmpty(searchResults) ? Collections.emptyList() : SearchResultMapper.toDto(searchResults);
    }
}
