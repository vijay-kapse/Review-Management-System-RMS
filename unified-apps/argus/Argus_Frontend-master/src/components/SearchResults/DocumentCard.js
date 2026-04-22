//src/componnents/SearchResults/DocumentCard.js
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  useToast,
} from '@chakra-ui/react';

const DocumentCard = ({ document }) => {
  const navigate = useNavigate();
  const toast = useToast();
  // eslint-disable-next-line 
  const location = useLocation();

  const handleView = () => {
    let viewPath = `/view/${document.id}`;
    
    if (document.matches) {
        // Get all terms and join properly
        const terms = Object.keys(document.matches);
        
        // If it's a single term, send it directly
        // If multiple terms, join with |||
        const queryParam = terms.length === 1 ? 
            terms[0] : 
            terms.join('|||');
            
        viewPath += `?query=${encodeURIComponent(queryParam)}`;
        
        console.log("View URL:", viewPath);  // Debug log
    }

    navigate(viewPath, {
        state: {
            matchData: document.matches
        }
    });
};

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/fetch_document/${document.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.uploaded_file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Download started',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Box
      p={4}
      bg="white"
      borderRadius="lg"
      shadow="sm"
      borderWidth="1px"
      _hover={{ shadow: 'md' }}
    >
      <VStack align="stretch" spacing={3}>
        <Text fontWeight="semibold" noOfLines={1}>
          {document.uploaded_file_name}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {document.file_type}
        </Text>
        <Text fontSize="sm" color="gray.600">
          Size: {document.file_size_kb} KB ({document.file_size_mb} MB)
        </Text>
        <Text fontSize="sm" color="gray.600">
          Uploaded: {document.uploaded_date}
        </Text>
        {document.matches && (
          <Text fontSize="sm" color="green.600">
            Matches found: {Object.values(document.matches)
              .reduce((sum, positions) => sum + positions.length, 0)}
          </Text>
        )}
        <HStack spacing={2}>
          <Button 
            onClick={handleView} 
            colorScheme="green" 
            size="sm"
            flex="1"
          >
            View
          </Button>
          <Button 
            onClick={handleDownload} 
            colorScheme="green" 
            variant="outline"
            size="sm"
            flex="1"
          >
            Download
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default DocumentCard;