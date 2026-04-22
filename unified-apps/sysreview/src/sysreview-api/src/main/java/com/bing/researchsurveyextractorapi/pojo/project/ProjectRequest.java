package com.bing.researchsurveyextractorapi.pojo.project;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ProjectRequest {

    @NonNull
    private String projectName;

    @NonNull
    private String description;

}
