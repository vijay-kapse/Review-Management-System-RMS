import { Box, useDisclosure } from '@chakra-ui/react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Don't show layout for auth pages
  if (['/login', '/register'].includes(location.pathname)) {
    return children;
  }

  // Show layout only for authenticated users
  if (!isAuthenticated) {
    return children;
  }

  // Don't show navbar and sidebar for view routes
  if (location.pathname.includes('/view/')) {
    return children;
  }

  return (
    <Box
      minH="100vh"
      bg="slate.50"
      backgroundImage="linear-gradient(180deg, #f8fafc 0%, #f6f8fb 42%, #eef4f8 100%)"
    >
      <Navbar onMobileMenuOpen={onOpen} />
      <Sidebar 
        isOpen={isOpen} 
        onClose={onClose}
        display={{ base: isOpen ? 'block' : 'none', md: 'block' }} 
      />
      <Box
        ml={{ base: 0, md: '264px' }}
        px={{ base: 4, md: 8 }}
        py={{ base: 4, md: 7 }}
        transition=".3s ease"
      >
        <Box pt={{ base: '76px', md: '84px' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
