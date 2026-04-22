package com.bing.researchsurveyextractorapi.models;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum DatasourceApi {
    SCOPUS("SCOPUS", true, "https://www.scopus.com"),
    PUBMED("PUBMED", true, "https://pubmed.ncbi.nlm.nih.gov"),
    WOS("WOS", true, "https://webofscience.com"),
    IEEE("IEEE", true, "https://ieeexplore.ieee.org"),
    MANUAL("MANUAL", false, null);

    private final String name;
    private final boolean isApiBased;
    private final String url;
}
