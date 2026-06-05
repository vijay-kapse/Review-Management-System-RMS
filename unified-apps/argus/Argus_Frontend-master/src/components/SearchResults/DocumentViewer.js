//src/componnents/SearchResults/Documentviewer.js
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
  Center  // Add this
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { apiUrl } from '../../services/api';


const ColorPanel = ({ matches, onToggle }) => {
    // Exact colors that will be used for both display and highlighting
    const colors = [
      { bg: "#FFD700", border: "#B8860B", name: "yellow" },     // vector
      { bg: "#4169E1", border: "#0000CD", name: "blue" },       // pathogen
      { bg: "#32CD32", border: "#228B22", name: "green" },      // vector and pathogen
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
      borderColor="gray.200"
      overflowY="auto"
      h="100vh"
    >
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Search Highlights</Text>
        {Object.entries(matches).map(([term, positions], index) => {
          const color = colors[index % colors.length];
          return (
            <Box key={term} p={3} bg="gray.50" borderRadius="md">
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


const FileViewer = ({ fileType, url }) => {
  if (!url) return null;

  // Image files
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

  // HTML files
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

  // Default viewer for PDFs and converted documents
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
  const location = useLocation();
  const navigate = useNavigate();
  
  const query = searchParams.get('query');
  const matches = location.state?.matchData || {};
  const [fileType, setFileType] = useState(null);

  const handleTermToggle = async (activeTerms) => {
    if (activeTerms.length === 0) {
      // Show original document if no terms are active
      try {
        const response = await fetch(apiUrl(`/view/${id}/`), {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to load original document');
        }

        const contentType = response.headers.get('content-type');
        setFileType(contentType);
        const blob = await response.blob();
        
        if (url) URL.revokeObjectURL(url);
        const newUrl = URL.createObjectURL(blob);
        setUrl(newUrl);
      } catch (err) {
        console.error('Error loading original document:', err);
      }
      return;
    }

    try {
      // Create color map for active terms
      const colors = [
        'yellow', 'blue', 'green', 'pink', 'purple', 
        'orange', 'cyan', 'teal', 'red', 'lime'
      ];

      // Preserve original color assignments for active terms
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
        apiUrl(`/view/${id}/?query=${queryStr}&colors=${colorStr}`),
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

      const contentType = response.headers.get('content-type');
      setFileType(contentType);

      const blob = await response.blob();
      
      if (url) {
        URL.revokeObjectURL(url);
      }

      const newUrl = URL.createObjectURL(blob);
      setUrl(newUrl);

    } catch (err) {
      console.error('Error updating highlights:', err);
    }
  };

  useEffect(() => {
    const loadDocument = async () => {
      try {
        let requestUrl = apiUrl(`/view/${id}/`);
        if (query) {
          const colors = [
            'yellow', 'blue', 'green', 'pink', 'purple', 
            'orange', 'cyan', 'teal', 'red', 'lime'
          ];
          const terms = query.split('|||');
          requestUrl += `?query=${encodeURIComponent(query)}&colors=${encodeURIComponent(terms.map((_, i) => colors[i % colors.length]).join(','))}`;
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
        setFileType(contentType);

        const blob = await response.blob();
        
        // Clean up old URL if it exists
        if (url) {
          URL.revokeObjectURL(url);
        }
        
        const newUrl = URL.createObjectURL(blob);
        setUrl(newUrl);
        
      } catch (err) {
        console.error('Error:', err);
      }
    };

    loadDocument();

    // Cleanup function
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };

    // eslint-disable-next-line 
  }, [id, query]); // Removed url from dependencies

  return (
    <Box>
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
        <Box flex="1" h="100vh" bg="gray.50">
          <FileViewer fileType={fileType} url={url} />
        </Box>
        <ColorPanel 
          matches={matches} 
          onToggle={handleTermToggle}
        />
      </HStack>
    </Box>
  );
};

export default DocumentViewer;
