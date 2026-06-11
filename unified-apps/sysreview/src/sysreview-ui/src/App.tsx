import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashbaord from "./pages/Dashboard";
import Project from "./pages/Project";
import NoPage from "./pages/NoPage";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Curate from "./pages/Curate";
import { ProjectContextProvider } from "./contexts/ProjectContext";
import { AppContextProvider } from "./contexts/AppContext";
import MyNavbar from "./components/Navbar";
import Protected from "./pages/Protected";
import { APP_NAME, APP_URI_PREFIX } from "./constants";
import { validateToken } from "./api/utility";
import Footer from "./components/Footer";

const App = () => {
  const isAuthenticated = validateToken();
  return (
    <AppContextProvider>
      <div className="App">
        <BrowserRouter>
          <MyNavbar />
          <div className="pages-wrapper">
            <Routes>
              <Route
                path={`/${APP_NAME}`}
                element={<Navigate to={`${APP_URI_PREFIX}/dashboard`} replace />}
              />
              <Route path={`${APP_URI_PREFIX}/`}>
                <Route path={""} element={<Navigate to="dashboard" />} />
                <Route
                  path={"dashboard"}
                  element={
                    <Protected loggedIn={isAuthenticated}>
                      <Dashbaord />
                    </Protected>
                  }
                />
                <Route
                  path="project"
                  element={
                    <Protected loggedIn={isAuthenticated}>
                      <ProjectContextProvider>
                        <Project />
                      </ProjectContextProvider>
                    </Protected>
                  }
                />
                <Route
                  path="query"
                  element={
                    <Protected loggedIn={isAuthenticated}>
                      <Curate />
                    </Protected>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <Protected loggedIn={isAuthenticated}>
                      <Profile />
                    </Protected>
                  }
                />
                <Route path={`auth`} element={<Auth />} />
              </Route>
              <Route path="*" element={<NoPage />} />
            </Routes>
          </div>
          <Footer />
        </BrowserRouter>
      </div>
    </AppContextProvider>
  );
};

export default App;
