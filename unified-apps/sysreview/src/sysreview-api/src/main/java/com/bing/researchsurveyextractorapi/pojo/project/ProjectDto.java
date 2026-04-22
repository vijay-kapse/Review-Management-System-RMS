package com.bing.researchsurveyextractorapi.pojo.project;

import lombok.*;

import java.util.Collection;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class ProjectDto {

    private long projectId;
    private String projectName;
    private String description;
    private String owner;
    private Collection<String> collaborators;

}
