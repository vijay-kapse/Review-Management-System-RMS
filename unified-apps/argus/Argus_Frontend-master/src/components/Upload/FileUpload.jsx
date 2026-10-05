import {
  Box,
  Button,
  VStack,
  Text,
  Icon,
  Progress,
} from '@chakra-ui/react';
import { useState, useRef } from 'react';
import { AddIcon } from '@chakra-ui/icons';

const FileUpload = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = [...e.dataTransfer.files];
    await handleFiles(droppedFiles);
  };

  const handleFiles = async (fileList) => {
    setFiles(fileList);
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    fileList.forEach(file => formData.append('files', file));

    try {
      const response = await fetch('/api/upload/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      onUploadSuccess();
      setFiles([]);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <VStack spacing={4}>
      <Box
        w="full"
        h="200px"
        border="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'brand.500' : 'gray.200'}
        borderRadius="xl"
        bg={isDragging ? 'brand.50' : 'transparent'}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack spacing={2}>
          <Icon as={AddIcon} w={10} h={10} color="gray.400" />
          <Text color="gray.500">
            Drag files here or click to upload
          </Text>
        </VStack>
      </Box>

      {files.length > 0 && (
        <VStack w="full" align="stretch">
          {files.map(file => (
            <Text key={file.name}>{file.name}</Text>
          ))}
        </VStack>
      )}

      {uploading && <Progress value={progress} w="full" colorScheme="brand" />}

      <Button
        colorScheme="brand"
        onClick={() => fileInputRef.current.click()}
        isLoading={uploading}
      >
        Select Files
      </Button>
      
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(Array.from(e.target.files))}
      />
    </VStack>
  );
};

export default FileUpload;