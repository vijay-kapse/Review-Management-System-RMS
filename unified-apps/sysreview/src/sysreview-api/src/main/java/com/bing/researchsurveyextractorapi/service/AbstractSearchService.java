package com.bing.researchsurveyextractorapi.service;

import javax.annotation.PostConstruct;

public abstract class AbstractSearchService implements SearchService {
    @PostConstruct
    public void registerService() {
        SearchServiceRegistry.getInstance().addSearchService(this);
    }

}
