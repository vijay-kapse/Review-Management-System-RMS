import { useToast as useChakraToast } from '@chakra-ui/react';

export const useToast = () => {
  const toast = useChakraToast();

  const showToast = ({
    title,
    description,
    status = 'info',
    duration = 5000,
    isClosable = true,
  }) => {
    console.log('Toast triggered');
    toast({
      title,
      description,
      status,
      duration,
      isClosable,
      position: 'top-right',
    });
  };

  return showToast;
};