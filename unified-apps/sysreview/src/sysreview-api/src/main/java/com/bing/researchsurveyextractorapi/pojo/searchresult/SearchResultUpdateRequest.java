package com.bing.researchsurveyextractorapi.pojo.searchresult;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class SearchResultUpdateRequest {
    private long resultId;
    private String data;
    private int priority;
}