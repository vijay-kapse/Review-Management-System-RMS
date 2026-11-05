package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.pojo.paperdetails.AbstractSaveDto;
import com.bing.researchsurveyextractorapi.pojo.paperdetails.PaperDetailsDto;

import java.util.List;

public interface PaperDetailsService {
    List<PaperDetailsDto> loadForProject(long projectId);

    AbstractSaveDto saveUserAbstract(long projectId, String title, String abstractText, boolean scoringActive);
}
