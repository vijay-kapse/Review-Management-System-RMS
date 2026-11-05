package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.pojo.paperdetails.AbstractSaveDto;
import com.bing.researchsurveyextractorapi.pojo.paperdetails.PaperDetailsDto;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Abstracts and keywords are cached by the relevance worker (relevance_abstracts), keyed by the
 * normalized title that the curation table also groups on. Reviewers can add an abstract the
 * worker could not find (source 'user'); the worker never overwrites a cached abstract.
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

    private static final String TITLE_KEY_OF_PARAM =
            "lower(regexp_replace(regexp_replace(btrim(:title), '[.\\s]+$', ''), '\\s+', ' ', 'g'))";

    private static final String ROW_TITLE_KEY =
            "lower(regexp_replace(regexp_replace(btrim(sr.document->>'title'), '[.\\s]+$', ''), '\\s+', ' ', 'g'))";

    private static final int MIN_ABSTRACT = 40;
    private static final int MAX_ABSTRACT = 20000;

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

    /*
     * Stores a reviewer's abstract for a paper none of the lookups found, then clears the stored
     * rating hash on every row with that title so the worker rates it again from title + abstract.
     * In this project the old (title-only) rating is cleared too, so the page shows it as pending;
     * other projects keep theirs on screen until the worker reaches them.
     */
    @Override
    @Transactional
    public AbstractSaveDto saveUserAbstract(long projectId, String title, String abstractText, boolean scoringActive) {
        String text = abstractText == null ? "" : abstractText.trim().replaceAll("\\s+", " ");
        if (title == null || title.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The paper has no title");
        }
        if (text.length() < MIN_ABSTRACT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The abstract is too short");
        }
        if (text.length() > MAX_ABSTRACT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The abstract is longer than " + MAX_ABSTRACT + " characters");
        }
        Number inProject = (Number) entityManager.createNativeQuery(
                        "SELECT count(*) FROM search_results sr JOIN queries q ON q.query_id = sr.query_id "
                                + "WHERE q.project_id = :projectId AND " + ROW_TITLE_KEY + " = " + TITLE_KEY_OF_PARAM)
                .setParameter("projectId", projectId)
                .setParameter("title", title)
                .getSingleResult();
        if (inProject.intValue() == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No paper with this title in the project");
        }
        // Only fill a missing abstract or replace one a reviewer added; never overwrite a fetched one.
        int stored = entityManager.createNativeQuery(
                        "INSERT INTO relevance_abstracts (title_key, abstract, source, fetched_at) "
                                + "VALUES (" + TITLE_KEY_OF_PARAM + ", :abstract, 'user', now()) "
                                + "ON CONFLICT (title_key) DO UPDATE SET abstract = EXCLUDED.abstract, source = 'user', fetched_at = now() "
                                + "WHERE relevance_abstracts.abstract IS NULL OR relevance_abstracts.source = 'user'")
                .setParameter("title", title)
                .setParameter("abstract", text)
                .executeUpdate();
        if (stored == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This paper already has an abstract from a source");
        }
        entityManager.createNativeQuery(
                        "UPDATE search_results sr SET relevance_rq_hash = NULL "
                                + "WHERE " + ROW_TITLE_KEY + " = " + TITLE_KEY_OF_PARAM
                                + " AND sr.query_id NOT IN (SELECT q.query_id FROM queries q WHERE q.project_id = :projectId)")
                .setParameter("title", title)
                .setParameter("projectId", projectId)
                .executeUpdate();
        int queued = entityManager.createNativeQuery(
                        "UPDATE search_results sr SET relevance_rq_hash = NULL"
                                + (scoringActive ? ", relevance_score = NULL, relevance_logit = NULL, relevance_scored_at = NULL " : " ")
                                + "FROM queries q WHERE q.query_id = sr.query_id AND q.project_id = :projectId "
                                + "AND " + ROW_TITLE_KEY + " = " + TITLE_KEY_OF_PARAM)
                .setParameter("title", title)
                .setParameter("projectId", projectId)
                .executeUpdate();
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(
                        "SELECT title_key, keywords FROM relevance_abstracts WHERE title_key = " + TITLE_KEY_OF_PARAM)
                .setParameter("title", title)
                .getResultList();
        Object[] row = rows.get(0);
        return AbstractSaveDto.builder()
                .details(PaperDetailsDto.builder()
                        .titleKey((String) row[0])
                        .abstractText(text)
                        .keywords(parseKeywords((String) row[1]))
                        .abstractSource("user")
                        .build())
                .queued(scoringActive ? queued : 0)
                .scoringPaused(!scoringActive)
                .build();
    }
}
