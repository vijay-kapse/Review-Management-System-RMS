package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.exceptions.ProjectNotFoundException;
import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.project.ProjectRequest;
import com.bing.researchsurveyextractorapi.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    final ProjectRepository projectRepository;
    final UserService userService;

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
        } else {
            throw new ProjectNotFoundException(projectId);
        }
    }

    @Override
    public void deleteProject(long projectId) {
        if (projectRepository.existsById(projectId)) {
            projectRepository.deleteById(projectId);
        } else {
            throw new ProjectNotFoundException(projectId);
        }
    }
}
