package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.Document;
import com.bing.researchsurveyextractorapi.models.DocumentSet;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PubmedSearchService extends AbstractSearchService {

    @Value("${api.pubmed.search.url}")
    private String apiSearchUrl;

    @Value("${api.pubmed.search.db}")
    private String db;

    @Value("${api.pubmed.search.sort}")
    private String sort;

    @Value("${api.pubmed.search.rettype}")
    private String rettype;

    @Value("${api.pubmed.search.retmode}")
    private String retmode;

    @Value("${api.pubmed.search.retmax}")
    private Integer retmax;

    @Value("${api.pubmed.fetch.url}")
    private String apiFetchUrl;
    @Value("${api.pubmed.source.url}")
    private String url;

    @Override
    public DatasourceApi getServiceName() {
        return DatasourceApi.PUBMED;
    }

    @Override
    public DocumentSet search(String queryText, YearMonth from, YearMonth to) {

        String searchResponse = fetchFromApi(queryText, 0, from, to);
        ObjectMapper objectMapper = new ObjectMapper();

        List<String> ids = new ArrayList<>();
        try {
            JsonNode rootNode = objectMapper.readTree(searchResponse);
            JsonNode idListNode = rootNode.path("esearchresult").path("idlist");
            for (JsonNode idNode : idListNode) {
                ids.add(idNode.asText());
            }
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }

        List<Document> documents = new ArrayList<>();

        List<List<String>> idPartitions = createIdPartitions(ids);
        RestTemplate restTemplate = new RestTemplate();

        for (List<String> idPartition : idPartitions) {

            URI fetchUrl = UriComponentsBuilder.fromUri(URI.create(apiFetchUrl))
                    .queryParam("query", queryText)
                    .queryParam("db", db)
                    .queryParam("id", idPartition)
                    .queryParam("rettype", rettype)
                    .queryParam("retmode", retmode)
                    .build()
                    .toUri();


            String fetchResponse = restTemplate.getForObject(fetchUrl, String.class);
            ObjectMapper objectMapper1 = new ObjectMapper();

            Document.DocumentBuilder documentBuilder = Document.builder();


            try {

                JsonNode rootNode = objectMapper1.readTree(fetchResponse);
                JsonNode resultNode = rootNode.path("result");

                for (String id : idPartition) {
                    JsonNode idNode = resultNode.get(id);
                    //Title
                    JsonNode titleNode = idNode.get("title");
                    if (titleNode != null) {
                        documentBuilder.title(titleNode.asText());
                    }
                    //Article Date
                    JsonNode articleDateNode = idNode.get("epubdate");
                    JsonNode pubdateNode = idNode.get("pubdate");
                    if (articleDateNode != null && !articleDateNode.isEmpty()) {
                        documentBuilder.articleDate(articleDateNode.asText());
                    } else if (pubdateNode != null) {
                        documentBuilder.articleDate(pubdateNode.asText());
                    }
                    //Authors
                    JsonNode authorsNode = idNode.path("authors");
                    if (authorsNode.isArray()) {
                        List<String> authorNames = new ArrayList<>();
                        for (JsonNode authorNode : authorsNode) {
                            JsonNode nameNode = authorNode.path("name");
                            if (nameNode != null) {
                                String authorName = nameNode.asText();
                                authorNames.add(authorName);
                            }
                        }
                        documentBuilder.authorNames(authorNames);
                    }

                    //Affiliation Country
                    //Unavailable in api response

                    //Publication Name
                    JsonNode publicationNameNode = idNode.get("sorttitle");
                    if (publicationNameNode != null) {
                        documentBuilder.publicationName(publicationNameNode.asText());
                    }
                    //ISSN
                    JsonNode issnNode = idNode.get("issn");
                    if (issnNode != null) {
                        documentBuilder.issn(issnNode.asText());
                    }

                    //Affiliation Name
                    //Unavailable in api response

                    //URL
                    JsonNode uidNode = idNode.get("uid");
                    if (uidNode != null && idNode.has("uid")) {
                        String urlLink = url + uidNode.asText();
                        documentBuilder.url(urlLink);
                    }

                    documents.add(documentBuilder.build());

                }
            } catch (Exception e) {
                throw new RuntimeException(e.getMessage());
            }
        }
        return DocumentSet.builder()
                .apiResultsCount(ids.size())
                .documents(documents)
                .build();
    }

    @Override
    public String fetchFromApi(String queryText, int startRecord, YearMonth from, YearMonth to) {
        if (from != null && to != null) {
            queryText += String.format("AND+%1$s:%2$s[pdat]", from, to);
        }

        URI searchUrl = UriComponentsBuilder.fromUri(URI.create(apiSearchUrl))
                .queryParam("term", queryText)
                .queryParam("db", db)
                .queryParam("sort", sort)
                .queryParam("rettype", rettype)
                .queryParam("retmode", retmode)
                .queryParam("retmax", retmax)
                .build()
                .toUri();

        RestTemplate restTemplate = new RestTemplate();
        return restTemplate.getForObject(searchUrl, String.class);
    }

    private List<List<String>> createIdPartitions(List<String> ids) {
        int partitionSize = retmax / 10;
        List<List<String>> idPartitions = new ArrayList<>();
        int start = 0;
        int endCount = Math.min(ids.size(), partitionSize);
        while (start < ids.size()) {
            idPartitions.add(ids.subList(start, endCount));
            start = endCount;
            endCount += partitionSize;
            if (endCount > ids.size())
                endCount = ids.size();
        }
        return idPartitions.stream().limit(10).collect(Collectors.toList());
    }
}
