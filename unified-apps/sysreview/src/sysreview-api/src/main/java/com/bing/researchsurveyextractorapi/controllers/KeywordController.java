package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.pojo.keywords.KeywordSuggestionDto;
import com.bing.researchsurveyextractorapi.pojo.keywords.KeywordSuggestionRequest;
import com.bing.researchsurveyextractorapi.service.KeywordSuggestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${API_V1_URI}/keywords")
@RequiredArgsConstructor
public class KeywordController {

    private final KeywordSuggestionService keywordSuggestionService;

    @PostMapping("/suggest")
    public KeywordSuggestionDto suggest(@RequestBody KeywordSuggestionRequest request) {
        return keywordSuggestionService.suggest(request.getQuestion());
    }
}
