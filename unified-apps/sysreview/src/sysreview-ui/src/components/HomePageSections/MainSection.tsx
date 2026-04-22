import { APP_URI_PREFIX, DOCS_URI, IMAGE_URI_PREFIX } from "../../constants";
import { Link } from "react-router-dom";
import { validateToken } from "../../api/utility";
import { Button, Col, Container, Row } from "react-bootstrap";

const MainSection = () => {
  const isAuthenticated = validateToken();

  return (
    <section className="landing-section light-section">
      <Container className="main-section">
        <Row>
          <Col sm={4}>
            <h1 className="title">
              <span className="char">Sys</span>tematic
              <br />
              <span className="char">Review</span>
              <br />
            </h1>
            <h3 className="char">SURVEY AUTOMATION TOOL</h3>
            <p className="desc">
              A tool for Interdisciplinary Researchers to Automate Scientific
              Research Surveys
            </p>
            <Link to={`${APP_URI_PREFIX}/dashboard`}>
              <Button className="c-btn-primary">
                {isAuthenticated ? "Dashboard" : "Get Started"}
              </Button>
            </Link>
            <Link to={`${DOCS_URI}`} target="_blank" rel="noreferrer">
              <Button className="c-btn-alternate ms-2">Read the Docs</Button>
            </Link>
          </Col>
          <Col>
            <img
              src={`${IMAGE_URI_PREFIX}/main.png`}
              className="rounded img-fluid"
              alt="landing"
            />
          </Col>
        </Row>
      </Container>
    </section>
  );
};

export default MainSection;
