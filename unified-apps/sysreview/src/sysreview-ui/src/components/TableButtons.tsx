import { Button, ButtonGroup, Col, Row } from "react-bootstrap";

interface tableButtonsProps {
  total: number;
  range: string;
  prev: () => void;
  next: () => void;
}

const TableButtons = ({ range, total, prev, next }: tableButtonsProps) => {
  return (
    <div className="table-buttons">
      <Row className="align-items-center">
        <Col>
          Showing {range} of {total} rows
        </Col>
        <Col md={3} className="d-flex flex-column align-items-end">
          <ButtonGroup aria-label="Basic example">
            <Button variant="outline-secondary" onClick={prev}>
              Prev
            </Button>
            <Button variant="outline-secondary" onClick={next}>
              Next
            </Button>
          </ButtonGroup>
        </Col>
      </Row>
    </div>
  );
};

export default TableButtons;
