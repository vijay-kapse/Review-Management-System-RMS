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
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Service
public class IeeeSearchService extends AbstractSearchService {

    @Value("${api.ieee.key}")
    private String apiKey;

    @Value("${api.ieee.url}")
    private String apiIeeeUrl;

    @Value("${api.ieee.maxRecords}")
    private Integer maxRecords;

    @Override
    public DatasourceApi getServiceName() {
        return DatasourceApi.IEEE;
    }

    @SneakyThrows
    @Override
    public DocumentSet search(String queryText, YearMonth from, YearMonth to) {
        List<Document> documents = new ArrayList<>();
        int startRecord = 1;
        int totalRecords = 1;
        ObjectMapper objectMapper = new ObjectMapper();

        do {
            String jsonResponse = fetchFromApi(queryText, startRecord, from, to);
            JsonNode rootNode = objectMapper.readTree(jsonResponse);

            if (totalRecords == 1) {
                totalRecords = rootNode.get("total_records").asInt();
            }

            JsonNode articlesNode = rootNode.path("articles");

            for (JsonNode articleNode : articlesNode) {
                Document.DocumentBuilder documentBuilder = Document.builder();
                //Title
                extractTitle(documentBuilder, articleNode);
                //Article Date
                extractArticleDate(documentBuilder, articleNode);
                //Author Name
                JsonNode authorsNode = extractAuthorName(documentBuilder, articleNode);
                //Affilliation Country
                extractAffiliationCountry(documentBuilder, authorsNode);
                //Publication Name
                extractPublicationName(documentBuilder, articleNode);
                //issn
                extractIssn(documentBuilder, articleNode);
                //Affiliation Name
                extractAffiliationName(documentBuilder, authorsNode);
                //URL
                extractUrl(documentBuilder, articleNode);

                documents.add(documentBuilder.build());
            }
            startRecord += articlesNode.size();
        } while (startRecord < totalRecords && documents.size() < maxRecords);
        return DocumentSet.builder()
                .apiResultsCount(totalRecords)
                .documents(documents)
                .build();
    }

    @Override
    public String fetchFromApi(String queryText, int startRecord, YearMonth from, YearMonth to) {
        UriComponentsBuilder uriComponentsBuilder = UriComponentsBuilder.fromUri(URI.create(apiIeeeUrl))
                .queryParam("querytext", queryText)
                .queryParam("apikey", apiKey)
                .queryParam("max_records", maxRecords)
                .queryParam("start_record", startRecord);

        if (from != null && to != null) {
            LocalDate startDate = from.atDay(1);
            LocalDate endDate = to.atEndOfMonth();
            DateTimeFormatter dateFormat = DateTimeFormatter.BASIC_ISO_DATE;
            uriComponentsBuilder.queryParam("start_date", startDate.format(dateFormat));
            uriComponentsBuilder.queryParam("end_date", endDate.format(dateFormat));
        }

        URI apiUrl = uriComponentsBuilder.build().toUri();
        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject(apiUrl, String.class);
    }

    private static void extractUrl(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode urlNode = articleNode.path("html_url");
        if (urlNode != null && articleNode.has("html_url")) {
            documentBuilder.url(urlNode.asText());
        }
    }

    private static void extractAffiliationName(Document.DocumentBuilder documentBuilder, JsonNode authorsNode) {
        if (authorsNode != null) {
            Set<String> affiliationNames = new HashSet<>();
            for (JsonNode authorNode : authorsNode) {
                JsonNode affiliationNode = authorNode.path("affiliation");
                if (affiliationNode != null) {
                    affiliationNames.add(affiliationNode.asText());
                }
            }
            documentBuilder.affiliationNames(new ArrayList<>(affiliationNames));
        }
    }

    private static void extractIssn(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode issnNode = articleNode.get("issn");
        JsonNode isbnNode = articleNode.get("isbn");
        if (issnNode != null){
            documentBuilder.issn(issnNode.asText());
        } else if (isbnNode != null) {
            documentBuilder.issn(isbnNode.asText());
        }
    }

    private static void extractPublicationName(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode publicationNameNode = articleNode.get("publication_title");
        if (publicationNameNode != null){
            documentBuilder.publicationName(publicationNameNode.asText());
        }
    }

    private static void extractAffiliationCountry(Document.DocumentBuilder documentBuilder, JsonNode authorsNode) {
        if (authorsNode != null) {
            Set<String> affiliationCountryNode = StreamSupport.stream(authorsNode.spliterator(), false)
                    .map(node -> {
                        String affiliation = node.path("affiliation").asText();
                        int lastCommaIndex = affiliation.lastIndexOf(",");
                        return lastCommaIndex != -1 ? affiliation.substring(lastCommaIndex + 1).trim() : affiliation;
                    })
                    .collect(Collectors.toSet());
            documentBuilder.affiliationCountry(affiliationCountryNode);
        }
    }
    private static JsonNode extractAuthorName(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode authorsNode = articleNode.path("authors").path("authors");
        if (authorsNode != null) {
            List<String> authorNames = StreamSupport.stream(authorsNode.spliterator(), false)
                    .map(node -> node.path("full_name").asText())
                    .collect(Collectors.toList());
            documentBuilder.authorNames(authorNames);
        }
        return authorsNode;
    }

    private static void extractArticleDate(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode publicationDateNode = articleNode.get("publication_date");
        if (publicationDateNode != null){
            documentBuilder.articleDate(publicationDateNode.asText());
        }
    }

    private static void extractTitle(Document.DocumentBuilder documentBuilder, JsonNode articleNode) {
        JsonNode titleNode = articleNode.get("title");
        if (titleNode != null){
            documentBuilder.title(titleNode.asText());
        }
    }
}
// TODO: 3/31/23 implement the url attribute