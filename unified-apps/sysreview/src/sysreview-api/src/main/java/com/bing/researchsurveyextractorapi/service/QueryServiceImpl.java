package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.QueryNotFoundException;
import com.bing.researchsurveyextractorapi.mapper.QueryMapper;
import com.bing.researchsurveyextractorapi.models.Category;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.models.Query;
import com.bing.researchsurveyextractorapi.pojo.query.QueryRequest;
import com.bing.researchsurveyextractorapi.pojo.searchresult.SearchResultUpdateRequest;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import com.bing.researchsurveyextractorapi.repository.QueryRepository;
import com.bing.researchsurveyextractorapi.repository.SearchResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QueryServiceImpl implements QueryService {

    private final QueryRepository queryRepository;
    private final ProjectRepository projectRepository;
    private final SearchResultRepository searchResultRepository;

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
    public void deleteQuery(long queryId) {
        queryRepository.deleteById(queryId);
    }

    @Override
    public void patchSearchResults(long queryId, List<SearchResultUpdateRequest> resultUpdateRequests) {
        Query query = queryRepository.findById(queryId).orElseThrow(() -> new QueryNotFoundException(queryId));
        Map<Integer, Category> categories = query.getProject()
                .getCategories()
                .stream()
                .collect(Collectors.toMap(Category::getPriority, Function.identity()));
        resultUpdateRequests.forEach(request -> searchResultRepository.updateCategoryByResultId(categories.get(request.getPriority()), request.getResultId()));
    }
}
