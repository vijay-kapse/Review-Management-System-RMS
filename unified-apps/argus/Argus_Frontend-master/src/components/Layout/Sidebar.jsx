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
  Divider,
  Badge,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { InfoIcon, SearchIcon, AddIcon } from '@chakra-ui/icons';

const NavItem = ({ icon, children, path, helper }) => {
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
        px="4"
        py="3"
        mx="3"
        borderRadius="8px"
        role="group"
        cursor="pointer"
        bg={isActive ? 'white' : 'transparent'}
        color={isActive ? 'slate.900' : 'slate.600'}
        border="1px solid"
        borderColor={isActive ? 'slate.200' : 'transparent'}
        boxShadow={isActive ? '0 14px 35px rgba(15, 23, 42, 0.08)' : 'none'}
        _hover={{
          bg: isActive ? 'white' : 'slate.100',
          color: 'slate.900',
        }}
      >
        {icon && (
          <Flex
            w="34px"
            h="34px"
            align="center"
            justify="center"
            borderRadius="8px"
            bg={isActive ? 'brand.100' : 'slate.100'}
            color={isActive ? 'brand.700' : 'slate.500'}
            mr="3"
            flexShrink={0}
          >
            <Icon fontSize="15px" as={icon} />
          </Flex>
        )}
        <Box minW={0}>
          <Text fontWeight="800" noOfLines={1}>{children}</Text>
          {helper && (
            <Text fontSize="xs" color={isActive ? 'slate.500' : 'slate.400'} noOfLines={1}>
              {helper}
            </Text>
          )}
        </Box>
      </Flex>
    </Link>
  );
};

const SidebarContent = () => {
  return (
    <VStack align="stretch" mt="24" spacing="2">
      <Box px="6" pb="2">
        <Badge colorScheme="green" variant="subtle" borderRadius="full" px="3" py="1">
          Workspace
        </Badge>
      </Box>
      <NavItem icon={InfoIcon} path="/home" helper="Session overview">
        Home
      </NavItem>
      <NavItem icon={SearchIcon} path="/results" helper="Find evidence">
        Search Results
      </NavItem>
      <NavItem icon={AddIcon} path="/upload" helper="Add files">
        Upload
      </NavItem>
      <Divider borderColor="slate.200" my="4" />
      <Box px="6">
        <Text fontSize="xs" color="slate.500" lineHeight="1.6">
          Review papers and images in one current session.
        </Text>
      </Box>
    </VStack>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue('rgba(255,255,255,0.82)', 'gray.800');
  const borderColor = useColorModeValue('slate.200', 'gray.700');

  const sidebarProps = {
    bg: bgColor,
    borderRight: "1px",
    borderRightColor: borderColor,
    w: "264px",
    h: "full",
    backdropFilter: "blur(18px)",
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
