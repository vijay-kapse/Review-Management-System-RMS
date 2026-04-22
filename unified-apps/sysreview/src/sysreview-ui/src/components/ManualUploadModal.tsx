import { ChangeEvent, useState } from "react";
import { Button, Col, Container, Form, Modal, Row } from "react-bootstrap";
import { getSupportedTemplates, getTemplateMapping } from "../api/utility";
import { FaDownload } from "react-icons/fa";
import { IoCloseSharp } from "react-icons/io5";

interface manualUploadModalProps {
  show: boolean;
  handleClose: () => void;
  handleFileContent: (sourceDoc: string, mapping: Object) => boolean;
}

const ManualUploadModal = ({
  show,
  handleClose,
  handleFileContent,
}: manualUploadModalProps) => {
  const templates = getSupportedTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [selectedTemplateMapping, setSelectedTemplateMapping] = useState<
    Object | undefined
  >(getTemplateMapping(templates[0]));
  const [file, setFile] = useState<File>();
  const fileReader = new FileReader();
  const [showCustomTemplateUploader, setShowCustomTemplateUploader] =
    useState(false);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };
  const handleCustomTemplateUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const customTemplateFile = e.target.files[0];
      if (!customTemplateFile) {
        setSelectedTemplateMapping(undefined);
        return;
      }
      fileReader.onload = (event) => {
        if (event.target) {
          try {
            const customTemplate = JSON.parse(event.target.result as string);
            setSelectedTemplateMapping(customTemplate);
          } catch (e) {
            alert("Uploaded json is invalid!");
            setSelectedTemplateMapping(undefined);
          }
        }
      };
      fileReader.readAsText(customTemplateFile);
    }
  };

  const handlSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedTemplate(val);
    if (val === "CUSTOM") {
      setSelectedTemplateMapping(undefined);
      setShowCustomTemplateUploader(true);
    } else {
      setSelectedTemplateMapping(getTemplateMapping(val));
      setShowCustomTemplateUploader(false);
    }
  };

  const handleOnSubmit = () => {
    if (file) {
      fileReader.onload = (event) => {
        if (event.target) {
          if (selectedTemplateMapping) {
            const suc = handleFileContent(
              event.target.result as string,
              selectedTemplateMapping
            );
            if (suc) handleClose();
          }
        }
      };

      fileReader.readAsText(file);
    }
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      className="c-modal"
    >
      <Modal.Header>
        <Modal.Title>Upload a csv file</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        <Form className="p-4">
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="3">
              Name
            </Form.Label>
            <Col sm="9">
              <Form.Control
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm="3">
              Choose a template
            </Form.Label>
            <Col sm="6">
              <Form.Select
                value={selectedTemplate}
                onChange={handlSelectChange}
              >
                {templates.map((template) => (
                  <option value={template} key={template}>
                    {template}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col sm="3" className="d-flex flex-column justify-content-center">
              <Container className="preview-btn">
                <a
                  href={
                    process.env.PUBLIC_URL + "/" + selectedTemplate + ".json"
                  }
                  download={`${selectedTemplate}.json`}
                >
                  <FaDownload className="primary-icon" />
                  Preview
                </a>
              </Container>
            </Col>
          </Form.Group>
          {showCustomTemplateUploader && (
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">
                Upload your template
              </Form.Label>
              <Col sm="9">
                <Form.Control
                  type="file"
                  accept=".json"
                  onChange={handleCustomTemplateUpload}
                />
              </Col>
            </Form.Group>
          )}
          {selectedTemplateMapping ? (
            <p>
              CSV will be parsed for the following columns:
              <br />
              <b>{Object.keys(selectedTemplateMapping).join(" | ")}</b>
            </p>
          ) : (
            <p>
              <i>Download & edit the custom template to upload here!</i>
            </p>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
        <Button className="c-btn-primary" onClick={handleOnSubmit}>
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManualUploadModal;
