package com.bing.researchsurveyextractorapi.mapper;

import com.bing.researchsurveyextractorapi.exceptions.CategoryDoesNotExistException;
import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.SearchResult;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultDto;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultRequest;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class SearchResultMapper {

    private SearchResultMapper() {
        throw new IllegalStateException("Mapper class");
    }

    public static List<SearchResultDto> toDto(Collection<SearchResult> searchResults) {
        return searchResults
                .stream()
                .map(SearchResultMapper::toDto)
                .collect(Collectors.toList());
    }

    private static SearchResultDto toDto(SearchResult searchResult) {
        return SearchResultDto.builder()
                .resultId(searchResult.getResultId())
                .priority(searchResult.getCategory().getPriority())
                .document(searchResult.getDocument())
                .datasource(searchResult.getDatasource())
                .build();
    }

    public static Collection<SearchResult> toSearchResults(Map<String, Collection<SearchResultRequest>> requests, Collection<Category> categories) {
        Collection<SearchResult> searchResults = new ArrayList<>();
        for (Map.Entry<String, Collection<SearchResultRequest>> entry : requests.entrySet()) {
            DatasourceApi datasource = DatasourceApi.valueOf(entry.getKey());
            searchResults.addAll(
                    entry.getValue()
                            .stream()
                            .map(result -> SearchResultMapper.toSearchResult(result, categories, datasource))
                            .collect(Collectors.toList()));
        }
        return searchResults;
    }

    private static SearchResult toSearchResult(SearchResultRequest request, Collection<Category> categories, DatasourceApi datasource) {
        return SearchResult.builder()
                .document(request.getDocument())
                .datasource(datasource)
                .category(
                        categories.stream()
                                .filter(category -> category.getPriority() == request.getPriority())
                                .findAny()
                                .orElseThrow(() -> new CategoryDoesNotExistException(request.getPriority()))
                )
                .build();
    }
}
