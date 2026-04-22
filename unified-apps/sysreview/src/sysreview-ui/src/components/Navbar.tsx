import { useContext } from "react";
import { Navbar, Container, Nav, Button } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import AppContext from "../contexts/AppContext";
import {
  APP_NAME,
  APP_URI_PREFIX,
  IMAGE_URI_PREFIX,
  TUTORIAL_URI,
} from "../constants";
import { validateToken } from "../api/utility";

const MyNavbar = () => {
  const { unsetUserDetails } = useContext(AppContext);
  const isAuthenticated = validateToken();
  const navigate = useNavigate();

  const logout = () => {
    unsetUserDetails();
    navigate(`/${APP_NAME}`);
  };

  return (
    <Navbar className="c-navbar" fixed="top">
      <Container>
        <Link to={`/${APP_NAME}`} className="navbar navbar-brand ">
          <img src={`${IMAGE_URI_PREFIX}/logo.png`} alt="logo" />
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
              <Nav.Link as={Link} to={`${APP_URI_PREFIX}/auth`}>
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
