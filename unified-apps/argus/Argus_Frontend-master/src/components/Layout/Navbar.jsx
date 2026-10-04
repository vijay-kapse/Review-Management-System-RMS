import {
    Box,
    Flex,
    IconButton,
    useColorModeValue,
    Text,
    HStack,
    Image,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
  } from '@chakra-ui/react';
  import { HamburgerIcon, ChevronDownIcon } from '@chakra-ui/icons';
  import { useAuth } from '../../contexts/AuthContext'
  import { useNavigate } from 'react-router-dom';
  
  const Navbar = ({ onOpen }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
  
    const handleLogout = async () => {
      await logout();
      navigate('/login');
    };
  
    return (
      <Box
        bg={useColorModeValue('white', 'gray.900')}
        px={4}
        position="fixed"
        w="full"
        boxShadow="sm"
      >
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            variant="outline"
            aria-label="open menu"
            icon={<HamburgerIcon />}
          />
  
          {/* Mark + name + full name, matching the TRACE, QUEST and SPARK headers */}
          <HStack spacing={3} minW={0}>
            <Image
              src={`${process.env.PUBLIC_URL}/argus-mark.svg`}
              alt=""
              boxSize="42px"
              borderRadius="11px"
              boxShadow="0 10px 22px rgba(109, 40, 217, 0.18)"
              flexShrink={0}
            />
            <Box minW={0} lineHeight="1">
              <Text fontSize="xl" fontWeight="800" color="#0f172a" lineHeight="1">
                ARGUS
              </Text>
              <Text
                display={{ base: 'none', lg: 'block' }}
                fontSize="xs"
                fontWeight="600"
                color="#475569"
                mt="3px"
              >
                Assisted Reading and Guided Understanding through Search
              </Text>
            </Box>
          </HStack>
  
          <HStack spacing={4}>
            <Button
              as="a"
              href="/rms/apps"
              variant="outline"
              borderRadius="full"
              borderColor="blue.200"
              bg="blue.50"
              color="blue.700"
              _hover={{ bg: 'blue.100', textDecoration: 'none' }}
              size="sm"
              fontWeight="700"
            >
              Back to RMS
            </Button>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                variant="ghost"
              >
                {user?.username}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </Flex>
      </Box>
    );
  };

  export default Navbar;
