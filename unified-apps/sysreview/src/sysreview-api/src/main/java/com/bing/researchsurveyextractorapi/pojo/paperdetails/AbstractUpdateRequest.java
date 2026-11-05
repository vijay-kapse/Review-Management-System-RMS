package com.bing.researchsurveyextractorapi.pojo.paperdetails;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AbstractUpdateRequest {
    // The paper's title as shown; the server derives the same title key the worker uses.
    private String title;
    private String abstractText;
}
