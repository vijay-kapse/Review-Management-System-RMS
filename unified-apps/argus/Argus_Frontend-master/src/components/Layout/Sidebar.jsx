// src/components/Layout/Sidebar.jsx
import {
  Box,
  VStack,
  Icon,
  Text,
  Link,
  Flex,
  useColorModeValue,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  useBreakpointValue,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { InfoIcon, SearchIcon, AddIcon } from '@chakra-ui/icons';  // Changed HomeIcon to InfoIcon

const NavItem = ({ icon, children, path }) => {
  const location = useLocation();
  const isActive = location.pathname === path;

  return (
    <Link
      as={RouterLink}
      to={path}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
      w="full"
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? 'brand.500' : 'transparent'}
        color={isActive ? 'white' : 'gray.600'}
        _hover={{
          bg: 'brand.400',
          color: 'white',
        }}
      >
        {icon && <Icon mr="4" fontSize="16" as={icon} />}
        <Text>{children}</Text>
      </Flex>
    </Link>
  );
};

const SidebarContent = () => {
  return (
    <VStack align="stretch" mt="20" spacing="1">
      <NavItem icon={InfoIcon} path="/home">
        Home
      </NavItem>
      <NavItem icon={SearchIcon} path="/results">
        Search Results
      </NavItem>
      <NavItem icon={AddIcon} path="/upload">
        Upload
      </NavItem>
    </VStack>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const sidebarProps = {
    bg: bgColor,
    borderRight: "1px",
    borderRightColor: borderColor,
    w: "240px",
    h: "full",
  };

  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent {...sidebarProps}>
          <Box p={4}>
            <SidebarContent />
          </Box>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Box
      {...sidebarProps}
      pos="fixed"
    >
      <Box p={4}>
        <SidebarContent />
      </Box>
    </Box>
  );
};

export default Sidebar;