import { useContext, useEffect, useState } from "react";
import { Alert, Container } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { getProject } from "../api/project";

import ProjectContext from "../contexts/ProjectContext";
import { QueryContextProvider } from "../contexts/QueryContext";
import { BsFillInfoCircleFill } from "react-icons/bs";
import Loader from "../components/Loader";
import SettingsIconButton from "../components/IconButtons/SettingsIconButton";
import Queries from "../components/Queries/Index";
import { APP_URI_PREFIX } from "../constants";
import { MdOutlineManageSearch } from "react-icons/md";
import { FiArchive, FiFolder, FiLayers } from "react-icons/fi";
import { CategorySymbol } from "../components/CategoryLabel";

const Project = () => {
  const { project, setProject, categories, loadCategories } =
    useContext(ProjectContext);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const fetchProject = (id: number) => {
    setIsLoading(true);
    getProject(id)
      .then((data) => setProject(data))
      .catch((e) => {
        alert("Failed to fetch project!");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    const id = parseInt(searchParams.get("id") || "0");
    // if (id === 0) navigate(`${APP_URI_PREFIX}/`); // send to dashboard if no id in url
    fetchProject(id);
    loadCategories(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="project-page">
        <Loader />
      </div>
    );
  }

  // check if atleast one saved category is present
  const atLeastOneCategory = Object.values(categories).some(
    (cat) => cat.categoryId,
  );
  const categoryList = Object.values(categories).sort(
    (a, b) => a.priority - b.priority,
  );

  return (
    <div className="project-page">
      <Container fluid className="project-shell">
        <section className="project-workspace-hero">
          <div>
            <div className="dashboard-eyebrow">
              <FiFolder />
              Project workspace
            </div>
            <h1>{project.projectName || "Project"}</h1>
            <p>
              {project.description ||
                "Build queries and curate saved literature."}
            </p>
            <div className="project-category-preview">
              {categoryList.length ? (
                categoryList.slice(0, 6).map((cat) => (
                  <span className="project-category-pill" key={cat.categoryId}>
                    <CategorySymbol color={cat.color} size="0.55rem" />
                    {cat.label}
                  </span>
                ))
              ) : (
                <span className="project-card__muted">No categories yet</span>
              )}
            </div>
          </div>
          <div className="project-hero-actions">
            <Link
              to={`${APP_URI_PREFIX}/project/curate/?id=${project.projectId}`}
              className="dashboard-primary-action"
            >
              <MdOutlineManageSearch />
              Curate Project
            </Link>
            <span className="project-settings-action">
              <SettingsIconButton size="lg" variant="dark" />
            </span>
          </div>
        </section>

        <section className="project-stat-grid" aria-label="Project summary">
          <div className="dashboard-stat-tile">
            <span className="dashboard-stat-icon">
              <FiLayers />
            </span>
            <span className="dashboard-stat-value">{categoryList.length}</span>
            <span className="dashboard-stat-label">Categories</span>
          </div>
          <div className="dashboard-stat-tile">
            <span className="dashboard-stat-icon">
              <FiArchive />
            </span>
            <span className="dashboard-stat-value">
              {project.collections?.length || 0}
            </span>
            <span className="dashboard-stat-label">Collections</span>
          </div>
        </section>

        {!atLeastOneCategory && (
          <Alert className="c-alert-info">
            <BsFillInfoCircleFill />
            Add a category in settings to start searching.
          </Alert>
        )}

        {atLeastOneCategory && (
          <section className="project-query-panel">
            <QueryContextProvider>
              <Queries />
            </QueryContextProvider>
          </section>
        )}
      </Container>
    </div>
  );
};

export default Project;
