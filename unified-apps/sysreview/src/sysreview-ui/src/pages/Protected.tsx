import { Navigate } from "react-router-dom";
import { validateToken } from "../api/utility";
import { APP_URI_PREFIX } from "../constants";

const Protected = ({ children, loggedIn }) => {
  if (!validateToken()) {
    return <Navigate to={`${APP_URI_PREFIX}/auth`} replace />;
  }
  return <>{children}</>;
};

export default Protected;
