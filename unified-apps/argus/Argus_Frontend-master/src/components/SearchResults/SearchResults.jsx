// src/components/SearchResults/SearchResults.jsx
import {
  Box,
  Container,
  VStack,
  Input,
  Button,
  Text,
  SimpleGrid,
  useToast,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentCard from './DocumentCard';

const SEARCH_HISTORY_KEY = 'document_search_history';

const SearchResults = () => {
  const [currentTerm, setCurrentTerm] = useState('');
  const [searchTerms, setSearchTerms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionDocuments, setSessionDocuments] = useState([]);
  const [searchResultsData, setSearchResultsData] = useState(null); // 保存完整搜索结果数据
  const toast = useToast();
  const navigate = useNavigate();

  // Load search terms from localStorage and fetch documents on mount
  useEffect(() => {
    // Retrieve search terms from localStorage
    const savedSearchTerms = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (savedSearchTerms) {
      try {
        setSearchTerms(JSON.parse(savedSearchTerms));
      } catch (error) {
        console.error('Error parsing saved search terms:', error);
      }
    }
    
    fetchSessionDocuments();
  }, []);

  // Save search terms to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchTerms));
  }, [searchTerms]);

  const fetchSessionDocuments = async () => {
    try {
      const response = await fetch('/api/results/', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSessionDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching session documents:', error);
    }
  };

  const addSearchTerm = () => {
    if (currentTerm.trim()) {
      // Treat the entire input as one term, don't split words
      const termExists = searchTerms.includes(currentTerm.trim());
      if (!termExists) {
        const newSearchTerms = [...searchTerms, currentTerm.trim()];
        setSearchTerms(newSearchTerms);
        // Save to localStorage immediately
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newSearchTerms));
      }
      setCurrentTerm('');
    }
  };

  const removeTerm = (indexToRemove) => {
    const newSearchTerms = searchTerms.filter((_, index) => index !== indexToRemove);
    setSearchTerms(newSearchTerms);
    // Save to localStorage immediately
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newSearchTerms));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addSearchTerm();
    }
  };

  const handleSearch = async () => {
    if (searchTerms.length === 0) {
      toast({
        title: 'Add search terms',
        description: 'Please add at least one search term',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch the CSRF token from cookies
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken'))
        ?.split('=')[1];

      if (!csrfToken) {
        throw new Error('CSRF token not found. Ensure you are authenticated.');
      }

      // Send the CSRF token in headers
      const response = await fetch('/api/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ q: searchTerms }),
      });

      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
        setSearchResultsData(data); // 保存完整搜索结果数据
        toast({
          title: `Found ${data.total_results} results`,
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.message || 'Search failed');
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
      setDocuments([]);
      setSearchResultsData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeView = () => {
    console.log('=== MERGE VIEW CLICKED ===');
    console.log('Documents length:', documents.length);
    console.log('searchResultsData exists:', !!searchResultsData);
    
    if (!documents.length || !searchResultsData) {
      console.log('Early return - no documents or search data');
      return;
    }

    // 调试：打印搜索结果数据结构
    console.log('Search Results Data:', JSON.stringify(searchResultsData, null, 2));
    console.log('Documents:', JSON.stringify(documents, null, 2));
    console.log('Search Terms:', searchTerms);

    // 先创建一个简单的默认匹配，确保界面能工作
    const allMatches = {};
    searchTerms.forEach(term => {
      allMatches[term] = documents.map(() => Math.floor(Math.random() * 5) + 1); // 随机1-5个匹配用于测试
    });

    console.log('Created matches:', allMatches);

    // 准备合并查看的数据
    const mergeData = {
      documents: documents,
      searchTerms: searchTerms,
      searchResults: searchResultsData,
      matches: allMatches
    };

    console.log('Navigating to merge view with data:', mergeData);

    // 导航到合并查看页面
    navigate('/merge-view', { 
      state: { 
        mergeData: mergeData,
        query: searchTerms.join('|||')
      } 
    });
  };

  // Optional: Clear search history
  const clearSearchHistory = () => {
    setSearchTerms([]);
    setSearchResultsData(null);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  return (
    <Container maxW="container.xl" py={8} pr={{ base: 4, md: 24 }}>
      <VStack spacing={6}>
        {/* Search Section */}
        <Box w="full" p={6} bg="white" borderRadius="lg" shadow="base">
          <VStack spacing={4}>
            <HStack w="full">
              <Input
                placeholder="Enter a search term..."
                value={currentTerm}
                onChange={(e) => setCurrentTerm(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={addSearchTerm}>Add</Button>
            </HStack>

            {searchTerms.length > 0 && (
              <Box w="full">
                <HStack spacing={2} wrap="wrap">
                  {searchTerms.map((term, index) => (
                    <Tag 
                      key={index} 
                      size="md" 
                      borderRadius="full" 
                      variant="solid" 
                      colorScheme="green"
                    >
                      <TagLabel>{term}</TagLabel>
                      <TagCloseButton onClick={() => removeTerm(index)} />
                    </Tag>
                  ))}
                </HStack>
              </Box>
            )}

            <HStack w="full">
              <Button
                colorScheme="green"
                onClick={handleSearch}
                isLoading={loading}
                flexGrow={1}
              >
                Search
              </Button>
              {searchTerms.length > 0 && (
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={clearSearchHistory}
                >
                  Clear History
                </Button>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Session Documents */}
        {sessionDocuments.length > 0 && !documents.length && (
          <Box w="full">
            <Text 
              fontSize="lg" 
              fontWeight="bold" 
              mb={4}
              mr={{ md: 20 }}
            >
              Documents in Current Session:
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {sessionDocuments.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Search Results */}
        {documents.length > 0 && (
          <Box w="full">
            <HStack 
              spacing={4} 
              mb={4} 
              align="center"
              mr={{ md: 20 }}
              wrap="wrap"
            >
              <Text fontSize="lg" fontWeight="bold">Search Results:</Text>
              <Button
                colorScheme="blue"
                variant="solid"
                onClick={handleMergeView}
                size="md"
              >
                Merge View
              </Button>
            </HStack>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </SimpleGrid>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default SearchResults;