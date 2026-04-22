package com.bing.researchsurveyextractorapi.pojo.searchresult;

import com.bing.researchsurveyextractorapi.models.Document;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class SearchResultRequest {
    private Document document;
    private int priority;
}
