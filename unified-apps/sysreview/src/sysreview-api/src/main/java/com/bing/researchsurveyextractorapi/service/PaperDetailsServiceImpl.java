package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.pojo.paperdetails.PaperDetailsDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Abstracts and keywords are cached by the relevance worker (relevance_abstracts), keyed by the
 * normalized title that the curation table also groups on. This only reads that cache.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaperDetailsServiceImpl implements PaperDetailsService {

    // Mirrors normalize_title in unified-apps/relevance/worker.py and normalizeResultTitle in the UI.
    private static final String PROJECT_TITLE_KEYS =
            "SELECT DISTINCT lower(regexp_replace(regexp_replace(btrim(sr.document->>'title'), '[.\\s]+$', ''), '\\s+', ' ', 'g')) "
                    + "FROM search_results sr JOIN queries q ON q.query_id = sr.query_id "
                    + "WHERE q.project_id = :projectId AND coalesce(sr.document->>'title', '') <> ''";

    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<List<String>>() {
    };

    private final ObjectMapper objectMapper;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @SuppressWarnings("unchecked")
    public List<PaperDetailsDto> loadForProject(long projectId) {
        List<Object[]> rows;
        try {
            rows = entityManager.createNativeQuery(
                            "SELECT ra.title_key, ra.abstract, ra.keywords, ra.source FROM relevance_abstracts ra "
                                    + "WHERE ra.title_key IN (" + PROJECT_TITLE_KEYS + ")")
                    .setParameter("projectId", projectId)
                    .getResultList();
        } catch (RuntimeException e) {
            // The cache table is created by the worker; before its first run there is nothing to show.
            log.warn("Could not read relevance_abstracts for project {}: {}", projectId, e.getMessage());
            return Collections.emptyList();
        }
        List<PaperDetailsDto> details = new ArrayList<>();
        for (Object[] row : rows) {
            details.add(PaperDetailsDto.builder()
                    .titleKey((String) row[0])
                    .abstractText((String) row[1])
                    .keywords(parseKeywords((String) row[2]))
                    .abstractSource((String) row[3])
                    .build());
        }
        return details;
    }

    private List<String> parseKeywords(String json) {
        if (json == null || json.isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, STRING_LIST);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
