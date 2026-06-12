import { Col, Container, Row, Spinner } from "react-bootstrap";
import { Link } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import { getProjects, postProject } from "../api/project";
import { useEffect, useState } from "react";
import { categorySetType, projectType, querySetType } from "../api/types";
import NewPorjectModal from "../components/NewPorjectModal";
import { APP_URI_PREFIX } from "../constants";
import PageHeader from "../components/PageHeader";
import { getCategories } from "../api/category";
import { arrayToObject } from "../api/utility";
import { getQueries } from "../api/query";
import PageSubHeader from "../components/PageSubHeader";
import { IoMdAddCircleOutline } from "react-icons/io";
import SubHeaderTitle from "../components/Queries/SubHeaderTitle";
import { GoProject } from "react-icons/go";
import { MdOutlineManageSearch } from "react-icons/md";

const Dashbaord = () => {
  const [projects, setProjects] = useState<projectType[]>([]);
  const [projCategories, setProjCategories] = useState<categorySetType[]>([]);
  const [projQueries, setProjQueries] = useState<querySetType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const saveProject = (name: string, description: string) => {
    postProject({ name, description })
      .then((data) => setProjects([...projects, data]))
      .catch((e) => {
        alert("Something went wrong!");
        console.log(e);
      });
  };

  const fetchProjects = () => {
    getProjects()
      .then((data) => {
        setProjects(data);
        fetchCategories(data);
        fetchQueries(data);
      })
      .catch((e) => {
        alert("Failed to fetch projects");
        console.log(e);
      })
      .finally(() => setIsLoading(false));
  };

  const fetchCategories = (projects: projectType[]) => {
    const categoryCalls = projects.map((p) => getCategories(p.projectId));
    Promise.all(categoryCalls)
      .then((data) => {
        // convert categoryType[] to categorySetType
        const objectData = data.map((projCat) =>
          arrayToObject(projCat, "categoryId")
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
    Promise.all(queriesCalls)
      .then((data) => {
        // convert categoryType[] to categorySetType
        const objectData = data.map((queryCat) =>
          arrayToObject(queryCat, "queryId")
        );
        setProjQueries(objectData);
      })
      .catch((e) => {
        alert("Failed to fetch categories");
        console.log(e);
      });
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard-page">
      <PageHeader title="Dashboard" />
      <Container className="project-cards-wrapper">
        <PageSubHeader
          subTitle={
            <SubHeaderTitle
              icon={<GoProject />}
              count={projects.length}
              title="Projects"
            />
          }
          sideComponent={
            <div className="d-flex gap-2 align-items-center">
              <IoMdAddCircleOutline
                className="cp"
                size={"1.5rem"}
                onClick={() => setShowNewProjectModal(true)}
              />
            </div>
          }
        />
        {!isLoading ? (
          <Row xs={1} md={3} className="mt-4">
            {projects.map((proj, i) => (
              <Col key={i}>
                <ProjectCard
                  key={proj.projectId}
                  project={proj}
                  queries={projQueries[i] || {}}
                  categories={projCategories[i] || []}
                />
                <div className="project-card-actions">
                  <Link
                    to={`${APP_URI_PREFIX}/project/?id=${proj.projectId}`}
                    className="btn c-btn-primary"
                  >
                    Open
                  </Link>
                  <Link
                    to={`${APP_URI_PREFIX}/project/curate/?id=${proj.projectId}`}
                    className="btn c-btn-secondary"
                  >
                    <MdOutlineManageSearch className="me-1" />
                    Curate
                  </Link>
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <Spinner />
        )}
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
