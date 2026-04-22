package com.bing.researchsurveyextractorapi.pojo.category;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class CategoryDto {
    private long categoryId;
    private int priority;
    private String label;
    private String color;

}
