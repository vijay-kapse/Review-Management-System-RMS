import { useContext, useEffect, useState } from "react";
import { Alert, Container } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { getProject } from "../api/project";

import ProjectContext from "../contexts/ProjectContext";
import { QueryContextProvider } from "../contexts/QueryContext";
import { BsFillInfoCircleFill } from "react-icons/bs";
import Loader from "../components/Loader";
import PageHeader from "../components/PageHeader";
import SettingsIconButton from "../components/IconButtons/SettingsIconButton";
import Queries from "../components/Queries/Index";
import { APP_URI_PREFIX } from "../constants";
import { MdOutlineManageSearch } from "react-icons/md";

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
    (cat) => cat.categoryId
  );

  return (
    <div className="project-page">
      <PageHeader
        title={project.projectName}
        sideComponent={
          <div className="d-flex gap-2 align-items-center">
            <Link
              to={`${APP_URI_PREFIX}/project/curate/?id=${project.projectId}`}
              className="btn c-btn-secondary"
            >
              <MdOutlineManageSearch className="me-1" />
              Curate Project
            </Link>
            <SettingsIconButton size="lg" variant="dark" />
          </div>
        }
      />
      {!atLeastOneCategory && (
        <Container>
          <Alert className="c-alert-info">
            <BsFillInfoCircleFill />
            Add a category in settings to start searching.
          </Alert>
        </Container>
      )}

      {atLeastOneCategory && (
        <QueryContextProvider>
          <Queries />
        </QueryContextProvider>
      )}
    </div>
  );
};

export default Project;
