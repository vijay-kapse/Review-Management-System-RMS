import {
  Box,
  Container,
  VStack,
  Text,
  useToast,
  Button,
  Input,
  List,
  ListItem,
  HStack,
} from '@chakra-ui/react';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../services/api';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [clearingUploads, setClearingUploads] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const clearSelectedFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleClearUploadedFiles = async () => {
    setClearingUploads(true);
    try {
      const response = await fetch(apiUrl('/clear_uploads/'), {
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

      toast({
        title: 'Uploaded files cleared',
        description: `Removed ${data.deleted_count || 0} files from your current Argus session`,
        status: 'success',
        duration: 4000,
      });
      navigate('/home');
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
  };

  const handleUpload = async () => {
    if (!files.length) {
      toast({
        title: 'No files selected',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      const token = localStorage.getItem('token'); //
      const response = await fetch(apiUrl('/upload/'), {
        method: 'POST',
        credentials: 'include',  
        headers: {
	  'Authorization': token ? `Token ${token}` : '', //
          'X-CSRFToken': document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      if (data.valid_files && data.valid_files.length > 0) {
        toast({
          title: 'Upload Successful',
          description: `Successfully uploaded ${data.valid_files.length} files`,
          status: 'success',
          duration: 5000,
        });
        navigate('/results'); // Navigate to results after successful upload
      }

      if (data.invalid_files && data.invalid_files.length > 0) {
        toast({
          title: 'Some files were not uploaded',
          description: `Invalid files: ${data.invalid_files.map(f => f.name).join(', ')}`,
          status: 'warning',
          duration: 5000,
        });
      }

      clearSelectedFiles();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6}>
        <Box
          w="full"
          p={6}
          bg="white"
          borderRadius="lg"
          shadow="base"
        >
          <VStack spacing={4}>
            <Input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploading}
              p={1}
            />
            
            {files.length > 0 && (
              <Box w="full">
                <Text fontWeight="bold" mb={2}>Selected files:</Text>
                <List spacing={2}>
                  {files.map(file => (
                    <ListItem key={file.name} fontSize="sm" color="gray.600">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <HStack w="full" spacing={3} flexDir={{ base: 'column', md: 'row' }}>
              <Button
                colorScheme="green"
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Uploading..."
                w="full"
              >
                Upload Files
              </Button>
              <Button
                variant="outline"
                onClick={clearSelectedFiles}
                isDisabled={!files.length || uploading}
                w="full"
              >
                Clear Selected
              </Button>
            </HStack>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClearUploadedFiles}
              isLoading={clearingUploads}
              loadingText="Clearing..."
              isDisabled={uploading}
              w="full"
            >
              Clear Uploaded Files
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default UploadPage;
