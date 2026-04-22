import { IMAGE_URI_PREFIX } from "../../constants";
import { Col, Container, Row } from "react-bootstrap";
import SectionHeader from "./SectionHeader";

const QueriesSection = () => {
  return (
    <div className="landing-section light-section">
      <Container>
        <Row>
          <Col>
            <SectionHeader title="Queries" className="text-start p-0" />
            <hr className="dark-hr" />
            <h4>Use logical queries to search better.</h4>
            <h4>
              Create complex queries easily with in-built
              <br />
              <span className="fs-2 text-underline">QUERY BUILDER</span>.
            </h4>
          </Col>
          <Col>
            <img
              src={`${IMAGE_URI_PREFIX}/query_builder.png`}
              className="img-fluid rounded shadow"
              alt="query_builder"
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default QueriesSection;
