package com.bing.researchsurveyextractorapi.pojo.paperdetails;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaperDetailsDto {
    // Same normalized title the curation table groups on, so the UI can look rows up by it.
    private String titleKey;
    private String abstractText;
    private List<String> keywords;
    // openalex / crossref, or null when no abstract could be found (scored from the title only).
    private String abstractSource;
}
