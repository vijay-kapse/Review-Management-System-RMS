import { datasourcesLogos } from "../../constants";
import { useContext } from "react";
import AppContext from "../../contexts/AppContext";
import { Col, Container, Row } from "react-bootstrap";
import SectionHeader from "./SectionHeader";

const SourcesSection = () => {
  const { datasources } = useContext(AppContext);

  return (
    <section className="landing-section dark-section ">
      <Container className="sources-section">
        <SectionHeader title="Datasources" />
        <hr className="light-hr m-auto mb-4" />

        <h4 className="mb-4">
          SysReview supports {Object.keys(datasources).length - 1} datasources to
          fetch Research Papers with{" "}
          <span
            style={{
              color: "var(--secondary-color)",
              textDecoration: "underline",
            }}
          >
            Manual Upload
          </span>{" "}
          feature
        </h4>
        <Row>
          <Col>
            <div className="d-flex justify-content-center align-items-center">
              {Object.entries(datasourcesLogos).map(([source, url]) => {
                if (source === "MANUAL") return <></>;
                return (
                  <a
                    className="source-image-card m-auto"
                    href={datasources[source].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={url}
                      alt={`${source}_logo`}
                      className="image-fluid w-100"
                    />
                  </a>
                );
              })}
            </div>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default SourcesSection;
