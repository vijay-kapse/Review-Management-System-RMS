import { useToast } from '@chakra-ui/react';

export const useCustomToast = () => {
  const toast = useToast();
  
  return {
    showToast: ({ title, description, status = 'info' }) => {
      toast({
        title,
        description,
        status,
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    }
  };
};