package com.bing.researchsurveyextractorapi.pojo.documentcollection;

import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DocumentCollectionRequest {
    private String collectionName;
    private long projectId;
}
