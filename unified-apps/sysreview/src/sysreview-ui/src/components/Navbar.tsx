import { useContext } from "react";
import { Navbar, Container, Nav, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import AppContext from "../contexts/AppContext";
import {
  APP_URI_PREFIX,
  IMAGE_URI_PREFIX,
  TUTORIAL_URI,
  UNIFIED_LOGIN_URI,
  UNIFIED_LOGOUT_URI,
} from "../constants";
import { validateToken } from "../api/utility";

const MyNavbar = () => {
  const { unsetUserDetails } = useContext(AppContext);
  const isAuthenticated = validateToken();

  const logout = () => {
    unsetUserDetails();
    window.location.assign(UNIFIED_LOGOUT_URI);
  };

  return (
    <Navbar className="c-navbar" fixed="top">
      <Container>
        <Link to={`${APP_URI_PREFIX}/dashboard`} className="navbar navbar-brand ">
          <img
            className="app-logo"
            src={`${IMAGE_URI_PREFIX}/trace-logo.svg`}
            alt="TRACE logo"
          />
        </Link>
        <Navbar.Collapse className="justify-content-end">
          <Nav className="gap-2 align-items-center">
            {isAuthenticated && (
              <>
                <Nav.Link as={Link} to={`${APP_URI_PREFIX}/dashboard`}>
                  Dashboard
                </Nav.Link>
                {/* <Nav.Link as={Link} to={`${APP_URI_PREFIX}/profile`}>
                  Profile
                </Nav.Link> */}
              </>
            )}
            <Nav.Link
              as={Link}
              to={TUTORIAL_URI}
              target="_blank"
              rel="noreferrer"
            >
              Tutorial
            </Nav.Link>
            {isAuthenticated && (
              <Button className="c-btn-negative ml-1" onClick={logout}>
                Logout
              </Button>
            )}
            {!isAuthenticated && (
              <Nav.Link href={UNIFIED_LOGIN_URI}>
                <Button className="c-btn-secondary">Sign In</Button>
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default MyNavbar;
