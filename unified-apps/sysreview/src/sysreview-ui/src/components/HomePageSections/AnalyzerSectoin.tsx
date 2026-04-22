import { ANALYSER_APP_NAME, IMAGE_URI_PREFIX } from "../../constants";
import { Col, Container, Row } from "react-bootstrap";
import SectionHeader from "./SectionHeader";
import { ANALYSER_API_URI } from "../../constants";

const AnalyzerSection = () => {
  return (
    <div className="landing-section light-section">
      <Container className="">
        <Row>
          <Col sm={4}>
            <SectionHeader
              title="DART Integration"
              className="text-start p-0"
            />
            <hr className="dark-hr mb-2" />
            <h5>
              Extract information by taking your Curated Papers to the
              integrated{" "}
            </h5>
            <a
              href={`${ANALYSER_API_URI}`}
              target="_blank"
              rel="noreferrer"
              className="text-uppercase"
            >
              <h3>{ANALYSER_APP_NAME.toUpperCase()} Software</h3>
            </a>
          </Col>
          <Col className="text-end" sm={8}>
            <img
              src={`${IMAGE_URI_PREFIX}/dart.png`}
              className="img-fluid rounded w-75"
              alt="curation"
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default AnalyzerSection;
