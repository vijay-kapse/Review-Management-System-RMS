package com.bing.researchsurveyextractorapi.pojo.keywords;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class KeywordConceptDto {
    // One idea a relevant paper must mention; its terms are alternatives (OR'd together).
    private String concept;
    private List<String> terms;
}
