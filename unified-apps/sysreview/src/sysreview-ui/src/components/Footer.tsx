import { Col, Container, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  APP_NAME,
  AUTHORS_URI,
  DOCS_URI,
  IMAGE_URI_PREFIX,
} from "../constants";
import { BiCopyright } from "react-icons/bi";

const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="d-flex align-items-center">
          <Col sm={2}>
            <Link to={`/${APP_NAME}`} className="logo">
              <img
                className="app-logo"
                src={`${IMAGE_URI_PREFIX}/trace-logo.svg`}
                alt="TRACE logo"
              />
            </Link>
          </Col>
          <Col>
            <div className="footer-links">
              <Link to={`${DOCS_URI}`} target="_blank" rel="noreferrer">
                Documentation
              </Link>
              <Link to={`${AUTHORS_URI}`} target="_blank" rel="noreferrer">
                Authors
              </Link>
            </div>
          </Col>
          <Col sm={4} className="text-end">
            <p className="mb-0">
              <BiCopyright className="mb-1 " size={"24px"} />
              {"  "} Binghamton University. All Rights Reserved.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
