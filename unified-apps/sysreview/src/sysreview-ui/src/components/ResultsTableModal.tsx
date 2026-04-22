import { Button, Col, Modal, Row } from "react-bootstrap";
import { resultType } from "../api/types";
import { IoCloseSharp } from "react-icons/io5";
import ResultTable from "./ResultsTable/Index";

interface resultsTableModalProps {
  show: boolean;
  res: resultType[];
  handleClose: () => void;
}

const ResultsTableModal = ({
  show,
  res,
  handleClose,
}: resultsTableModalProps) => {
  return (
    <Modal show={show} onHide={handleClose} size="xl" className="c-modal">
      <Modal.Header>
        <Modal.Title>Results</Modal.Title>
        <IoCloseSharp className="cp" size={"1.5rem"} onClick={handleClose} />
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col>
            <ResultTable results={res} />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button className="c-btn-negative" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ResultsTableModal;
