import {
  Box,
  Container,
  VStack,
  Text,
  SimpleGrid,
  Button,
  useToast,
  HStack,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentCard from '../SearchResults/DocumentCard';

import { useCallback } from 'react';



const HomePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearingUploads, setClearingUploads] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchSessionDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/results/', {
        credentials: 'include', // Add this line
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
  
      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: 'Error fetching documents',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Add 'toast' because it comes from a hook and could change.
  
  useEffect(() => {
    fetchSessionDocuments();
  }, [fetchSessionDocuments]);

  const handleClearUploadedFiles = useCallback(async () => {
    if (!documents.length) {
      toast({
        title: 'No uploaded files to clear',
        status: 'info',
        duration: 3000,
      });
      return;
    }

    setClearingUploads(true);
    try {
      const response = await fetch('/api/clear_uploads/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || '',
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to clear uploaded files');
      }

      setDocuments([]);
      toast({
        title: 'Uploaded files cleared',
        description: `Removed ${data.deleted_count || 0} files from your current Argus session`,
        status: 'success',
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: 'Failed to clear uploaded files',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setClearingUploads(false);
    }
  }, [documents.length, toast]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align={{ base: 'stretch', md: 'center' }} flexDir={{ base: 'column', md: 'row' }} spacing={4}>
          <Text fontSize="2xl" fontWeight="bold" color="green.700">
            Current Session Documents
          </Text>
          <HStack spacing={3} w={{ base: 'full', md: 'auto' }}>
            <Button colorScheme="green" onClick={() => navigate('/upload')} w={{ base: 'full', md: 'auto' }}>
              Upload Documents
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClearUploadedFiles}
              isLoading={clearingUploads}
              loadingText="Clearing..."
              isDisabled={loading || !documents.length}
              w={{ base: 'full', md: 'auto' }}
            >
              Clear Uploaded Files
            </Button>
          </HStack>
        </HStack>

        {loading ? (
          <Text>Loading documents...</Text>
        ) : documents.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py={10}>
            <Text mb={4}>No documents uploaded in this session</Text>
            <Button
              colorScheme="green"
              onClick={() => navigate('/upload')}
            >
              Upload Documents
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default HomePage;