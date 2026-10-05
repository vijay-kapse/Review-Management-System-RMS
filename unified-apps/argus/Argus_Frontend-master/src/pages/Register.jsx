// src/pages/Register.jsx
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Stack,
    Text,
    useToast,
    Link,
    Heading
  } from '@chakra-ui/react';
  import { useState } from 'react';
  import { Link as RouterLink } from 'react-router-dom';
  
  const Register = () => {
    const [formData, setFormData] = useState({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsLoading(true);
  
      try {
        const response = await fetch('/api/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
  
        if (response.ok) {
          toast({
            title: 'Account created.',
            description: "We've created your account for you.",
            status: 'success',
            duration: 5000,
            isClosable: true,
          });
          // Redirect to login
        } else {
          const data = await response.json();
          throw new Error(data.message || 'Registration failed');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleChange = (e) => {
      setFormData(prev => ({
        ...prev,
        [e.target.name]: e.target.value
      }));
    };
  
    return (
      <Box bg="white" p={8} borderRadius="lg" boxShadow="lg">
        <Stack spacing={4}>
          <Heading size="lg">Create an Account</Heading>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </FormControl>
  
              <FormControl isRequired>
                <FormLabel>First Name</FormLabel>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
              </FormControl>
  
              <FormControl isRequired>
                <FormLabel>Last Name</FormLabel>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
              </FormControl>
  
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </FormControl>
  
              <FormControl isRequired>
                <FormLabel>Confirm Password</FormLabel>
                <Input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </FormControl>
  
              <Button
                type="submit"
                colorScheme="green"
                size="lg"
                fontSize="md"
                isLoading={isLoading}
              >
                Register
              </Button>
            </Stack>
          </form>
  
          <Text textAlign="center">
            Already have an account?{" "}
            <Link as={RouterLink} to="/login" color="green.500">
              Login
            </Link>
          </Text>
        </Stack>
      </Box>
    );
  };
  
  export default Register;