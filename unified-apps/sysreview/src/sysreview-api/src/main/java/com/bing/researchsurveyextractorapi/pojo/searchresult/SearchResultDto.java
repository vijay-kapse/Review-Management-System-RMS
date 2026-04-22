package com.bing.researchsurveyextractorapi.pojo.searchresult;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.Document;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class SearchResultDto {
    private long resultId;
    private Document document;
    private int priority;
    private DatasourceApi datasource;
}