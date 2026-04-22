package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.mapper.QueryMapper;
import com.bing.researchsurveyextractorapi.models.Query;
import com.bing.researchsurveyextractorapi.pojo.query.QueryDto;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultUpdateRequest;
import com.bing.researchsurveyextractorapi.service.QueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("${API_V1_URI}/queries")
@RequiredArgsConstructor
public class QueryController {

    private final QueryService queryService;

    @GetMapping("/project/{projectId}")
    public List<QueryDto> getQueries(@PathVariable long projectId) {
        return queryService.loadQueriesByProjectId(projectId)
                .stream()
                .map(QueryMapper::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{queryId}")
    public QueryDto getQuery(@PathVariable long queryId) {
        return QueryMapper.toDto(queryService.loadQuery(queryId));
    }

    @PostMapping("")
    public QueryDto saveQuery(@RequestBody QueryRequest request) {
        Query savedQuery = queryService.createQuery(request);
        return QueryMapper.toDto(savedQuery);
    }


    @PatchMapping("/results/{queryId}")
    public void patchResults(@PathVariable long queryId, @RequestBody List<SearchResultUpdateRequest> resultUpdateRequests) {
        queryService.patchSearchResults(queryId, resultUpdateRequests);
    }

    @DeleteMapping("/{queryId}")
    public void deleteQuery(@PathVariable long queryId) {
        queryService.deleteQuery(queryId);
    }
}
