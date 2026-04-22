import { IMAGE_URI_PREFIX } from "../../constants";
import { Col, Container, Row } from "react-bootstrap";
import SectionHeader from "./SectionHeader";

const CurationSection = () => {
  return (
    <div className="landing-section dark-section">
      <Container className="">
        <Row>
          <Col className="text-center">
            <img
              src={`${IMAGE_URI_PREFIX}/curation.png`}
              className="img-fluid rounded w-75"
              alt="curation"
            />
          </Col>
          <Col>
            <div className="d-flex flex-column gap-4 px-4">
              <div>
                <SectionHeader title="Curate" className="text-start p-0" />
                <hr className="light-hr mb-2" />
                <h5>Checkout papers on official sites</h5>
              </div>
              <div>
                <SectionHeader
                  title="Categorize"
                  className="text-start mt-4  p-0"
                />
                <hr className="light-hr mb-2" />
                <h5>Categorize papers with custom categories and color tags</h5>
              </div>
              <div>
                <SectionHeader title="Report" className="text-start mt-4 p-0" />
                <hr className="light-hr mb-2" />
                <h5>View Statistics reports for each query in the project</h5>
              </div>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default CurationSection;
