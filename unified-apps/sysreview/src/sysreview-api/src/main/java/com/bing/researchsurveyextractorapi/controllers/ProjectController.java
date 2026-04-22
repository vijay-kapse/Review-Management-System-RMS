package com.bing.researchsurveyextractorapi.controllers;

import com.bing.researchsurveyextractorapi.mapper.ProjectMapper;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.project.ProjectDto;
import com.bing.researchsurveyextractorapi.pojo.project.ProjectRequest;
import com.bing.researchsurveyextractorapi.service.ProjectService;
import com.bing.researchsurveyextractorapi.util.AuthUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("${API_V1_URI}/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("")
    public List<ProjectDto> getAllProjects() {
        return projectService.loadAllProjectsForUser(AuthUtils.getLoggedInUsername())
                .stream()
                .map(ProjectMapper::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{projectId}")
    public ProjectDto getProject(@PathVariable long projectId) {
        return ProjectMapper.toDto(projectService.loadProjectById(projectId));
    }

    @PostMapping("")
    public ProjectDto createProject(@RequestBody ProjectRequest request) {
        User user = AuthUtils.getLoggedInUser();
        return ProjectMapper.toDto(projectService.createProject(request, user));
    }

    @PutMapping("/{projectId}")
    public void updateProject(@PathVariable long projectId, @RequestBody ProjectRequest request) {
        projectService.updateProject(projectId, request);
    }

    @DeleteMapping("/{projectId}")
    public void deleteProject(@PathVariable long projectId) {
        projectService.deleteProject(projectId);
    }
}
