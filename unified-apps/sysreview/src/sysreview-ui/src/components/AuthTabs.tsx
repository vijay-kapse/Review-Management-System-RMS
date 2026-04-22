import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import AppContext from "../contexts/AppContext";
import { APP_URI_PREFIX } from "../constants";
import { getUserFromToken, validateToken } from "../api/utility";

const AuthTabs = () => {
  const [loggingIn, setLogginIn] = useState(true);
  const { setUser } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = validateToken();
    if (isAuthenticated) navigate(`${APP_URI_PREFIX}/dashboard`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTab = () => {
    setLogginIn(!loggingIn);
  };

  const onSuccess = () => {
    console.log("success");
    const user = getUserFromToken();
    console.log("setting user:", user);
    setUser(user);
    navigate(`${APP_URI_PREFIX}/`, { replace: true });
    return;
  };

  return (
    <div className="auth-tabs">
      {loggingIn ? (
        <LoginForm toggleTab={toggleTab} success={onSuccess} />
      ) : (
        <RegisterForm toggleTab={toggleTab} success={onSuccess} />
      )}
    </div>
  );
};

export default AuthTabs;
