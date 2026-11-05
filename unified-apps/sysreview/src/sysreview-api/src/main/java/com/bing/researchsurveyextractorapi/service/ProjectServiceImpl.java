package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.ProjectNotFoundException;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.project.ProjectRequest;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    final ProjectRepository projectRepository;
    final UserService userService;

    @PersistenceContext
    private EntityManager entityManager;

    // Children first, so no foreign key is ever violated. Deliberately not projectRepository.delete:
    // Hibernate's cascade removed categories before the papers that reference them (500 on any
    // project with papers), and collaborators are mapped cascade = ALL, so a JPA delete would also
    // try to delete the collaborators' user accounts. Only the link rows are removed here.
    private static final String[] DELETE_PROJECT_SQL = {
            "DELETE FROM result_collections WHERE collection_id IN (SELECT collection_id FROM document_collections WHERE project_id = :projectId) "
                    + "OR result_id IN (SELECT sr.result_id FROM search_results sr JOIN queries q ON q.query_id = sr.query_id WHERE q.project_id = :projectId)",
            "DELETE FROM document_collections WHERE project_id = :projectId",
            "DELETE FROM search_results WHERE query_id IN (SELECT query_id FROM queries WHERE project_id = :projectId)",
            "DELETE FROM query_datasource_api_fetch_count WHERE query_query_id IN (SELECT query_id FROM queries WHERE project_id = :projectId)",
            "DELETE FROM queries WHERE project_id = :projectId",
            "DELETE FROM categories WHERE project_id = :projectId",
            "DELETE FROM project_collaborators WHERE project_id = :projectId",
            "DELETE FROM projects WHERE project_id = :projectId",
    };

    @Override
    public List<Project> loadAllProjectsForUser(String username) {
        return projectRepository.findByOwnerUsername(username);
    }

    @Override
    public Project loadProjectById(long projectId) {
        return projectRepository.findById(projectId).orElseThrow(() -> new ProjectNotFoundException(projectId));
    }

    @Override
    public Project createProject(ProjectRequest dto, User user) {
        return projectRepository.save(
                Project.builder()
                        .projectName(dto.getProjectName())
                        .description(dto.getDescription())
                        .researchQuestion(dto.getResearchQuestion())
                        .owner(user)
                        .build()
        );
    }

    @Override
    public void updateProject(long projectId, ProjectRequest updatedProject) {
        if (projectRepository.existsById(projectId)) {
            String projectName = updatedProject.getProjectName();
            String description = updatedProject.getDescription();
            projectRepository.updateProjectNameAndDescriptionByProjectId(projectName, description, projectId);
            // Older clients omit the field; only overwrite it when it was sent.
            if (updatedProject.getResearchQuestion() != null) {
                projectRepository.updateResearchQuestionByProjectId(updatedProject.getResearchQuestion().trim(), projectId);
            }
        } else {
            throw new ProjectNotFoundException(projectId);
        }
    }

    @Override
    public void setArchived(long projectId, boolean archived, String username) {
        Project project = loadProjectById(projectId);
        if (!project.getOwner().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the project owner can archive it");
        }
        projectRepository.updateArchivedByProjectId(archived, projectId);
    }

    @Override
    @Transactional
    public void deleteProject(long projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new ProjectNotFoundException(projectId);
        }
        for (String sql : DELETE_PROJECT_SQL) {
            entityManager.createNativeQuery(sql).setParameter("projectId", projectId).executeUpdate();
        }
        entityManager.clear();
    }
}
