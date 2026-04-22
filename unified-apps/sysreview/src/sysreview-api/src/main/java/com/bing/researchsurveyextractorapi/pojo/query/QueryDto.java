package com.bing.researchsurveyextractorapi.pojo.query;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultDto;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class QueryDto {
    private long queryId;
    @JsonProperty("query_name")
    private String queryName;
    private String searchText;
    private YearMonth fromMonth;
    private YearMonth toMonth;
    private Map<DatasourceApi, List<SearchResultDto>> searchResults;
    private Map<DatasourceApi, Integer> datasourceApiFetchCount;
}
