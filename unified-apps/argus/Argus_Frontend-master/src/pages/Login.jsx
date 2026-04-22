// src/pages/Login.jsx
import {
    Box,
    Button,
    FormControl,
    FormLabel,
    Input,
    Stack,
    Text,
    Link,
    Heading,
    FormErrorMessage,
    useToast,
  } from '@chakra-ui/react';
  import { useState } from 'react';
  import { Link as RouterLink } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  
  const Login = () => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
    });
    const [errors, setErrors] = useState({});
    const { login, loading } = useAuth();
    const toast = useToast();
  
    const validateForm = () => {
      const newErrors = {};
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;
  
      try {
        await login(formData.email, formData.password);
      } catch (error) {
        // Error is handled by auth context
        console.error('Login error:', error);
      }
    };
  
    const handleChange = (e) => {
      setFormData(prev => ({
        ...prev,
        [e.target.name]: e.target.value
      }));
      // Clear error when user starts typing
      if (errors[e.target.name]) {
        setErrors(prev => ({
          ...prev,
          [e.target.name]: ''
        }));
      }
    };
  
    return (
      <Box bg="white" p={8} borderRadius="lg" boxShadow="lg">
        <Stack spacing={4}>
          <Heading size="lg">Welcome Back</Heading>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>Email</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <FormErrorMessage>{errors.email}</FormErrorMessage>
              </FormControl>
  
              <FormControl isInvalid={!!errors.password}>
                <FormLabel>Password</FormLabel>
                <Input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <FormErrorMessage>{errors.password}</FormErrorMessage>
              </FormControl>
  
              <Button
                type="submit"
                colorScheme="green"
                size="lg"
                fontSize="md"
                isLoading={loading}
                loadingText="Logging in..."
              >
                Login
              </Button>
            </Stack>
          </form>
  
          <Text textAlign="center">
            Don't have an account?{" "}
            <Link as={RouterLink} to="/register" color="green.500">
              Register
            </Link>
          </Text>
        </Stack>
      </Box>
    );
  };
  
  export default Login;