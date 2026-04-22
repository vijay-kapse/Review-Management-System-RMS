package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.DocumentSet;

import java.time.YearMonth;

public interface SearchService {

    DatasourceApi getServiceName();

    DocumentSet search(String queryText, YearMonth from, YearMonth to);

    String fetchFromApi(String queryText, int startRecord, YearMonth from, YearMonth to);
}
