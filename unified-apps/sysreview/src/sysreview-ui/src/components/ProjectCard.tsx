import { Card, Col, Row } from "react-bootstrap";
import { CategorySymbol } from "./CategoryLabel";
import ReportIconButton from "./IconButtons/ReportIconButton";
import { categorySetType, projectType, querySetType } from "../api/types";
import { FC } from "react";
import { FaTasks } from "react-icons/fa";

interface ProjectCardProps {
  project: projectType;
  categories: categorySetType;
  queries: querySetType;
}
const ProjectCard: FC<ProjectCardProps> = ({
  project,
  categories,
  queries,
}) => {
  const { projectName, description } = project;
  return (
    <Card className="project-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        {projectName}
        {/* Below component should be covered under ProjectContextProvider */}
        {/* <SettingsIconButton project={project} categories={categories} /> */}
      </Card.Header>
      <Card.Body>
        <Card.Text>
          {description.length > 100
            ? description.slice(0, 140) + "..."
            : description}
        </Card.Text>
      </Card.Body>
      <Card.Footer>
        <Row>
          <Col md={9} className="my-auto">
            <div className="d-flex gap-2 align-items-center">
              {Object.values(categories).length > 0 ? (
                Object.values(categories).map((cat, i) => (
                  <CategorySymbol color={cat.color} key={i} />
                ))
              ) : (
                <span>No categories</span>
              )}
            </div>
          </Col>
          <Col md={3} className="my-auto">
            <div className="d-flex align-items-center justify-content-around">
              <div className="card-query-info">
                <span className="query-count">
                  {Object.keys(queries).length}
                </span>
                <FaTasks />
              </div>
              <ReportIconButton
                variant="negative"
                size="lg"
                queries={queries}
              />
            </div>
          </Col>
        </Row>
      </Card.Footer>
    </Card>
  );
};

export default ProjectCard;
