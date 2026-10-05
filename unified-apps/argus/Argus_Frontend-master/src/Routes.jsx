  // src/Routes.jsx
  import { Routes, Route, Navigate } from 'react-router-dom';
  import { Center, Spinner } from '@chakra-ui/react';
  import Login from './components/Auth/Login';
  import Register from './components/Auth/Register';
  import HomePage from './components/Home/HomePage';
  import SearchResults from './components/SearchResults/SearchResults';
  import UploadPage from './components/Upload/UploadPage';
  import DocumentViewer from './components/SearchResults/DocumentViewer';
  import MergeViewer from './components/SearchResults/MergeViewer';
  import { useAuth } from './contexts/AuthContext';


  const RouteLoading = () => (
    <Center minH="100vh">
      <Spinner color="brand.500" size="xl" />
    </Center>
  );

  const PrivateRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <RouteLoading />;
    return isAuthenticated ? children : <Navigate to="/login" />;
  };

  const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <RouteLoading />;
    return !isAuthenticated ? children : <Navigate to="/home" />;
  };

  const AppRoutes = () => {
    return (
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/home" element={
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        } />
        <Route path="/results" element={
          <PrivateRoute>
            <SearchResults />
          </PrivateRoute>
        } />
        <Route path="/upload" element={
          <PrivateRoute>
            <UploadPage />
          </PrivateRoute>
        } />

        {/* Move this route before the default */}
        <Route path="/view/:id" element={
          <PrivateRoute>
            <DocumentViewer />
          </PrivateRoute>
        } />

        <Route path="/merge-view" element={
          <PrivateRoute>
            <MergeViewer />
          </PrivateRoute>
        } />

        {/* Default Routes */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    );

  };

  export default AppRoutes;
