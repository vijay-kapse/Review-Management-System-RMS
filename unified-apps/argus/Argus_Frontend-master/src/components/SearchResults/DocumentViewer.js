import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Text, 
  VStack, 
  HStack, 
  Badge,
  Checkbox,
  IconButton,
  Center,
  Spinner
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


const ColorPanel = ({ matches, onToggle }) => {
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
      w="250px" 
      bg="white" 
      p={4} 
      borderLeft="1px" 
      borderColor="slate.200"
      overflowY="auto"
      h="100vh"
    >
      <VStack spacing={4} align="stretch">
        <Text fontWeight="900" fontSize="lg" color="slate.900">Search Highlights</Text>
        {Object.keys(matches).length === 0 && (
          <Box p={3} bg="slate.50" borderRadius="8px" border="1px solid" borderColor="slate.200">
            <Text fontSize="sm" color="slate.600">
              No search highlights are active for this view.
            </Text>
          </Box>
        )}
        {Object.entries(matches).map(([term, positions], index) => {
          const color = colors[index % colors.length];
          return (
            <Box key={term} p={3} bg="slate.50" borderRadius="8px" border="1px solid" borderColor="slate.200">
              <HStack spacing={2} mb={2}>
                <Checkbox 
                  isChecked={activeTerms[term]}
                  onChange={() => handleToggle(term)}
                  colorScheme={color.name}
                />
                <Box 
                  w="12px" 
                  h="12px" 
                  bg={color.bg}
                  borderRadius="sm"
                  border="1px"
                  borderColor={color.border}
                />
                <Text fontSize="sm" fontWeight="medium">
                  {term}
                </Text>
              </HStack>
              <Badge 
                bg={color.bg}
                color="gray.800"
                border="1px"
                borderColor={color.border}
              >
                {positions.length} matches
              </Badge>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
};


const LoadingState = ({ label = 'Loading document...' }) => (
  <Center h="full" bg="slate.100">
    <VStack spacing={3}>
      <Spinner color="brand.500" size="xl" thickness="4px" />
      <Text fontSize="sm" color="slate.600" fontWeight="700">{label}</Text>
    </VStack>
  </Center>
);

const PdfCanvasViewer = ({ blob }) => {
  const [pages, setPages] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let loadingTask;

    const renderPdf = async () => {
      if (!blob) return;
      setLoading(true);
      setError('');
      setPages([]);

      try {
        const data = await blob.arrayBuffer();
        loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const limit = Math.min(pdf.numPages, 4);
        const renderedPages = [];

        for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = 980;
          const scale = Math.min(1.8, targetWidth / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          await page.render({ canvasContext: context, viewport }).promise;
          renderedPages.push({
            pageNumber,
            src: canvas.toDataURL('image/jpeg', 0.94),
            width: canvas.width,
            height: canvas.height,
          });
        }

        if (!cancelled) {
          setPageCount(pdf.numPages);
          setPages(renderedPages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to render this PDF.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [blob]);

  if (loading) {
    return <LoadingState label="Rendering paper preview..." />;
  }

  if (error) {
    return (
      <Center h="full" bg="slate.100">
        <Box p={5} bg="white" borderRadius="8px" border="1px solid" borderColor="slate.200">
          <Text fontWeight="900" color="slate.900">Preview unavailable</Text>
          <Text mt={1} fontSize="sm" color="slate.600">{error}</Text>
        </Box>
      </Center>
    );
  }

  return (
    <Box
      h="full"
      overflowY="auto"
      bg="slate.100"
      px={{ base: 4, md: 8 }}
      py={6}
      data-argus-pdf-rendered="true"
    >
      <VStack spacing={6} align="center">
        {pages.map((page) => (
          <Box
            key={page.pageNumber}
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            boxShadow="0 18px 45px rgba(15, 23, 42, 0.12)"
            borderRadius="6px"
            overflow="hidden"
            maxW="100%"
          >
            <Box
              as="img"
              src={page.src}
              alt={`Rendered page ${page.pageNumber}`}
              display="block"
              maxW="100%"
              w={`${Math.min(page.width, 980)}px`}
              h="auto"
            />
          </Box>
        ))}
        {pageCount > pages.length && (
          <Badge borderRadius="full" colorScheme="green" px={3} py={1}>
            Previewing first {pages.length} of {pageCount} pages
          </Badge>
        )}
      </VStack>
    </Box>
  );
};

const ImageViewer = ({ url }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <Center h="full" bg="slate.100" p={8} position="relative">
      {!loaded && <LoadingState label="Loading image preview..." />}
      <Box
        as="img"
        src={url}
        maxH="calc(100vh - 150px)"
        maxW="100%"
        objectFit="contain"
        bg="white"
        border="1px solid"
        borderColor="slate.200"
        boxShadow="0 18px 45px rgba(15, 23, 42, 0.12)"
        borderRadius="6px"
        onLoad={() => setLoaded(true)}
        data-argus-image-rendered={loaded ? 'true' : undefined}
      />
    </Center>
  );
};

const FileViewer = ({ fileType, url, blob }) => {
  if (!url || !blob) return <LoadingState />;

  const normalizedType = (fileType || '').toLowerCase();

  if (normalizedType.includes('pdf')) {
    return <PdfCanvasViewer blob={blob} />;
  }

  if (normalizedType.startsWith('image/')) {
    return <ImageViewer url={url} />;
  }

  if (normalizedType.includes('html')) {
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

const DocumentViewer = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(null);
  const [fileBlob, setFileBlob] = useState(null);
  const [loadError, setLoadError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  
  const query = searchParams.get('query');
  const matches = location.state?.matchData || {};
  const fileName = location.state?.fileName || 'Document preview';
  const initialFileType = location.state?.fileType || null;
  const [fileType, setFileType] = useState(null);

  const applyDocumentResponse = async (response) => {
    const contentType = response.headers.get('content-type') || initialFileType || '';
    const blob = await response.blob();
    setFileType(contentType);
    setFileBlob(blob);
    setUrl(URL.createObjectURL(blob));
  };

  const handleTermToggle = async (activeTerms) => {
    setLoadError('');

    if (activeTerms.length === 0) {
      try {
        const response = await fetch(`/api/view/${id}/`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load original document');
        }

        await applyDocumentResponse(response);
      } catch (err) {
        setLoadError(err.message || 'Unable to load the document.');
        console.error('Error loading original document:', err);
      }
      return;
    }

    try {
      const colors = [
        'yellow', 'blue', 'green', 'pink', 'purple', 
        'orange', 'cyan', 'teal', 'red', 'lime'
      ];

      const activeColorMap = {};
      Object.entries(matches).forEach(([term, _], index) => {
        if (activeTerms.includes(term)) {
          activeColorMap[term] = colors[index % colors.length];
        }
      });

      const queryStr = encodeURIComponent(activeTerms.join('|||'));
      const colorStr = encodeURIComponent(
        activeTerms.map(term => activeColorMap[term]).join(',')
      );

      const response = await fetch(
        `/api/view/${id}/?query=${queryStr}&colors=${colorStr}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': '*/*'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update highlights');
      }

      await applyDocumentResponse(response);

    } catch (err) {
      setLoadError(err.message || 'Unable to update highlights.');
      console.error('Error updating highlights:', err);
    }
  };

  useEffect(() => {
    setLoadError('');
    setFileBlob(null);
    setUrl(null);

    const loadDocument = async () => {
      try {
        let apiUrl = `/api/view/${id}/`;
        if (query) {
          const colors = [
            'yellow', 'blue', 'green', 'pink', 'purple', 
            'orange', 'cyan', 'teal', 'red', 'lime'
          ];
          const terms = query.split('|||');
          apiUrl += `?query=${encodeURIComponent(query)}&colors=${encodeURIComponent(terms.map((_, i) => colors[i % colors.length]).join(','))}`;
        }
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': '*/*'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load document');
        }

        await applyDocumentResponse(response);
        
      } catch (err) {
        setLoadError(err.message || 'Unable to load the document.');
        console.error('Error:', err);
      }
    };

    loadDocument();

    // eslint-disable-next-line
  }, [id, query]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <Box h="100vh" overflow="hidden">
      <HStack spacing={0} align="stretch" w="100%" h="100%">
        <Box flex="1" minW={0} h="100%" bg="slate.100">
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
                ARGUS document viewer
              </Text>
              <Text fontWeight="900" fontSize="lg" noOfLines={1}>
                {fileName}
              </Text>
            </Box>
            {fileType && (
              <Badge borderRadius="full" colorScheme={(fileType || '').toLowerCase().startsWith('image/') ? 'blue' : 'green'} px={3} py={1}>
                {fileType}
              </Badge>
            )}
          </HStack>

          <Box h="calc(100vh - 70px)">
            {loadError ? (
              <Center h="full" bg="slate.100">
                <Box p={5} bg="white" borderRadius="8px" border="1px solid" borderColor="slate.200">
                  <Text fontWeight="900" color="slate.900">Document could not be loaded</Text>
                  <Text mt={1} fontSize="sm" color="slate.600">{loadError}</Text>
                </Box>
              </Center>
            ) : (
              <FileViewer fileType={fileType} url={url} blob={fileBlob} />
            )}
          </Box>
        </Box>
        <ColorPanel 
          matches={matches} 
          onToggle={handleTermToggle}
        />
      </HStack>
    </Box>
  );
};

export { FileViewer };
export default DocumentViewer;
