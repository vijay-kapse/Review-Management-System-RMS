package com.bing.researchsurveyextractorapi.pojo.searchresult;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import lombok.Data;
import lombok.ToString;

@Data
@ToString
public class DatasourceApiDto {
    private final String name;
    private final boolean isApiBased;
    private final String url;

    public DatasourceApiDto(DatasourceApi datasourceApi) {
        this.name = datasourceApi.getName();
        this.isApiBased = datasourceApi.isApiBased();
        this.url = datasourceApi.getUrl();
    }
}
