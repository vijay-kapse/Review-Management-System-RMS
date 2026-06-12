import { Button, Form, Modal } from "react-bootstrap";
import { deleteProject, updateProject } from "../../api/project";
import { useNavigate } from "react-router-dom";
import { APP_URI_PREFIX } from "../../constants";
import { useContext, useState } from "react";
import ProjectSettingsActionButtons from "./ProjectSettingsActionButtons";
import Categories from "../Categories";
import { IoCloseSharp } from "react-icons/io5";
import ProjectContext from "../../contexts/ProjectContext";
import { FiEdit3, FiSettings, FiTrash2 } from "react-icons/fi";

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
      className="c-modal workspace-modal workspace-settings-modal"
    >
      <Modal.Header className="workspace-modal__header">
        <div>
          <div className="workspace-modal__eyebrow">
            <FiSettings />
            Settings
          </div>
          <Modal.Title>Project settings</Modal.Title>
          <p>{project.projectName || "Project"}</p>
        </div>
        <button
          type="button"
          className="workspace-modal__close"
          aria-label="Close settings"
          onClick={handleClose}
        >
          <IoCloseSharp />
        </button>
      </Modal.Header>
      <Modal.Body className="workspace-modal__body">
        <div className="workspace-settings-grid">
          <section className="workspace-settings-panel">
            <div className="workspace-section-heading">
              <FiEdit3 />
              <h4>Project details</h4>
            </div>
            <Form className="workspace-settings-form">
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
                />
              </Form.Group>
              {projectEdited && (
                <ProjectSettingsActionButtons
                  update={modifyProject}
                  // cancel={resetProjectDetails}
                />
              )}
            </Form>
          </section>
          <section className="workspace-settings-panel workspace-settings-panel--categories">
            <Categories projectId={project.projectId} />
          </section>
        </div>
      </Modal.Body>
      <Modal.Footer className="workspace-modal__footer workspace-danger-zone">
        <div>
          <strong>Danger zone</strong>
          <span>Deleting a project removes its saved review workspace.</span>
        </div>
        <Button className="workspace-danger-action" onClick={removeProject}>
          <FiTrash2 />
          Delete project
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default Index;
