import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { deleteProject, updateProject } from "../../api/project";
import { useNavigate } from "react-router-dom";
import { APP_URI_PREFIX } from "../../constants";
import { useContext, useState } from "react";
import ProjectSettingsActionButtons from "./ProjectSettingsActionButtons";
import Categories from "../Categories";
import { IoCloseSharp } from "react-icons/io5";
import ProjectContext from "../../contexts/ProjectContext";

interface projectSettingsModalProps {
  show: boolean;
  handleClose: () => void;
}

const Index = ({ show, handleClose }: projectSettingsModalProps) => {
  const navigate = useNavigate();
  const { project, setProject } = useContext(ProjectContext);
  const [projectEdited, setProjectEdited] = useState(false);

  const modifyProject = () => {
    const { projectId, projectName, description } = project;
    updateProject({ projectId, projectName, description })
      .then(() => {
        setProjectEdited(false);
      })
      .catch((e) => {
        alert("Something went wrong");
        console.log(e);
      });
  };
  const handleProjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectEdited(true);
    setProject({
      ...project,
      [e.target.name]: e.target.value,
    });
  };
  const removeProject = () => {
    const sure = window.confirm("Are you Sure");
    if (sure)
      deleteProject(project.projectId)
        .then(() => {
          navigate(`${APP_URI_PREFIX}/`);
        })
        .catch((e) => {
          alert("Something Went Wrong");
          console.log(e);
        });
  };
  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      centered
      className="c-modal"
    >
      <Modal.Header>
        <Modal.Title>Settings</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col>
            <h4>Project Details</h4>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Brand New Project"
                  name="projectName"
                  value={project.projectName}
                  onChange={handleProjectChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  placeholder="Leave a comment here"
                  name="description"
                  value={project.description}
                  onChange={handleProjectChange}
                  style={{ height: "100px" }}
                />
              </Form.Group>
              {projectEdited && (
                <ProjectSettingsActionButtons
                  update={modifyProject}
                  // cancel={resetProjectDetails}
                />
              )}
            </Form>
          </Col>
          <Col>
            <Categories projectId={project.projectId} />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button className="c-btn-negative" onClick={removeProject}>
          DELETE PROJECT
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Index;
