package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.Query;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultUpdateRequest;

import java.util.List;

public interface QueryService {

    List<Query> loadQueriesByProjectId(long projectId);

    Query loadQuery(long queryId);

    Query createQuery(QueryRequest request);

    void patchSearchResults(long queryId, List<SearchResultUpdateRequest> resultUpdateRequests);

    void deleteQuery(long queryId);

}
