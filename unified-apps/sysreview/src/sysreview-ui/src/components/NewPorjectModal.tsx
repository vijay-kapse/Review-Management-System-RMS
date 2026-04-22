import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import { IoCloseSharp } from "react-icons/io5";

interface newProjectModalProps {
  show: boolean;
  saveProject: (name: string, description: string) => void;
  handleClose: () => void;
}

const NewPorjectModal = ({
  show,
  saveProject,
  handleClose,
}: newProjectModalProps) => {
  const [name, setName] = useState("New Project");
  const [description, setDescription] = useState("This is my new project");

  const clearInputs = () => {
    setName("");
    setDescription("");
  };

  const handleSave = () => {
    saveProject(name, description);
    clearInputs();
    handleClose();
  };
  return (
    <Modal
      size="lg"
      show={show}
      centered
      className="c-modal"
      onHide={handleClose}
    >
      <Modal.Header>
        <Modal.Title>New Project</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="New Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ height: "100px" }}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
        <Button className="c-btn-primary" onClick={handleSave}>
          Create
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NewPorjectModal;
