import { FC } from "react";
import { Col, Container, Row } from "react-bootstrap";
import CopyToClipboard from "./CopyToClipboard";

interface QueryProps {
  queryText: string;
}

const Query: FC<QueryProps> = ({ queryText }) => {
  return (
    <Container>
      <Row className="c-alert-info w-100 py-2 rounded d-flex align-items-center justify-content-between">
        <Col sm={11}>
          <code>{queryText}</code>
        </Col>
        <Col className="text-end">
          <CopyToClipboard text={queryText} />
        </Col>
      </Row>
    </Container>
  );
};

export default Query;
