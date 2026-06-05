// src/components/SearchResults/MergeViewer.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  Checkbox,
  IconButton,
  Center,
  Divider,
  Button,
  Select,
  Flex
} from '@chakra-ui/react';
import { ArrowBackIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { apiUrl } from '../../services/api';

const ColorPanel = ({ matches, onToggle, documents, onDocumentToggle, activeDocuments }) => {
  const colors = [
    { bg: "#FFD700", border: "#B8860B", name: "yellow" },
    { bg: "#4169E1", border: "#0000CD", name: "blue" },
    { bg: "#32CD32", border: "#228B22", name: "green" },
    { bg: "#FF69B4", border: "#DB7093", name: "pink" },
    { bg: "#9370DB", border: "#6A5ACD", name: "purple" },
    { bg: "#FFA500", border: "#FF8C00", name: "orange" },
    { bg: "#00CED1", border: "#008B8B", name: "cyan" },
    { bg: "#20B2AA", border: "#008080", name: "teal" },
    { bg: "#FF6347", border: "#FF4500", name: "red" },
    { bg: "#98FB98", border: "#3CB371", name: "lime" }
  ];

  const [activeTerms, setActiveTerms] = useState(Object.keys(matches).reduce((acc, term) => {
    acc[term] = true;
    return acc;
  }, {}));

  const handleToggle = (term) => {
    const newActiveTerms = { ...activeTerms, [term]: !activeTerms[term] };
    setActiveTerms(newActiveTerms);
    onToggle(Object.entries(newActiveTerms)
      .filter(([_, isActive]) => isActive)
      .map(([term]) => term));
  };

  return (
    <Box
      w="300px"
      bg="white"
      p={4}
      borderLeft="1px"
      borderColor="gray.200"
      overflowY="auto"
      h="100vh"
    >
      <VStack spacing={4} align="stretch">
        {/* Document Selection */}
        <Box>
          <Text fontWeight="bold" fontSize="lg" mb={3}>Documents</Text>
          <VStack spacing={2} align="stretch">
            {documents.map((doc) => (
              <HStack key={doc.id} spacing={2}>
                <Checkbox
                  isChecked={activeDocuments.includes(doc.id)}
                  onChange={() => onDocumentToggle(doc.id)}
                  colorScheme="blue"
                  size="sm"
                />
                <Text fontSize="sm" noOfLines={2} flex="1">
                  {doc.filename || `Document ${doc.id}`}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>

        <Divider />

        {/* Search Highlights */}
        <Box>
          <Text fontWeight="bold" fontSize="lg" mb={3}>Search Highlights</Text>
          <VStack spacing={3} align="stretch">
            {Object.entries(matches).map(([term, positions], index) => {
              const color = colors[index % colors.length];
              return (
                <Box key={term} p={3} bg="gray.50" borderRadius="md">
                  <HStack spacing={2} mb={2}>
                    <Checkbox
                      isChecked={activeTerms[term]}
                      onChange={() => handleToggle(term)}
                      colorScheme={color.name}
                      size="sm"
                    />
                    <Box
                      w="12px"
                      h="12px"
                      bg={color.bg}
                      borderRadius="sm"
                      border="1px"
                      borderColor={color.border}
                    />
                    <Text fontSize="sm" fontWeight="medium" flex="1">
                      {term}
                    </Text>
                  </HStack>
                  <Badge
                    bg={color.bg}
                    color="gray.800"
                    border="1px"
                    borderColor={color.border}
                    size="sm"
                  >
                    {positions.length} matches
                  </Badge>
                </Box>
              );
            })}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

const FileViewer = ({ fileType, url }) => {
  if (!url) return null;

  if (fileType?.startsWith('image/')) {
    return (
      <Center h="full">
        <Box
          as="img"
          src={url}
          maxH="90vh"
          maxW="100%"
          objectFit="contain"
        />
      </Center>
    );
  }

  if (fileType === 'text/html') {
    return (
      <Box
        as="iframe"
        src={url}
        width="100%"
        height="100%"
        sx={{
          border: 'none',
          background: 'white',
        }}
        sandbox="allow-same-origin allow-scripts"
      />
    );
  }

  return (
    <Box
      as="iframe"
      src={url}
      width="100%"
      height="100%"
      sx={{
        border: 'none',
        margin: 0,
        padding: 0,
      }}
    />
  );
};

const MergeViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { mergeData, query } = location.state || {};
  const documents = mergeData?.documents || [];
  const searchTerms = mergeData?.searchTerms || [];

  const [activeDocuments, setActiveDocuments] = useState(documents.map(doc => doc.id));
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [documentUrls, setDocumentUrls] = useState({});
  const [fileTypes, setFileTypes] = useState({});
  const [matches, setMatches] = useState({});
  const [isColorPanelCollapsed, setIsColorPanelCollapsed] = useState(false);
  const [isNavPanelMinimized, setIsNavPanelMinimized] = useState(false); // New state for navigation panel minimization

  // 初始化matches对象
  useEffect(() => {
    if (searchTerms.length > 0) {
      const matchesObj = {};
      searchTerms.forEach(term => {
        matchesObj[term] = []; // 这里可以根据实际情况填充位置信息
      });
      setMatches(matchesObj);
    }
  }, [searchTerms]);

  const loadDocument = async (docId, activeTerms = searchTerms) => {
    try {
      let requestUrl = apiUrl(`/view/${docId}/`);
      if (activeTerms.length > 0) {
        const colors = [
          'yellow', 'blue', 'green', 'pink', 'purple',
          'orange', 'cyan', 'teal', 'red', 'lime'
        ];
        const queryStr = encodeURIComponent(activeTerms.join('|||'));
        const colorStr = encodeURIComponent(
          activeTerms.map((_, i) => colors[i % colors.length]).join(',')
        );
        requestUrl += `?query=${queryStr}&colors=${colorStr}`;
      }

      const response = await fetch(requestUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': '*/*'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const contentType = response.headers.get('content-type');
      const blob = await response.blob();

      // Clean up old URL if it exists
      if (documentUrls[docId]) {
        URL.revokeObjectURL(documentUrls[docId]);
      }

      const newUrl = URL.createObjectURL(blob);

      setDocumentUrls(prev => ({
        ...prev,
        [docId]: newUrl
      }));

      setFileTypes(prev => ({
        ...prev,
        [docId]: contentType
      }));

    } catch (err) {
      console.error('Error loading document:', err);
    }
  };

  // 加载所有激活的文档
  useEffect(() => {
    activeDocuments.forEach(docId => {
      loadDocument(docId);
    });
  }, [activeDocuments]);

  const handleTermToggle = async (activeTerms) => {
    // 重新加载所有激活的文档
    for (const docId of activeDocuments) {
      await loadDocument(docId, activeTerms);
    }
  };

  const handleDocumentToggle = (docId) => {
    setActiveDocuments(prev => {
      const newActive = prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId];

      // 如果当前显示的文档被取消激活，切换到第一个激活的文档
      if (!newActive.includes(documents[currentDocIndex]?.id) && newActive.length > 0) {
        const firstActiveIndex = documents.findIndex(doc => newActive.includes(doc.id));
        setCurrentDocIndex(firstActiveIndex >= 0 ? firstActiveIndex : 0);
      }

      return newActive;
    });
  };

  const navigateDocument = (direction) => {
    const activeIndexes = documents
      .map((doc, index) => ({ doc, index }))
      .filter(({ doc }) => activeDocuments.includes(doc.id))
      .map(({ index }) => index);

    const currentActiveIndex = activeIndexes.indexOf(currentDocIndex);

    if (direction === 'next' && currentActiveIndex < activeIndexes.length - 1) {
      setCurrentDocIndex(activeIndexes[currentActiveIndex + 1]);
    } else if (direction === 'prev' && currentActiveIndex > 0) {
      setCurrentDocIndex(activeIndexes[currentActiveIndex - 1]);
    }
  };

  const currentDoc = documents[currentDocIndex];
  const activeIndexes = documents
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => activeDocuments.includes(doc.id))
    .map(({ index }) => index);
  const currentActiveIndex = activeIndexes.indexOf(currentDocIndex);

  // 清理函数
  useEffect(() => {
    return () => {
      Object.values(documentUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, []);

  if (!documents.length) {
    return (
      <Center h="100vh">
        <Text>No documents to display</Text>
      </Center>
    );
  }

  return (
    <Box>
      {/* Back Button */}
      <Box
        position="fixed"
        top={4}
        left={4}
        zIndex={10}
      >
        <IconButton
          icon={<ArrowBackIcon />}
          onClick={() => navigate('/results')}
          colorScheme="green"
          aria-label="Go back"
          size="lg"
          rounded="full"
          shadow="md"
        />
      </Box>

      <HStack spacing={0} align="stretch" w="100%">
        <Box flex="1" h="100vh" bg="gray.50" position="relative">
          {/* Document Navigation Panel */}
          <Box
            position="absolute"
            top={4}
            right={isNavPanelMinimized ? '10px' : '4'} // Adjust right position when minimized
            zIndex={5}
            bg="white"
            p={isNavPanelMinimized ? 1 : 3} // Smaller padding when minimized
            borderRadius="md"
            shadow="md"
            transition="right 0.2s ease-in-out, padding 0.2s ease-in-out, width 0.2s ease-in-out" // Smooth transition
            width={isNavPanelMinimized ? '40px' : '250px'} // Shrink width
            height={isNavPanelMinimized ? '40px' : 'auto'} // Shrink height
            overflow="hidden" // Hide overflow when minimized
          >
            <Flex direction="row" align="center" justify="space-between" w="full">
              {!isNavPanelMinimized && (
                <Text fontSize="md" fontWeight="semibold" flexGrow={1} mr={2}>
                    Document Navigation
                </Text>
              )}
              <IconButton
                icon={isNavPanelMinimized ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                onClick={() => setIsNavPanelMinimized(!isNavPanelMinimized)}
                aria-label={isNavPanelMinimized ? "Expand navigation" : "Minimize navigation"}
                size="sm"
                variant="ghost"
              />
            </Flex>
            
            {!isNavPanelMinimized && (
              <VStack spacing={2} align="stretch" mt={2}>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    onClick={() => navigateDocument('prev')}
                    isDisabled={currentActiveIndex <= 0}
                    leftIcon={<ChevronUpIcon />}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigateDocument('next')}
                    isDisabled={currentActiveIndex >= activeIndexes.length - 1}
                    rightIcon={<ChevronDownIcon />}
                  >
                    Next
                  </Button>
                </HStack>
                <Select
                  size="sm"
                  value={currentDocIndex}
                  onChange={(e) => setCurrentDocIndex(Number(e.target.value))}
                  w="200px"
                >
                  {documents.map((doc, index) => (
                    <option
                      key={doc.id}
                      value={index}
                      disabled={!activeDocuments.includes(doc.id)}
                    >
                      {doc.filename || `Document ${doc.id}`}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" textAlign="center">
                  {currentActiveIndex + 1} of {activeDocuments.length} documents
                </Text>
              </VStack>
            )}
          </Box>

          {/* Current Document Display */}
          {currentDoc && activeDocuments.includes(currentDoc.id) && (
            <FileViewer
              fileType={fileTypes[currentDoc.id]}
              url={documentUrls[currentDoc.id]}
            />
          )}
        </Box>

        {/* Collapsible Color Panel */}
        <Box position="relative">
          <IconButton
            icon={isColorPanelCollapsed ? <ChevronUpIcon transform="rotate(-90deg)" /> : <ChevronDownIcon transform="rotate(90deg)" />}
            onClick={() => setIsColorPanelCollapsed(!isColorPanelCollapsed)}
            position="absolute"
            left="-20px"
            top="50%"
            transform="translateY(-50%)"
            zIndex={10}
            colorScheme="blue"
            size="sm"
            borderRadius="full"
          />

          {!isColorPanelCollapsed && (
            <ColorPanel
              matches={matches}
              onToggle={handleTermToggle}
              documents={documents}
              onDocumentToggle={handleDocumentToggle}
              activeDocuments={activeDocuments}
            />
          )}
        </Box>
      </HStack>
    </Box>
  );
};

export default MergeViewer;
