package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.Document;
import com.bing.researchsurveyextractorapi.models.DocumentSet;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.YearMonth;
import java.util.*;

@Service
public class ScopusSearchService extends AbstractSearchService {

    private static final Set<String> ALLOWED_RESEARCH_SUBTYPES = new HashSet<>(Arrays.asList(
            "ar", // Article
            "cp", // Conference Paper
            "re", // Review
            "ip"  // Article in Press
    ));

    private static final Set<String> ALLOWED_RESEARCH_TYPE_DESCRIPTIONS = new HashSet<>(Arrays.asList(
            "article",
            "conference paper",
            "review",
            "article in press"
    ));

    private static final List<String> BOOK_LIKE_TERMS = Arrays.asList(
            "book",
            "book chapter",
            "chapter",
            "handbook",
            "encyclopedia",
            "monograph",
            "volume",
            "series"
    );

    @Value("${api.scopus.key}")
    private String apiKey;
    @Value("${api.scopus.url}")
    private String apiScopusUrl;

    @Value("${api.scopus.maxRecords}")
    private Integer maxRecords;

    @Override
    public DatasourceApi getServiceName() {
        return DatasourceApi.SCOPUS;
    }

    @SneakyThrows
    public DocumentSet search(String queryText, YearMonth from, YearMonth to) {
        List<Document> documents = new ArrayList<>();

        int startRecord = 0;
        int totalRecords = 1;
        ObjectMapper objectMapper = new ObjectMapper();

        do {
            String jsonResponse = fetchFromApi(queryText, startRecord, from, to);

            JsonNode rootNode = objectMapper.readTree(jsonResponse);
            JsonNode articlesNode = rootNode.get("search-results");

            if (totalRecords == 1) {
                totalRecords = articlesNode.get("opensearch:totalResults").asInt();
            }

            JsonNode entries = articlesNode.get("entry");
            for (JsonNode entry : entries) {
                if (!isResearchPaper(entry)) {
                    continue;
                }

                Document.DocumentBuilder documentBuilder = Document.builder();
                //Title
                JsonNode titleNode = entry.get("dc:title");
                if (titleNode != null)
                    documentBuilder.title(titleNode.asText());

                //Article Date
                JsonNode articleDateNode = entry.get("prism:coverDate");
                if (articleDateNode != null) {
                    documentBuilder.articleDate(articleDateNode.asText());
                }

                //authorName
                JsonNode authorNameNode = entry.get("dc:creator");
                if (authorNameNode != null) {
                    List<String> authorNames = Collections.singletonList(authorNameNode.asText());
                    documentBuilder.authorNames(authorNames);
                }

                //affiliationCountry
                JsonNode affiliationNode = entry.path("affiliation");
                if (affiliationNode.isArray()) {
                    Set<String> affiliationCountries = new HashSet<>();
                    for (JsonNode affiliation : affiliationNode) {
                        JsonNode countryNode = affiliation.path("affiliation-country");
                        if (countryNode != null && !countryNode.asText().isEmpty()) {
                            affiliationCountries.add(countryNode.asText());
                        }
                    }
                    documentBuilder.affiliationCountry(affiliationCountries);
                }

                //publicationName
                JsonNode pubNameNode = entry.get("prism:publicationName");
                if (pubNameNode != null) {
                    documentBuilder.publicationName(pubNameNode.asText());
                }

                //issn
                String prismeIssn = "prism:eIssn";
                String prismIssn = "prism:issn";
                if (entry.has(prismeIssn) && entry.get(prismeIssn).isTextual()) {
                    documentBuilder.issn(entry.get(prismeIssn).asText());
                } else if (entry.has(prismIssn) && entry.get(prismIssn).isTextual()) {
                    documentBuilder.issn(entry.get(prismIssn).asText());
                }

                //affiliationName
                if (affiliationNode.isArray()) {
                    Set<String> affiliationNames = new HashSet<>();
                    for (JsonNode affiliation : affiliationNode) {
                        JsonNode affNameNode = affiliation.path("affilname");
                        if (affNameNode != null && !affNameNode.asText().isEmpty()) {
                            affiliationNames.add(affNameNode.asText());
                        }
                    }
                    documentBuilder.affiliationNames(new ArrayList<>(affiliationNames));
                }

                //url
                JsonNode prismUrl = entry.get("prism:url");
                if (entry.has("prism:url") && prismUrl != null) {
                    documentBuilder.url(prismUrl.asText());
                }

                documents.add(documentBuilder.build());
            }

            startRecord += entries.size();
        } while (startRecord < totalRecords && documents.size() < maxRecords);

        return DocumentSet.builder()
                .apiResultsCount(totalRecords)
                .documents(documents)
                .build();
    }

    @Override
    public String fetchFromApi(String queryText, int startRecord, YearMonth from, YearMonth to) {
        String researchPaperQuery = String.format("(%s) AND (DOCTYPE(ar) OR DOCTYPE(cp) OR DOCTYPE(re) OR DOCTYPE(ip))", queryText);
        UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder.fromUri(URI.create(apiScopusUrl))
                .queryParam("query", researchPaperQuery)
                .queryParam("start", startRecord)
                .queryParam("field", String.join(",",
                        "dc:title",
                        "prism:coverDate",
                        "dc:creator",
                        "affiliation",
                        "prism:publicationName",
                        "prism:eIssn",
                        "prism:issn",
                        "prism:url",
                        "subtype",
                        "subtypeDescription",
                        "prism:aggregationType"))
                .queryParam("apikey", apiKey);
        if (from != null && to != null) {
            uriComponentsBuilder.queryParam("date", String.format("%1$s-%2$s", from.getYear(), to.getYear()));
        }

        URI apiUrl = uriComponentsBuilder.build().toUri();
        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject(apiUrl, String.class);
    }

    private boolean isResearchPaper(JsonNode entry) {
        String subtype = lowerText(entry, "subtype");
        if (!subtype.isEmpty()) {
            return ALLOWED_RESEARCH_SUBTYPES.contains(subtype);
        }

        String subtypeDescription = lowerText(entry, "subtypeDescription");
        if (!subtypeDescription.isEmpty()) {
            return ALLOWED_RESEARCH_TYPE_DESCRIPTIONS.contains(subtypeDescription);
        }

        String aggregationType = lowerText(entry, "prism:aggregationType");
        String title = lowerText(entry, "dc:title");
        String publicationName = lowerText(entry, "prism:publicationName");
        String combined = String.join(" ", aggregationType, title, publicationName);

        if (containsBookLikeTerm(combined)) {
            return false;
        }

        return aggregationType.isEmpty()
                || "journal".equals(aggregationType)
                || "conference proceeding".equals(aggregationType)
                || "conference proceedings".equals(aggregationType);
    }

    private String lowerText(JsonNode entry, String fieldName) {
        JsonNode node = entry.get(fieldName);
        return node != null && node.isTextual() ? node.asText().trim().toLowerCase(Locale.ROOT) : "";
    }

    private boolean containsBookLikeTerm(String text) {
        for (String term : BOOK_LIKE_TERMS) {
            if (text.contains(term)) {
                return true;
            }
        }
        return false;
    }
}
