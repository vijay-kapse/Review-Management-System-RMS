package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.models.Project;
import com.bing.researchsurveyextractorapi.models.User;
import com.bing.researchsurveyextractorapi.pojo.project.ProjectRequest;

import java.util.List;

public interface ProjectService {
    List<Project> loadAllProjectsForUser(String username);

    Project loadProjectById(long projectId);

    Project createProject(ProjectRequest dto, User user);

    void updateProject(long projectId, ProjectRequest project);

    void deleteProject(long projectId);
}
