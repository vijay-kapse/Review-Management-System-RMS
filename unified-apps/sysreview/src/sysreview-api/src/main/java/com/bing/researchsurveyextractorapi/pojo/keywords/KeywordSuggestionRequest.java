package com.bing.researchsurveyextractorapi.pojo.keywords;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class KeywordSuggestionRequest {

    private String question;

}
