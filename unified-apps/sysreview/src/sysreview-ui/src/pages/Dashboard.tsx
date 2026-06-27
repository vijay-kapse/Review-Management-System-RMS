import { Button, Container, Spinner } from "react-bootstrap";
import ProjectCard from "../components/ProjectCard";
import { getProjects, postProject } from "../api/project";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { categorySetType, projectType, querySetType } from "../api/types";
import NewPorjectModal from "../components/NewPorjectModal";
import { getCategories } from "../api/category";
import { arrayToObject } from "../api/utility";
import { getQueries } from "../api/query";
import {
  FiCheckCircle,
  FiCompass,
  FiFolder,
  FiLayers,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

type ProjectMetaMap<T> = {
  [projectId: number]: T;
};

const Dashbaord = () => {
  const [projects, setProjects] = useState<projectType[]>([]);
  const [projCategories, setProjCategories] = useState<
    ProjectMetaMap<categorySetType>
  >({});
  const [projQueries, setProjQueries] = useState<ProjectMetaMap<querySetType>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  const saveProject = (name: string, description: string) => {
    postProject({ name, description })
      .then((data) => {
        setProjects((currentProjects) => [...currentProjects, data]);
        setProjCategories((currentCategories) => ({
          ...currentCategories,
          [data.projectId]: {},
        }));
        setProjQueries((currentQueries) => ({
          ...currentQueries,
          [data.projectId]: {},
        }));
      })
      .catch((e) => {
        alert("Something went wrong!");
        console.log(e);
      });
  };

  const fetchProjects = () => {
    setIsLoading(true);
    getProjects()
      .then((data) => {
        setProjects(data);
        return Promise.all([fetchCategories(data), fetchQueries(data)]);
      })
      .catch((e) => {
        alert("Failed to fetch projects");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const fetchCategories = (projects: projectType[]) => {
    const categoryCalls = projects.map((p) => getCategories(p.projectId));
    return Promise.all(categoryCalls)
      .then((data) => {
        const objectData = data.reduce<ProjectMetaMap<categorySetType>>(
          (projectCategories, projCat, index) => ({
            ...projectCategories,
            [projects[index].projectId]: arrayToObject(
              projCat,
              "categoryId",
            ) as categorySetType,
          }),
          {},
        );
        setProjCategories(objectData);
      })
      .catch((e) => {
        alert("Failed to fetch categories");
        console.log(e);
      });
  };

  const fetchQueries = (projects: projectType[]) => {
    const queriesCalls = projects.map((p) => getQueries(p.projectId));
    return Promise.all(queriesCalls)
      .then((data) => {
        const objectData = data.reduce<ProjectMetaMap<querySetType>>(
          (projectQueries, queryCat, index) => ({
            ...projectQueries,
            [projects[index].projectId]: arrayToObject(
              queryCat,
              "queryId",
            ) as querySetType,
          }),
          {},
        );
        setProjQueries(objectData);
      })
      .catch((e) => {
        alert("Failed to fetch queries");
        console.log(e);
      });
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (!normalizedSearch) return projects;
    return projects.filter(({ projectName, description }) =>
      `${projectName} ${description}`.toLowerCase().includes(normalizedSearch),
    );
  }, [projects, searchText]);

  const totalQueries = useMemo(
    () =>
      Object.values(projQueries).reduce(
        (count, queries) => count + Object.keys(queries).length,
        0,
      ),
    [projQueries],
  );

  const totalCategories = useMemo(
    () =>
      Object.values(projCategories).reduce(
        (count, categories) => count + Object.keys(categories).length,
        0,
      ),
    [projCategories],
  );

  const readyProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          Object.keys(projCategories[project.projectId] || {}).length > 0,
      ).length,
    [projects, projCategories],
  );

  const dashboardStats = [
    {
      label: "Projects",
      value: projects.length,
      icon: <FiFolder />,
    },
    {
      label: "Saved queries",
      value: totalQueries,
      icon: <FiSearch />,
    },
    {
      label: "Categories",
      value: totalCategories,
      icon: <FiLayers />,
    },
    {
      label: "Ready",
      value: readyProjects,
      icon: <FiCheckCircle />,
    },
  ];

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  return (
    <div className="dashboard-page">
      <Container fluid className="dashboard-shell">
        <section className="dashboard-hero" aria-labelledby="dashboard-title">
          <div>
            <div className="dashboard-eyebrow">
              <FiCompass />
              TRACE workspace
            </div>
            <h1 id="dashboard-title">
              Research projects, beautifully organized.
            </h1>
            <p>Projects, saved queries, curation, and reports at a glance.</p>
          </div>
          <div className="dashboard-hero-actions">
            <Button
              className="dashboard-primary-action"
              onClick={() => setShowNewProjectModal(true)}
            >
              <FiPlus />
              New Project
            </Button>
          </div>
        </section>

        <section className="dashboard-stat-grid" aria-label="Dashboard summary">
          {dashboardStats.map(({ icon, label, value }) => (
            <div className="dashboard-stat-tile" key={label}>
              <span className="dashboard-stat-icon">{icon}</span>
              <span className="dashboard-stat-value">{value}</span>
              <span className="dashboard-stat-label">{label}</span>
            </div>
          ))}
        </section>

        <section className="dashboard-projects-section">
          <div className="dashboard-section-bar">
            <div>
              <p className="dashboard-kicker">Library</p>
              <h2>Projects</h2>
            </div>
            <label className="dashboard-search" aria-label="Search projects">
              <FiSearch />
              <input
                type="search"
                placeholder="Search projects"
                value={searchText}
                onChange={handleSearchChange}
              />
            </label>
          </div>

          {!isLoading ? (
            filteredProjects.length ? (
              <div className="project-cards-wrapper">
                {filteredProjects.map((proj, i) => (
                  <ProjectCard
                    key={proj.projectId}
                    project={proj}
                    queries={projQueries[proj.projectId] || {}}
                    categories={projCategories[proj.projectId] || {}}
                    accentIndex={i}
                  />
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <FiFolder />
                <h3>No projects found</h3>
                <p>
                  {searchText
                    ? "Try a different search."
                    : "Create a project to get started."}
                </p>
                {!searchText && (
                  <Button
                    className="dashboard-primary-action"
                    onClick={() => setShowNewProjectModal(true)}
                  >
                    <FiPlus />
                    New Project
                  </Button>
                )}
              </div>
            )
          ) : (
            <div className="dashboard-loading">
              <Spinner />
            </div>
          )}
        </section>
      </Container>
      <NewPorjectModal
        show={showNewProjectModal}
        handleClose={() => setShowNewProjectModal(false)}
        saveProject={saveProject}
      />
    </div>
  );
};

export default Dashbaord;
