package com.bing.researchsurveyextractorapi.pojo.paperdetails;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AbstractSaveDto {
    private PaperDetailsDto details;
    // Rows in this project queued for the relevance worker to rate again with the new abstract.
    private int queued;
    // The worker only rates active projects with a research question; otherwise nothing is queued.
    private boolean scoringPaused;
}
