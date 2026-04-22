package com.bing.researchsurveyextractorapi.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DocumentSet {
    private int apiResultsCount;
    private List<Document> documents;
}
