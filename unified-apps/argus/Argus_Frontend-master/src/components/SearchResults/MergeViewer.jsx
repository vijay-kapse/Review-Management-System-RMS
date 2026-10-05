import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  HStack,
  Heading,
  IconButton,
  Select,
  Spinner,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FileViewer } from './DocumentViewer';

const HIGHLIGHT_COLORS = [
  { bg: '#FFD700', border: '#B8860B', name: 'yellow' },
  { bg: '#4169E1', border: '#0000CD', name: 'blue' },
  { bg: '#32CD32', border: '#228B22', name: 'green' },
  { bg: '#FF69B4', border: '#DB7093', name: 'pink' },
  { bg: '#9370DB', border: '#6A5ACD', name: 'purple' },
  { bg: '#FFA500', border: '#FF8C00', name: 'orange' },
  { bg: '#00CED1', border: '#008B8B', name: 'cyan' },
  { bg: '#20B2AA', border: '#008080', name: 'teal' },
  { bg: '#FF6347', border: '#FF4500', name: 'red' },
  { bg: '#98FB98', border: '#3CB371', name: 'lime' },
];

const getDocumentName = (document) => (
  document?.uploaded_file_name
  || document?.filename
  || document?.name
  || `Document ${document?.id || ''}`.trim()
);

const countMatches = (document, term) => {
  const positions = document?.matches?.[term];
  return Array.isArray(positions) ? positions.length : 0;
};

const buildDocumentUrl = (documentId, activeTerms) => {
  let url = `/api/view/${documentId}/`;
  if (!activeTerms.length) return url;

  const query = encodeURIComponent(activeTerms.join('|||'));
  const colors = encodeURIComponent(
    activeTerms.map((_, index) => HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length].name).join(','),
  );
  return `${url}?query=${query}&colors=${colors}`;
};

const EmptyMergeState = ({ onBack }) => (
  <Center h="100vh" bg="slate.100">
    <Box
      bg="white"
      border="1px solid"
      borderColor="slate.200"
      borderRadius="8px"
      p={{ base: 6, md: 8 }}
      textAlign="center"
      maxW="520px"
    >
      <Heading size="md" color="slate.900">No documents to merge</Heading>
      <Text mt={2} color="slate.600">
        Run a search first, then open Merge View from the search results panel.
      </Text>
      <Button mt={5} leftIcon={<ArrowBackIcon />} onClick={onBack}>
        Back to Search Results
      </Button>
    </Box>
  </Center>
);

const MergeViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const mergeData = location.state?.mergeData || {};
  const documents = useMemo(() => mergeData.documents || [], [mergeData.documents]);
  const searchTerms = useMemo(() => mergeData.searchTerms || [], [mergeData.searchTerms]);

  const [activeDocumentIds, setActiveDocumentIds] = useState(() => documents.map((document) => document.id));
  const [currentDocumentId, setCurrentDocumentId] = useState(() => documents[0]?.id || null);
  const [activeTerms, setActiveTerms] = useState(searchTerms);
  const [documentPayloads, setDocumentPayloads] = useState({});
  const payloadsRef = useRef({});

  useEffect(() => {
    payloadsRef.current = documentPayloads;
  }, [documentPayloads]);

  useEffect(() => () => {
    Object.values(payloadsRef.current).forEach((payload) => {
      if (payload?.url) URL.revokeObjectURL(payload.url);
    });
  }, []);

  const activeDocuments = useMemo(
    () => documents.filter((document) => activeDocumentIds.includes(document.id)),
    [activeDocumentIds, documents],
  );

  const currentDocument = useMemo(
    () => documents.find((document) => document.id === currentDocumentId) || null,
    [currentDocumentId, documents],
  );

  const currentActiveIndex = activeDocuments.findIndex((document) => document.id === currentDocumentId);

  const aggregateMatches = useMemo(() => (
    searchTerms.reduce((acc, term) => {
      acc[term] = documents.reduce((sum, document) => sum + countMatches(document, term), 0);
      return acc;
    }, {})
  ), [documents, searchTerms]);

  const loadDocument = useCallback(async (documentId, terms) => {
    setDocumentPayloads((previous) => ({
      ...previous,
      [documentId]: {
        ...previous[documentId],
        loading: true,
        error: '',
      },
    }));

    try {
      const response = await fetch(buildDocumentUrl(documentId, terms), {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: '*/*',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const fileType = response.headers.get('content-type') || '';

      setDocumentPayloads((previous) => {
        if (previous[documentId]?.url) URL.revokeObjectURL(previous[documentId].url);
        return {
          ...previous,
          [documentId]: {
            blob,
            error: '',
            fileType,
            loading: false,
            url,
          },
        };
      });
    } catch (error) {
      setDocumentPayloads((previous) => ({
        ...previous,
        [documentId]: {
          ...previous[documentId],
          error: error.message || 'Unable to load this document.',
          loading: false,
        },
      }));
      toast({
        title: 'Document failed to load',
        description: error.message,
        status: 'error',
        duration: 3500,
      });
    }
  }, [toast]);

  useEffect(() => {
    activeDocuments.forEach((document) => {
      loadDocument(document.id, activeTerms);
    });
  }, [activeDocuments, activeTerms, loadDocument]);

  const toggleDocument = (documentId) => {
    setActiveDocumentIds((previous) => {
      const next = previous.includes(documentId)
        ? previous.filter((id) => id !== documentId)
        : [...previous, documentId];

      if (!next.includes(currentDocumentId)) {
        setCurrentDocumentId(next[0] || null);
      }

      return next;
    });
  };

  const toggleTerm = (term) => {
    setActiveTerms((previous) => (
      previous.includes(term)
        ? previous.filter((activeTerm) => activeTerm !== term)
        : [...previous, term]
    ));
  };

  const navigateDocument = (direction) => {
    if (!activeDocuments.length) return;
    const nextIndex = direction === 'next'
      ? Math.min(currentActiveIndex + 1, activeDocuments.length - 1)
      : Math.max(currentActiveIndex - 1, 0);
    setCurrentDocumentId(activeDocuments[nextIndex]?.id || null);
  };

  if (!documents.length) {
    return <EmptyMergeState onBack={() => navigate('/results')} />;
  }

  const currentPayload = currentDocumentId ? documentPayloads[currentDocumentId] : null;

  return (
    <Box h="100vh" overflow="hidden" bg="slate.100">
      <HStack spacing={0} align="stretch" w="100%" h="100%">
        <Box flex="1" minW={0} h="100%">
          <HStack
            h="70px"
            px={4}
            bg="slate.900"
            color="white"
            borderBottom="1px solid"
            borderColor="slate.700"
            spacing={4}
          >
            <IconButton
              icon={<ArrowBackIcon />}
              onClick={() => navigate('/results')}
              aria-label="Go back"
              size="lg"
              rounded="full"
              shadow="md"
              colorScheme="green"
            />
            <Box minW={0} flex="1">
              <Text fontSize="xs" fontWeight="900" color="green.200" textTransform="uppercase" letterSpacing="0">
                ARGUS merged view
              </Text>
              <Text fontWeight="900" fontSize="lg" noOfLines={1}>
                {currentDocument ? getDocumentName(currentDocument) : 'Select a document'}
              </Text>
            </Box>
            <Badge borderRadius="full" colorScheme="green" px={3} py={1}>
              {activeDocuments.length} active
            </Badge>
          </HStack>

          <Box h="calc(100vh - 70px)" position="relative">
            <Box
              position="absolute"
              top={4}
              right={4}
              zIndex={5}
              bg="white"
              border="1px solid"
              borderColor="slate.200"
              borderRadius="8px"
              boxShadow="0 18px 45px rgba(15, 23, 42, 0.16)"
              p={3}
              minW={{ base: '220px', md: '310px' }}
            >
              <HStack spacing={2} align="center">
                <Button
                  size="sm"
                  leftIcon={<ChevronLeftIcon />}
                  onClick={() => navigateDocument('prev')}
                  isDisabled={currentActiveIndex <= 0}
                  variant="outline"
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  rightIcon={<ChevronRightIcon />}
                  onClick={() => navigateDocument('next')}
                  isDisabled={currentActiveIndex < 0 || currentActiveIndex >= activeDocuments.length - 1}
                  variant="outline"
                >
                  Next
                </Button>
                <Select
                  size="sm"
                  value={currentDocumentId || ''}
                  onChange={(event) => setCurrentDocumentId(Number(event.target.value))}
                >
                  {activeDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {getDocumentName(document)}
                    </option>
                  ))}
                </Select>
              </HStack>
            </Box>

            {!currentDocument ? (
              <Center h="full">
                <Box p={5} bg="white" borderRadius="8px" border="1px solid" borderColor="slate.200">
                  <Text fontWeight="900" color="slate.900">No active document selected</Text>
                  <Text mt={1} fontSize="sm" color="slate.600">Select at least one document from the panel.</Text>
                </Box>
              </Center>
            ) : currentPayload?.error ? (
              <Center h="full">
                <Box p={5} bg="white" borderRadius="8px" border="1px solid" borderColor="slate.200">
                  <Text fontWeight="900" color="slate.900">Document could not be loaded</Text>
                  <Text mt={1} fontSize="sm" color="slate.600">{currentPayload.error}</Text>
                </Box>
              </Center>
            ) : currentPayload?.loading && !currentPayload?.blob ? (
              <Center h="full" bg="slate.100">
                <VStack spacing={3}>
                  <Spinner color="brand.500" size="xl" thickness="4px" />
                  <Text fontSize="sm" color="slate.600" fontWeight="700">Loading merged preview...</Text>
                </VStack>
              </Center>
            ) : (
              <FileViewer
                fileType={currentPayload?.fileType}
                url={currentPayload?.url}
                blob={currentPayload?.blob}
              />
            )}
          </Box>
        </Box>

        <Box
          w={{ base: '290px', md: '340px' }}
          h="100vh"
          bg="white"
          borderLeft="1px solid"
          borderColor="slate.200"
          overflowY="auto"
        >
          <Box p={5}>
            <Heading size="sm" color="slate.900">Merged view controls</Heading>
            <Text mt={2} fontSize="sm" color="slate.600">
              Compare selected documents while keeping the same highlight terms active across the session.
            </Text>
          </Box>

          <Divider borderColor="slate.200" />

          <Box p={5}>
            <Text fontSize="xs" color="slate.500" fontWeight="900" textTransform="uppercase" letterSpacing="0">
              Documents
            </Text>
            <VStack spacing={3} align="stretch" mt={3}>
              {documents.map((document) => (
                <Checkbox
                  key={document.id}
                  isChecked={activeDocumentIds.includes(document.id)}
                  onChange={() => toggleDocument(document.id)}
                  colorScheme="green"
                >
                  <Text as="span" fontSize="sm" fontWeight="700" color="slate.800">
                    {getDocumentName(document)}
                  </Text>
                </Checkbox>
              ))}
            </VStack>
          </Box>

          <Divider borderColor="slate.200" />

          <Box p={5}>
            <Text fontSize="xs" color="slate.500" fontWeight="900" textTransform="uppercase" letterSpacing="0">
              Search highlights
            </Text>
            {searchTerms.length === 0 ? (
              <Box mt={3} p={3} bg="slate.50" borderRadius="8px" border="1px solid" borderColor="slate.200">
                <Text fontSize="sm" color="slate.600">No highlight terms were passed into this view.</Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch" mt={3}>
                {searchTerms.map((term, index) => {
                  const color = HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length];
                  return (
                    <Box key={term} p={3} bg="slate.50" borderRadius="8px" border="1px solid" borderColor="slate.200">
                      <HStack spacing={2} align="center">
                        <Checkbox
                          isChecked={activeTerms.includes(term)}
                          onChange={() => toggleTerm(term)}
                          colorScheme={color.name}
                        />
                        <Box w="12px" h="12px" bg={color.bg} borderRadius="sm" border="1px solid" borderColor={color.border} />
                        <Text fontSize="sm" fontWeight="800" color="slate.800" flex="1" noOfLines={1}>
                          {term}
                        </Text>
                      </HStack>
                      <Badge mt={2} bg={color.bg} color="gray.800" border="1px solid" borderColor={color.border}>
                        {aggregateMatches[term] || 0} match{aggregateMatches[term] === 1 ? '' : 'es'}
                      </Badge>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </Box>
        </Box>
      </HStack>
    </Box>
  );
};

export default MergeViewer;
