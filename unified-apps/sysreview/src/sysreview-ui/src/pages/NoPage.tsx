import { Button, Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { APP_URI_PREFIX } from "../constants";

const NoPage = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate(`${APP_URI_PREFIX}/`);
  };

  return (
    <div className="no-page">
      <Container>
        <h4 className="c-text-primary">404 : Page Not Found</h4>
        <Button className="c-btn-primary-o" onClick={goHome}>
          {" "}
          Back to home
        </Button>
      </Container>
    </div>
  );
};

export default NoPage;
