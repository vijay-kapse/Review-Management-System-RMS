package com.bing.researchsurveyextractorapi.pojo.documentcollection;

import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultDto;
import lombok.*;

import java.util.Collection;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class DocumentCollectionDto {
    private long collectionId;
    private String collectionName;
    private long projectId;
    private Collection<SearchResultDto> searchResults;
}
