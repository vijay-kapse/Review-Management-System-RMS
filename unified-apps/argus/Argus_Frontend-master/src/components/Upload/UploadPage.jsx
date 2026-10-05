import {
  Box,
  Container,
  VStack,
  Text,
  useToast,
  Button,
  Input,
  HStack,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Badge,
  Divider,
  Progress,
} from '@chakra-ui/react';
import { AddIcon, AttachmentIcon, CheckCircleIcon, CloseIcon } from '@chakra-ui/icons';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const getFileKind = (file) => {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'Image';
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word';
  if (name.endsWith('.txt')) return 'Text';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'HTML';
  return 'Document';
};

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    setFiles(droppedFiles);
  };

  const clearSelected = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

      const response = await fetch('/api/upload/', {
        method: 'POST',
        credentials: 'include',  
        headers: {
          'X-CSRFToken': document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || '',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const validFiles = data.valid_files || [];
      const invalidFiles = data.invalid_files || [];

      if (validFiles.length > 0) {
        toast({
          title: 'Upload Successful',
          description: `Successfully uploaded ${validFiles.length} files`,
          status: 'success',
          duration: 5000,
        });
        navigate('/results');
      }

      if (invalidFiles.length > 0) {
        toast({
          title: 'Some files were not uploaded',
          description: `Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`,
          status: 'warning',
          duration: 5000,
        });
      }

      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <Container maxW="7xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={{ base: 5, md: 7 }} align="stretch">
        <Flex
          justify="space-between"
          align={{ base: 'stretch', lg: 'end' }}
          flexDir={{ base: 'column', lg: 'row' }}
          gap={5}
        >
          <Box>
            <Text fontSize="sm" color="brand.700" fontWeight="900" letterSpacing="0">
              UPLOAD
            </Text>
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} color="slate.900" mt="2">
              Add files to ARGUS
            </Heading>
            <Text color="slate.600" mt="3" maxW="720px" lineHeight="1.7">
              Upload research papers, text documents, and images into the active review session.
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 2, md: 2 }} spacing={3} minW={{ lg: '320px' }}>
            <Box bg="white" border="1px solid" borderColor="slate.200" borderRadius="8px" p="4">
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Selected
              </Text>
              <Text fontSize="2xl" fontWeight="900" color="slate.900">{files.length}</Text>
            </Box>
            <Box bg="white" border="1px solid" borderColor="slate.200" borderRadius="8px" p="4">
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Total size
              </Text>
              <Text fontSize="2xl" fontWeight="900" color="accent.700">{formatFileSize(totalSize)}</Text>
            </Box>
          </SimpleGrid>
        </Flex>

        <Box
          w="full"
          bg="white"
          borderRadius="8px"
          border="1px solid"
          borderColor="slate.200"
          boxShadow="0 20px 55px rgba(15, 23, 42, 0.06)"
          overflow="hidden"
        >
          <VStack spacing={0} align="stretch">
            <Box p={{ base: 4, md: 5 }}>
              <Box
                border="1px dashed"
                borderColor={isDragging ? 'brand.400' : 'slate.300'}
                bg={isDragging ? 'brand.50' : 'slate.50'}
                borderRadius="8px"
                minH={{ base: '220px', md: '260px' }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                px={{ base: 5, md: 8 }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <VStack spacing={4}>
                  <Flex
                    w="64px"
                    h="64px"
                    align="center"
                    justify="center"
                    borderRadius="8px"
                    bg="white"
                    color="brand.700"
                    border="1px solid"
                    borderColor="brand.100"
                    boxShadow="0 16px 40px rgba(15, 23, 42, 0.08)"
                  >
                    <Icon as={AddIcon} boxSize={7} />
                  </Flex>
                  <Box>
                    <Heading size="md" color="slate.900">
                      Drop files here
                    </Heading>
                    <Text color="slate.500" mt="2">
                      PDFs, Word documents, text files, HTML, and images are supported.
                    </Text>
                  </Box>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} isDisabled={uploading}>
                    Choose Files
                  </Button>
                </VStack>
              </Box>
            </Box>

            <Input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploading}
              display="none"
            />

            {files.length > 0 && (
              <Box px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
                <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} gap={3} flexDir={{ base: 'column', md: 'row' }} mb="4">
                  <HStack>
                    <Icon as={CheckCircleIcon} color="brand.600" />
                    <Text fontWeight="900" color="slate.900">Selected files</Text>
                  </HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<CloseIcon />}
                    onClick={clearSelected}
                    isDisabled={uploading}
                  >
                    Clear Selected
                  </Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                  {files.map((file) => (
                    <Flex
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      border="1px solid"
                      borderColor="slate.200"
                      borderRadius="8px"
                      p="4"
                      align="center"
                      gap="3"
                      minW={0}
                    >
                      <Flex
                        w="42px"
                        h="42px"
                        align="center"
                        justify="center"
                        borderRadius="8px"
                        bg="slate.100"
                        color="slate.700"
                        flexShrink={0}
                      >
                        <Icon as={AttachmentIcon} />
                      </Flex>
                      <Box minW={0}>
                        <Text fontWeight="800" color="slate.900" noOfLines={1}>
                          {file.name}
                        </Text>
                        <HStack spacing={2} mt="1">
                          <Badge colorScheme={file.type.startsWith('image/') ? 'blue' : 'green'} borderRadius="full">
                            {getFileKind(file)}
                          </Badge>
                          <Text fontSize="sm" color="slate.500">
                            {formatFileSize(file.size)}
                          </Text>
                        </HStack>
                      </Box>
                    </Flex>
                  ))}
                </SimpleGrid>
              </Box>
            )}

            {uploading && (
              <Box px={{ base: 4, md: 5 }} pb="4">
                <Progress isIndeterminate colorScheme="green" borderRadius="full" />
              </Box>
            )}

            <Divider borderColor="slate.200" />
            <Flex p={{ base: 4, md: 5 }} gap={3} flexDir={{ base: 'column', md: 'row' }}>
              <Button
                onClick={handleUpload}
                isLoading={uploading}
                loadingText="Uploading..."
                isDisabled={!files.length}
                flex="1"
              >
                Upload Files
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/home')}
                flex="1"
              >
                Back to Home
              </Button>
            </Flex>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default UploadPage;
