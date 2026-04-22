package com.bing.researchsurveyextractorapi.mapper;

import com.bing.researchsurveyextractorapi.models.*;
import com.bing.researchsurveyextractorapi.pojo.query.QueryDto;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultDto;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


public class QueryMapper {

    private QueryMapper() {
        throw new IllegalStateException("Mapper class");
    }

    public static QueryDto toDto(Query query) {
        return QueryDto.builder()
                .queryId(query.getQueryId())
                .queryName(query.getQueryName())
                .searchText(query.getSearchText())
                .fromMonth(query.getFromMonth())
                .toMonth(query.getToMonth())
                .searchResults(groupSearchResultsByDatasource(query.getSearchResults()))
                .datasourceApiFetchCount(query.getDatasourceApiFetchCount())
                .build();
    }

    private static Map<DatasourceApi, List<SearchResultDto>> groupSearchResultsByDatasource(Collection<SearchResult> searchResults) {
        return SearchResultMapper.toDto(searchResults)
                .stream()
                .collect(Collectors.groupingBy(SearchResultDto::getDatasource));
    }

    public static Query toQuery(QueryRequest request, Project project, Collection<Category> categories) {
        Query query = Query.builder()
                .queryName(request.getQueryName())
                .searchText(request.getSearchText())
                .fromMonth(request.getFromMonth())
                .toMonth(request.getToMonth())
                .project(project)
                .searchResults(SearchResultMapper.toSearchResults(request.getSearchResults(), categories))
                .datasourceApiFetchCount(request.getDatasourceApiFetchCount())
                .build();
        query.getSearchResults().forEach(searchResult -> searchResult.setQuery(query));
        return query;
    }
}
