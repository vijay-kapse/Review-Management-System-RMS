package com.bing.researchsurveyextractorapi.pojo.keywords;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KeywordSuggestionDto {
    private List<KeywordConceptDto> concepts;
    // The model that produced the suggestions, shown so users know where they came from.
    private String model;
}
