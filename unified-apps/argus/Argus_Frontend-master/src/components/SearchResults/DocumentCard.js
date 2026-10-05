import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  useToast,
  Flex,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { AttachmentIcon, DownloadIcon, ViewIcon } from '@chakra-ui/icons';

const DocumentCard = ({ document }) => {
  const navigate = useNavigate();
  const toast = useToast();

  const fileName = document.uploaded_file_name || document.name || 'Untitled document';
  const fileType = document.file_type || 'Uploaded file';
  const matchCount = document.matches
    ? Object.values(document.matches).reduce((sum, positions) => sum + positions.length, 0)
    : 0;

  const handleView = () => {
    let viewPath = `/view/${document.id}`;
    
    if (document.matches) {
      const terms = Object.keys(document.matches);
      const queryParam = terms.length === 1 ? terms[0] : terms.join('|||');
            
      viewPath += `?query=${encodeURIComponent(queryParam)}`;
    }

    navigate(viewPath, {
      state: {
        matchData: document.matches,
        fileName,
        fileType
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
      const a = window.document.createElement('a');
      a.href = url;
      a.download = fileName;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
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
      bg="white"
      borderRadius="8px"
      boxShadow="0 14px 35px rgba(15, 23, 42, 0.05)"
      borderWidth="1px"
      borderColor="slate.200"
      overflow="hidden"
      transition="transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease"
      _hover={{
        transform: 'translateY(-2px)',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.09)',
        borderColor: 'brand.200',
      }}
    >
      <VStack align="stretch" spacing={0}>
        <Flex p="4" align="start" gap="3">
          <Flex
            w="44px"
            h="44px"
            align="center"
            justify="center"
            borderRadius="8px"
            bg={fileType.startsWith('image/') ? 'accent.50' : 'brand.50'}
            color={fileType.startsWith('image/') ? 'accent.700' : 'brand.700'}
            border="1px solid"
            borderColor={fileType.startsWith('image/') ? 'accent.100' : 'brand.100'}
            flexShrink={0}
          >
            <Icon as={AttachmentIcon} />
          </Flex>
          <Box minW={0} flex="1">
            <Text fontWeight="900" color="slate.900" noOfLines={2} lineHeight="1.25">
              {fileName}
            </Text>
            <HStack spacing={2} wrap="wrap" mt="2">
              <Badge colorScheme={fileType.startsWith('image/') ? 'blue' : 'green'} borderRadius="full">
                {fileType}
              </Badge>
              {matchCount > 0 && (
                <Badge colorScheme="purple" borderRadius="full">
                  {matchCount} match{matchCount === 1 ? '' : 'es'}
                </Badge>
              )}
            </HStack>
          </Box>
        </Flex>

        <Divider borderColor="slate.200" />

        <Box px="4" py="3" bg="slate.50">
          <HStack spacing={4} align="start">
            <Box>
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Size
              </Text>
              <Text fontSize="sm" color="slate.700" fontWeight="700">
                {document.file_size_mb || '0'} MB
              </Text>
            </Box>
            <Box minW={0}>
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Uploaded
              </Text>
              <Text fontSize="sm" color="slate.700" fontWeight="700" noOfLines={1}>
                {document.uploaded_date || 'Current session'}
              </Text>
            </Box>
          </HStack>
        </Box>

        <HStack spacing={2} p="4">
          <Button 
            onClick={handleView} 
            leftIcon={<ViewIcon />}
            size="sm"
            flex="1"
          >
            View
          </Button>
          <Button 
            onClick={handleDownload} 
            leftIcon={<DownloadIcon />}
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
