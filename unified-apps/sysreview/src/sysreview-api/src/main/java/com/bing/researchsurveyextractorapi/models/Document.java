package com.bing.researchsurveyextractorapi.models;

import lombok.*;

import java.io.Serializable;
import java.util.Collection;
import java.util.Set;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Document implements Serializable {

    private static final long serialVersionUID = -3760445487636086034L;
    private String title;
    private String articleDate;
    private Collection<String> authorNames;
    private Set<String> affiliationCountry;
    private String publicationName;
    private String issn;
    private Collection<String> affiliationNames;
    private String url;
}
