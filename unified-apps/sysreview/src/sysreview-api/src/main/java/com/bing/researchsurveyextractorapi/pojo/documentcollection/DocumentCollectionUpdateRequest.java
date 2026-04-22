package com.bing.researchsurveyextractorapi.pojo.documentcollection;

import lombok.*;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DocumentCollectionUpdateRequest {
    private String collectionName;
    private List<Long> searchResultIds;
}
