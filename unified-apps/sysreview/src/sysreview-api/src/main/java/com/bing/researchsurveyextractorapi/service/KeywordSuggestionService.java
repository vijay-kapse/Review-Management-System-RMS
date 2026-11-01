package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.pojo.keywords.KeywordSuggestionDto;

public interface KeywordSuggestionService {
    KeywordSuggestionDto suggest(String question);
}
