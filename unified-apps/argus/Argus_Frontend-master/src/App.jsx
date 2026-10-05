// src/App.jsx
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Routes from './Routes';
import theme from './styles/theme';
import { getAppBasename } from './utils/appBase';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router basename={getAppBasename()}>
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
