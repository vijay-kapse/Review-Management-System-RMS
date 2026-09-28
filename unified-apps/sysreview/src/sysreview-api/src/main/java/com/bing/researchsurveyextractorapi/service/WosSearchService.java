package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.Document;
import com.bing.researchsurveyextractorapi.models.DocumentSet;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * Web of Science Starter API (https://developer.clarivate.com/apis/wos-starter).
 * Replaces the retired WoS API Lite, which now answers 503 for every keyed request.
 */
@Slf4j
@Service
public class WosSearchService extends AbstractSearchService {

    private static final int MAX_RETRIES = 3;
    private static final List<String> MONTHS = Arrays.asList(
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC");

    @Value("${api.wos.key}")
    private String xApiKey;

    @Value("${api.wos.url}")
    private String apiWosUrl;

    @Value("${api.wos.databaseId}")
    private String dataBaseId;

    // Starter caps page size at 50
    @Value("${api.wos.count}")
    private Integer count;

    @Value("${api.wos.maxRecords}")
    private Integer maxRecords;

    // Free/trial plans allow 1 request per second; institutional plans allow more
    @Value("${api.wos.requestIntervalMs:1100}")
    private Long requestIntervalMs;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public DatasourceApi getServiceName() {
        return DatasourceApi.WOS;
    }

    @SneakyThrows
    @Override
    public DocumentSet search(String queryText, YearMonth from, YearMonth to) {

        List<Document> documents = new ArrayList<>();
        int resultsFound = 0;
        int page = 1;
        int fetched = 0;

        do {
            if (page > 1) {
                Thread.sleep(requestIntervalMs);
            }
            JsonNode root = objectMapper.readTree(fetchFromApi(queryText, page, from, to));
            JsonNode hits = root.path("hits");

            if (page == 1) {
                resultsFound = root.path("metadata").path("total").asInt(0);
            }
            if (!hits.isArray() || hits.size() == 0) {
                break;
            }

            for (JsonNode hit : hits) {
                if (!withinMonthRange(hit.path("source"), from, to)) {
                    continue;
                }
                documents.add(toDocument(hit));
            }
            fetched += hits.size();
            page++;
        } while (fetched < resultsFound && fetched < maxRecords);

        return DocumentSet.builder()
                .apiResultsCount(resultsFound)
                .documents(documents)
                .build();
    }

    /**
     * @param startRecord the 1-based page number (Starter pages by number, not record offset)
     */
    @Override
    public String fetchFromApi(String query, int startRecord, YearMonth from, YearMonth to) {
        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
        headers.set("X-ApiKey", xApiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        // Starter has no publish-date parameter; the year range goes in the query itself
        String usrQuery = String.format("TS=(%s)", query);
        if (from != null && to != null) {
            usrQuery = String.format("%s AND PY=%d-%d", usrQuery, from.getYear(), to.getYear());
        }

        URI apiUrl = UriComponentsBuilder.fromUri(URI.create(apiWosUrl))
                .queryParam("db", dataBaseId)
                .queryParam("q", usrQuery)
                .queryParam("limit", Math.min(count, 50))
                .queryParam("page", startRecord)
                .encode()
                .build()
                .toUri();

        for (int attempt = 1; ; attempt++) {
            try {
                return restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class).getBody();
            } catch (HttpStatusCodeException e) {
                HttpStatus status = e.getStatusCode();
                boolean retryable = status == HttpStatus.TOO_MANY_REQUESTS || status.is5xxServerError();
                if (retryable && attempt < MAX_RETRIES) {
                    log.warn("WoS Starter returned {} on page {}, retrying (attempt {})", status, startRecord, attempt);
                    sleepQuietly(requestIntervalMs * attempt * 2);
                    continue;
                }
                log.error("WoS Starter request failed: {} {}", status, e.getResponseBodyAsString());
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, describeFailure(status), e);
            }
        }
    }

    private Document toDocument(JsonNode hit) {
        Document.DocumentBuilder documentBuilder = Document.builder();
        JsonNode source = hit.path("source");

        //Title
        if (hit.hasNonNull("title")) {
            documentBuilder.title(hit.get("title").asText());
        }
        //Article Date, e.g. "MAR,2021" or "2021" (same shape the Lite integration stored)
        String month = textOrNull(source, "publishMonth");
        String year = textOrNull(source, "publishYear");
        if (month != null && year != null) {
            documentBuilder.articleDate(String.join(",", month, year));
        } else if (year != null) {
            documentBuilder.articleDate(year);
        }
        //Author Name
        List<String> authorNames = new ArrayList<>();
        for (JsonNode author : hit.path("names").path("authors")) {
            String name = textOrNull(author, "displayName");
            if (name == null) {
                name = textOrNull(author, "wosStandard");
            }
            if (name != null) {
                authorNames.add(name);
            }
        }
        documentBuilder.authorNames(authorNames);
        //Affiliation Country / Affiliation Name
        // Not returned by the Starter API

        //Publication Name
        String sourceTitle = textOrNull(source, "sourceTitle");
        if (sourceTitle != null) {
            documentBuilder.publicationName(sourceTitle);
        }
        //Issn
        JsonNode identifiers = hit.path("identifiers");
        String issn = textOrNull(identifiers, "eissn");
        if (issn == null) {
            issn = textOrNull(identifiers, "issn");
        }
        if (issn != null) {
            documentBuilder.issn(issn);
        }
        //URL
        String record = textOrNull(hit.path("links"), "record");
        if (record != null) {
            documentBuilder.url(record);
        }
        return documentBuilder.build();
    }

    /**
     * PY only filters by year, so trim records outside the requested months.
     * Records with no parseable month are kept rather than guessed away.
     */
    private boolean withinMonthRange(JsonNode source, YearMonth from, YearMonth to) {
        if (from == null || to == null) {
            return true;
        }
        String year = textOrNull(source, "publishYear");
        String month = textOrNull(source, "publishMonth");
        if (year == null || month == null || month.length() < 3) {
            return true;
        }
        int monthIndex = MONTHS.indexOf(month.substring(0, 3).toUpperCase(Locale.ROOT));
        if (monthIndex < 0) {
            return true;
        }
        try {
            YearMonth published = YearMonth.of(Integer.parseInt(year), monthIndex + 1);
            return !published.isBefore(from) && !published.isAfter(to);
        } catch (NumberFormatException e) {
            return true;
        }
    }

    private static String textOrNull(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || value.asText().trim().isEmpty()) {
            return null;
        }
        return value.asText();
    }

    private static String describeFailure(HttpStatus status) {
        switch (status) {
            case UNAUTHORIZED:
                return "Web of Science API key is missing or invalid";
            case FORBIDDEN:
                return "Web of Science API key is not subscribed to the Starter API";
            case TOO_MANY_REQUESTS:
                return "Web of Science API rate limit reached, try again shortly";
            default:
                return "Web of Science API request failed (" + status.value() + ")";
        }
    }

    private static void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
