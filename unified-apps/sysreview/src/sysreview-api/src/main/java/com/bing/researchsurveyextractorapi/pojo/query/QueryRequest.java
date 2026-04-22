package com.bing.researchsurveyextractorapi.pojo.query;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultRequest;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.YearMonth;
import java.util.Collection;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class QueryRequest {
    @JsonProperty("query_name")
    private String queryName;
    private String searchText;
    private long projectId;
    @DateTimeFormat(pattern = "yyyy-MM")
    private YearMonth fromMonth;
    @DateTimeFormat(pattern = "yyyy-MM")
    private YearMonth toMonth;
    private Map<String, Collection<SearchResultRequest>> searchResults;
    private Map<DatasourceApi, Integer> datasourceApiFetchCount;
}
