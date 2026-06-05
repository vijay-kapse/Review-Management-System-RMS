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

  const argusIndex = window.location.pathname.indexOf('/argus');
  return argusIndex >= 0 ? window.location.pathname.slice(0, argusIndex + '/argus'.length) : '/argus';
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
