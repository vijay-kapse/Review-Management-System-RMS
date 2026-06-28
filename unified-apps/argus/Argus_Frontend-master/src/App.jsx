// src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Routes from './Routes';
import theme from './styles/theme';

const getRouterBasename = () => {
  if (typeof window === 'undefined') {
    return '/argus';
  }

  const argusSegment = `/${window.__ARGUS_ROUTE_SEGMENT__ || 'argus'}`;
  const argusIndex = window.location.pathname.indexOf(argusSegment);
  return argusIndex >= 0 ? window.location.pathname.slice(0, argusIndex + argusSegment.length) : argusSegment;
};

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router basename={getRouterBasename()}>
        <AuthProvider>
          <Layout>
            <Routes />
          </Layout>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
}

export default App;
