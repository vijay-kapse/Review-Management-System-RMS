package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.DocumentSet;
import com.bing.researchsurveyextractorapi.pojo.searchresult.DatasourceApiDto;
import com.bing.researchsurveyextractorapi.service.SearchServiceRegistry;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("${API_V1_URI}/search")
public class SearchController {

    @GetMapping("/{datasource}")
    public DocumentSet search(
            @RequestParam String queryText,
            @PathVariable DatasourceApi datasource,
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
            ) {
        if (!datasource.isApiBased()) {
            throw new RuntimeException("Exception Handled");
        }
        return SearchServiceRegistry.getInstance().getSearchService(datasource).search(queryText, from, to);
    }

    @GetMapping("/datasources")
    public List<DatasourceApiDto> fetchDataSources() {
        return Arrays.stream(DatasourceApi.values())
                .map(DatasourceApiDto::new)
                .collect(Collectors.toList());
    }
}
