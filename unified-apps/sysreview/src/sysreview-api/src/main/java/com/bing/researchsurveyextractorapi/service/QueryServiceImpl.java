package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.CategoryDoesNotExistException;
import com.bing.researchsurveyextractorapi.exceptions.QueryNotFoundException;
import com.bing.researchsurveyextractorapi.mapper.QueryMapper;
import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.DatasourceApi;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.models.Query;
import com.bing.researchsurveyextractorapi.models.SearchResult;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRefetchDto;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultUpdateRequest;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import com.bing.researchsurveyextractorapi.repository.QueryRepository;
import com.bing.researchsurveyextractorapi.repository.SearchResultRepository;
import com.bing.researchsurveyextractorapi.util.TitleKey;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QueryServiceImpl implements QueryService {

    private final QueryRepository queryRepository;
    private final ProjectRepository projectRepository;
    private final SearchResultRepository searchResultRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public List<Query> loadQueriesByProjectId(long projectId) {
        return queryRepository.findByProjectProjectId(projectId);
    }

    @Override
    public Query loadQuery(long queryId) {
        return queryRepository.findById(queryId).orElseThrow(() -> new QueryNotFoundException(queryId));
    }

    @Override
    public Query createQuery(QueryRequest request) {
        Project project = projectRepository.getById(request.getProjectId());
        Collection<Category> categories = project.getCategories();
        Query query = QueryMapper.toQuery(request, project, categories);
        return queryRepository.save(query);
    }

    @Override
    @Transactional
    public void deleteQuery(long queryId) {
        // Papers in a document collection are referenced by result_collections; drop those links
        // first or the delete fails on the foreign key.
        entityManager.createNativeQuery(
                        "DELETE FROM result_collections WHERE result_id IN (SELECT result_id FROM search_results WHERE query_id = :queryId)")
                .setParameter("queryId", queryId)
                .executeUpdate();
        queryRepository.deleteById(queryId);
    }

    @Override
    public void patchSearchResults(long queryId, List<SearchResultUpdateRequest> resultUpdateRequests) {
        Query query = queryRepository.findById(queryId).orElseThrow(() -> new QueryNotFoundException(queryId));
        Map<Integer, Category> categories = query.getProject()
                .getCategories()
                .stream()
                .collect(Collectors.toMap(
                        Category::getPriority,
                        Function.identity(),
                        (existing, duplicate) -> existing
                ));
        resultUpdateRequests.forEach(request -> searchResultRepository.updateCategoryByResultId(categories.get(request.getPriority()), request.getResultId()));
    }

    /*
     * Re-running a saved query. The UI has already run the edited search against each API source
     * (as it does for a new query) and sends the deduplicated papers. Here the query's API-source
     * papers become exactly those, matched by normalized title:
     * - a paper found again under a source it already had keeps its row (result id, category,
     *   collections, model rating); only its metadata is refreshed;
     * - a new paper gets the category it already has elsewhere in this query or project, else the
     *   default the UI sent, and copies an existing model rating for the same title so the worker
     *   does not rescore it;
     * - papers no longer returned are removed. MANUAL uploads are never touched.
     */
    @Override
    @Transactional
    public QueryRefetchDto refetchQuery(long queryId, QueryRequest request) {
        Query query = loadQuery(queryId);
        String searchText = request.getSearchText() == null ? "" : request.getSearchText().trim();
        if (searchText.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The query is empty");
        }
        if (searchText.length() > 3000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The query is longer than 3000 characters");
        }
        Map<String, Collection<SearchResultRequest>> incoming =
                request.getSearchResults() == null ? Collections.<String, Collection<SearchResultRequest>>emptyMap() : request.getSearchResults();

        Map<Integer, Category> categoriesByPriority = new HashMap<>();
        for (Category category : query.getProject().getCategories()) {
            if (!categoriesByPriority.containsKey(category.getPriority())) {
                categoriesByPriority.put(category.getPriority(), category);
            }
        }

        // Incoming papers by title key, first source first (the UI already dropped cross-source duplicates).
        Map<String, Map<DatasourceApi, SearchResultRequest>> incomingByKey = new LinkedHashMap<>();
        Map<DatasourceApi, Integer> fetchCounts = new HashMap<>();
        for (Map.Entry<String, Collection<SearchResultRequest>> entry : incoming.entrySet()) {
            DatasourceApi source;
            try {
                source = DatasourceApi.valueOf(entry.getKey());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown datasource " + entry.getKey());
            }
            if (!source.isApiBased()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual uploads cannot be refetched");
            }
            Integer count = request.getDatasourceApiFetchCount() == null ? null : request.getDatasourceApiFetchCount().get(source);
            fetchCounts.put(source, count == null ? entry.getValue().size() : count);
            for (SearchResultRequest result : entry.getValue()) {
                String key = TitleKey.of(result.getDocument());
                if (key.isEmpty()) continue;
                Map<DatasourceApi, SearchResultRequest> bySource = incomingByKey.get(key);
                if (bySource == null) {
                    bySource = new LinkedHashMap<>();
                    incomingByKey.put(key, bySource);
                }
                if (!bySource.containsKey(source)) bySource.put(source, result);
            }
        }

        List<SearchResult> current = new ArrayList<>(query.getSearchResults());
        Map<String, Map<DatasourceApi, SearchResult>> currentApiRows = new HashMap<>();
        Map<String, List<Category>> queryCategories = new HashMap<>();
        for (SearchResult row : current) {
            String key = TitleKey.of(row.getDocument());
            addTo(queryCategories, key, row.getCategory());
            if (!row.getDatasource().isApiBased()) continue;
            Map<DatasourceApi, SearchResult> bySource = currentApiRows.get(key);
            if (bySource == null) {
                bySource = new HashMap<>();
                currentApiRows.put(key, bySource);
            }
            bySource.put(row.getDatasource(), row);
        }

        // The rest of the project: categories set there, and model ratings for the same title.
        Map<String, List<Category>> projectCategories = new HashMap<>();
        Map<String, SearchResult> projectRatings = new HashMap<>();
        for (SearchResult row : searchResultRepository.findByQuery_Project_ProjectId(query.getProject().getProjectId())) {
            String key = TitleKey.of(row.getDocument());
            if (!queryId(row).equals(query.getQueryId())) addTo(projectCategories, key, row.getCategory());
            if (row.getRelevanceRqHash() == null) continue;
            SearchResult best = projectRatings.get(key);
            if (best == null || isLater(row, best)) projectRatings.put(key, row);
        }

        Set<Long> keptIds = new HashSet<>();
        List<SearchResult> added = new ArrayList<>();
        for (Map.Entry<String, Map<DatasourceApi, SearchResultRequest>> entry : incomingByKey.entrySet()) {
            String key = entry.getKey();
            Map<DatasourceApi, SearchResult> existing = currentApiRows.get(key);
            SearchResult kept = null;
            if (existing != null) {
                for (Map.Entry<DatasourceApi, SearchResultRequest> found : entry.getValue().entrySet()) {
                    SearchResult row = existing.get(found.getKey());
                    if (row != null) {
                        row.setDocument(found.getValue().getDocument());
                        kept = row;
                        break;
                    }
                }
            }
            if (kept != null) {
                keptIds.add(kept.getResultId());
                continue;
            }
            Map.Entry<DatasourceApi, SearchResultRequest> first = entry.getValue().entrySet().iterator().next();
            SearchResultRequest result = first.getValue();
            Category fallback = categoriesByPriority.get(result.getPriority());
            if (fallback == null) throw new CategoryDoesNotExistException(result.getPriority());
            Category category = pickCategory(queryCategories.get(key), fallback);
            if (category == fallback) category = pickCategory(projectCategories.get(key), fallback);
            SearchResult row = SearchResult.builder()
                    .document(result.getDocument())
                    .datasource(first.getKey())
                    .category(category)
                    .query(query)
                    .build();
            SearchResult rating = projectRatings.get(key);
            if (rating != null) {
                row.setRelevanceScore(rating.getRelevanceScore());
                row.setRelevanceLogit(rating.getRelevanceLogit());
                row.setRelevanceModel(rating.getRelevanceModel());
                row.setRelevanceRqHash(rating.getRelevanceRqHash());
                row.setRelevanceScoredAt(rating.getRelevanceScoredAt());
            }
            added.add(row);
        }

        List<SearchResult> removed = new ArrayList<>();
        for (SearchResult row : current) {
            if (row.getDatasource().isApiBased() && !keptIds.contains(row.getResultId())) removed.add(row);
        }
        int removedFromCollections = 0;
        if (!removed.isEmpty()) {
            List<Long> ids = new ArrayList<>();
            for (SearchResult row : removed) ids.add(row.getResultId());
            removedFromCollections = entityManager
                    .createNativeQuery("DELETE FROM result_collections WHERE result_id IN (:ids)")
                    .setParameter("ids", ids)
                    .executeUpdate();
            query.getSearchResults().removeAll(removed);
            searchResultRepository.deleteAll(removed);
        }
        query.getSearchResults().addAll(searchResultRepository.saveAll(added));

        String name = request.getQueryName() == null ? "" : request.getQueryName().trim();
        if (!name.isEmpty()) query.setQueryName(name);
        query.setSearchText(searchText);
        query.setFromMonth(request.getFromMonth());
        query.setToMonth(request.getToMonth());
        Map<DatasourceApi, Integer> counts = new HashMap<>();
        if (query.getDatasourceApiFetchCount() != null) {
            for (Map.Entry<DatasourceApi, Integer> entry : query.getDatasourceApiFetchCount().entrySet()) {
                if (!entry.getKey().isApiBased()) counts.put(entry.getKey(), entry.getValue());
            }
        }
        counts.putAll(fetchCounts);
        if (query.getDatasourceApiFetchCount() == null) {
            query.setDatasourceApiFetchCount(counts);
        } else {
            query.getDatasourceApiFetchCount().clear();
            query.getDatasourceApiFetchCount().putAll(counts);
        }
        Query saved = queryRepository.save(query);

        return QueryRefetchDto.builder()
                .query(QueryMapper.toDto(saved))
                .kept(keptIds.size())
                .added(added.size())
                .removed(removed.size())
                .removedFromCollections(removedFromCollections)
                .build();
    }

    private static Long queryId(SearchResult row) {
        return row.getQuery() == null ? Long.valueOf(-1L) : row.getQuery().getQueryId();
    }

    private static boolean isLater(SearchResult a, SearchResult b) {
        if (a.getRelevanceScoredAt() == null) return false;
        return b.getRelevanceScoredAt() == null || a.getRelevanceScoredAt().isAfter(b.getRelevanceScoredAt());
    }

    private static void addTo(Map<String, List<Category>> map, String key, Category category) {
        if (key.isEmpty() || category == null) return;
        List<Category> list = map.get(key);
        if (list == null) {
            list = new ArrayList<>();
            map.put(key, list);
        }
        list.add(category);
    }

    // A category someone chose (anything but the default a fresh search assigns) wins over the default.
    private static Category pickCategory(List<Category> candidates, Category fallback) {
        if (candidates == null) return fallback;
        for (Category category : candidates) {
            if (category.getPriority() != fallback.getPriority()) return category;
        }
        return fallback;
    }
}
