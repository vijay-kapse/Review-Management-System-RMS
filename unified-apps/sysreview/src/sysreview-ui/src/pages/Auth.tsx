import { Button, Col, Container, Row } from "react-bootstrap";
import { IMAGE_URI_PREFIX } from "../constants";

const Auth = () => {
  return (
    <div className="auth-page">
      <Container className="auth-wrapper rounded-5 shadow-lg">
        <Row>
          <Col>
            <img
              src={`${IMAGE_URI_PREFIX}/auth.png`}
              className="w-100 rounded p-4"
              alt="landing"
            />
          </Col>
          <Col className="d-flex justify-content-center align-items-center">
            <div className="p-4 d-flex flex-column gap-3 align-items-start">
              <h2>Unified Login for Sysreview</h2>
              <p>
                Sysreview is being converged into the shared platform login experience.
                Use the unified portal as the central entry point, then return here with a shared identity flow.
              </p>
              <Button
                className="c-btn-secondary py-2 px-4"
                href="/unified-login.html?app=sysreview"
              >
                Continue to Unified Login
              </Button>
              <p className="mb-0 text-muted">
                The local username/password form is being phased out in the copied integration workspace in favor of a shared login entry.
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Auth;
