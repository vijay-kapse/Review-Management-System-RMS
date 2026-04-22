import { Button, Col, Modal, Row } from "react-bootstrap";
import { resultType } from "../api/types";
import { IoCloseSharp } from "react-icons/io5";
import ResultTable from "./ResultsTable/Index";

interface cumulativeResultsTableModalProps {
  show: boolean;
  res: resultType[];
  handleClose: () => void;
}

const CumulativeResultsTableModal = ({
  show,
  res,
  handleClose,
}: cumulativeResultsTableModalProps) => {
  return (
    <Modal
      show={show}
      onHide={handleClose}
      size="xl"
      className="c-modal"
      centered
    >
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

export default CumulativeResultsTableModal;
