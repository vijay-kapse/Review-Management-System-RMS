package com.bing.researchsurveyextractorapi.pojo.category;


import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class CategoryUpdateRequest {
    private int priority;
    private String label;
    private String color;
}

