import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Box,
} from '@chakra-ui/react';

const ErrorAlert = ({ title, message, onClose }) => {
  return (
    <Box w="full" p={4}>
      <Alert status="error" variant="left-accent" borderRadius="md">
        <AlertIcon />
        <Box flex="1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription display="block">
            {message}
          </AlertDescription>
        </Box>
        {onClose && (
          <CloseButton
            alignSelf="flex-start"
            position="relative"
            right={-1}
            top={-1}
            onClick={onClose}
          />
        )}
      </Alert>
    </Box>
  );
};

export default ErrorAlert;