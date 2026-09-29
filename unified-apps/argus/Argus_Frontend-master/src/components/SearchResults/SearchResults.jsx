// src/components/SearchResults/SearchResults.jsx
import {
  Box,
  Container,
  VStack,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Text,
  SimpleGrid,
  useToast,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Flex,
  Heading,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { AddIcon, AttachmentIcon, SearchIcon, SmallCloseIcon } from '@chakra-ui/icons';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentCard from './DocumentCard';
import { apiUrl } from '../../services/api';

// Search terms outlive the tab so a review can be resumed later; the matched
// results only make sense for the current ARGUS session, so they stay per-tab.
const SEARCH_TERMS_KEY = 'argus:search-terms';
const SEARCH_RESULTS_KEY = 'argus:search-results';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const readStorage = (storage, key) => {
  try {
    const raw = window[storage].getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    // Storage can be unavailable (private mode, blocked cookies) or hold stale junk.
    return null;
  }
};

const writeStorage = (storage, key, value) => {
  try {
    window[storage].setItem(key, JSON.stringify(value));
  } catch (error) {
    return false;
  }
  return true;
};

const clearStorage = (storage, key) => {
  try {
    window[storage].removeItem(key);
  } catch (error) {
    return false;
  }
  return true;
};

const readStoredTerms = () => {
  const parsed = readStorage('localStorage', SEARCH_TERMS_KEY);
  return Array.isArray(parsed) ? parsed.filter(isNonEmptyString) : [];
};

const readStoredResults = () => {
  const parsed = readStorage('sessionStorage', SEARCH_RESULTS_KEY);
  return {
    documents: Array.isArray(parsed?.documents) ? parsed.documents : [],
    searchedTerms: Array.isArray(parsed?.searchedTerms) ? parsed.searchedTerms.filter(isNonEmptyString) : [],
  };
};

const SearchResults = () => {
  // Lazy initialisers hydrate before the first paint, so returning from a
  // document view never flashes an empty term list or overwrites what was saved.
  const [restoredResults] = useState(readStoredResults);
  const [currentTerm, setCurrentTerm] = useState('');
  const [searchTerms, setSearchTerms] = useState(readStoredTerms);
  const [documents, setDocuments] = useState(restoredResults.documents);
  const [loading, setLoading] = useState(false);
  const [sessionDocuments, setSessionDocuments] = useState([]);
  const [searchedTerms, setSearchedTerms] = useState(restoredResults.searchedTerms);
  const toast = useToast();
  const navigate = useNavigate();

  const fetchSessionDocuments = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/results/'), {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setSessionDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching session documents:', error);
    }
  }, []);

  useEffect(() => {
    fetchSessionDocuments();
  }, [fetchSessionDocuments]);

  useEffect(() => {
    writeStorage('localStorage', SEARCH_TERMS_KEY, searchTerms);
  }, [searchTerms]);

  useEffect(() => {
    writeStorage('sessionStorage', SEARCH_RESULTS_KEY, { documents, searchedTerms });
  }, [documents, searchedTerms]);

  const addSearchTerm = () => {
    const term = currentTerm.trim();
    if (term) {
      const termExists = searchTerms.includes(term);
      if (!termExists) {
        setSearchTerms([...searchTerms, term]);
      }
      setCurrentTerm('');
    }
  };

  const removeTerm = (indexToRemove) => {
    setSearchTerms(searchTerms.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addSearchTerm();
    }
  };

  const clearSearchTerms = () => {
    setSearchTerms([]);
    setSearchedTerms([]);
    setDocuments([]);
    setCurrentTerm('');
    clearStorage('localStorage', SEARCH_TERMS_KEY);
    clearStorage('sessionStorage', SEARCH_RESULTS_KEY);
  };
  const handleSearch = async () => {
    const pendingTerm = currentTerm.trim();
    const termsToSearch = pendingTerm && !searchTerms.includes(pendingTerm)
      ? [...searchTerms, pendingTerm]
      : searchTerms;

    if (termsToSearch.length === 0) {
      toast({
        title: 'Add search terms',
        description: 'Please add at least one search term',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setSearchTerms(termsToSearch);
    setCurrentTerm('');
    try {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken'))
        ?.split('=')[1];

      if (!csrfToken) {
        throw new Error('CSRF token not found. Ensure you are authenticated.');
      }

      const response = await fetch(apiUrl('/search/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ q: termsToSearch }),
      });

      const data = await response.json();

      if (response.ok) {
        setDocuments(data.documents || []);
        setSearchedTerms(termsToSearch);
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
      setSearchedTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeView = () => {
    const termsForMerge = searchedTerms.length ? searchedTerms : searchTerms;
    navigate('/merge-view', {
      state: {
        mergeData: {
          documents,
          searchTerms: termsForMerge,
        },
        query: termsForMerge.join('|||'),
      },
    });
  };

  const totalMatches = documents.reduce((sum, doc) => {
    if (!doc.matches) return sum;
    return sum + Object.values(doc.matches).reduce((inner, positions) => inner + positions.length, 0);
  }, 0);

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
              SEARCH RESULTS
            </Text>
            <Heading as="h1" size={{ base: 'lg', md: 'xl' }} color="slate.900" mt="2">
              Review extracted evidence
            </Heading>
            <Text color="slate.600" mt="3" maxW="740px" lineHeight="1.7">
              Search across the current ARGUS session and open matched documents with highlighted evidence.
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 3, md: 3 }} spacing={3} minW={{ lg: '420px' }}>
            <Box bg="white" border="1px solid" borderColor="slate.200" borderRadius="8px" p="4">
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Session
              </Text>
              <Text fontSize="2xl" fontWeight="900" color="slate.900">{sessionDocuments.length}</Text>
            </Box>
            <Box bg="white" border="1px solid" borderColor="slate.200" borderRadius="8px" p="4">
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Results
              </Text>
              <Text fontSize="2xl" fontWeight="900" color="brand.700">{documents.length}</Text>
            </Box>
            <Box bg="white" border="1px solid" borderColor="slate.200" borderRadius="8px" p="4">
              <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
                Matches
              </Text>
              <Text fontSize="2xl" fontWeight="900" color="accent.700">{totalMatches}</Text>
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
              <Flex gap={3} flexDir={{ base: 'column', md: 'row' }}>
                <InputGroup flex="1">
                  <InputLeftElement pointerEvents="none">
                    <SearchIcon color="slate.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search term or phrase"
                    value={currentTerm}
                    onChange={(e) => setCurrentTerm(e.target.value)}
                    onKeyDown={handleKeyPress}
                    bg="slate.50"
                    borderColor="slate.200"
                    h="48px"
                  />
                </InputGroup>
                <Button
                  leftIcon={<AddIcon />}
                  variant="outline"
                  onClick={addSearchTerm}
                  isDisabled={!currentTerm.trim()}
                  h="48px"
                >
                  Add Term
                </Button>
                <Button
                  leftIcon={<SearchIcon />}
                  onClick={handleSearch}
                  isLoading={loading}
                  h="48px"
                  minW={{ md: '150px' }}
                >
                  Search
                </Button>
              </Flex>
            </Box>

            {searchTerms.length > 0 && (
              <Box px={{ base: 4, md: 5 }} pb={{ base: 4, md: 5 }}>
                <Flex
                  gap={3}
                  align={{ base: 'stretch', md: 'center' }}
                  justify="space-between"
                  flexDir={{ base: 'column', md: 'row' }}
                >
                  <HStack spacing={2} wrap="wrap" flex="1">
                    {searchTerms.map((term, index) => (
                      <Tag
                        key={index}
                        size="lg"
                        borderRadius="full"
                        variant="subtle"
                        colorScheme="green"
                      >
                        <TagLabel>{term}</TagLabel>
                        <TagCloseButton onClick={() => removeTerm(index)} />
                      </Tag>
                    ))}
                  </HStack>
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    leftIcon={<SmallCloseIcon />}
                    onClick={clearSearchTerms}
                    alignSelf={{ base: 'flex-start', md: 'center' }}
                    flexShrink={0}
                  >
                    Clear all
                  </Button>
                </Flex>
              </Box>
            )}
          </VStack>
        </Box>

        {sessionDocuments.length === 0 && !documents.length && (
          <Box
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            borderRadius="8px"
            p={{ base: 7, md: 10 }}
            textAlign="center"
          >
            <Icon as={AttachmentIcon} boxSize={9} color="slate.400" mb="4" />
            <Heading size="md" color="slate.900">No session documents</Heading>
            <Text color="slate.500" mt="2">
              Upload files first, then return to search.
            </Text>
          </Box>
        )}

        {sessionDocuments.length > 0 && !documents.length && (
          <Box
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            borderRadius="8px"
            overflow="hidden"
          >
            <Flex px={{ base: 4, md: 5 }} py="4" justify="space-between" align="center" gap={3}>
              <Box>
                <Text fontWeight="900" color="slate.900">Documents in current session</Text>
                <Text fontSize="sm" color="slate.500">Ready to search</Text>
              </Box>
              <Badge colorScheme="green" borderRadius="full" px="3" py="1">
                {sessionDocuments.length} file{sessionDocuments.length === 1 ? '' : 's'}
              </Badge>
            </Flex>
            <Divider borderColor="slate.200" />
            <Box p={{ base: 4, md: 5 }}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
                {sessionDocuments.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </SimpleGrid>
            </Box>
          </Box>
        )}

        {documents.length > 0 && (
          <Box
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            borderRadius="8px"
            overflow="hidden"
          >
            <Flex px={{ base: 4, md: 5 }} py="4" justify="space-between" align="center" gap={3}>
              <Box>
                <Text fontWeight="900" color="slate.900">Search results</Text>
                <Text fontSize="sm" color="slate.500">Open a document to inspect highlighted matches</Text>
              </Box>
              <HStack spacing={3} wrap="wrap" justify="flex-end">
                <Badge colorScheme="blue" borderRadius="full" px="3" py="1">
                  {documents.length} result{documents.length === 1 ? '' : 's'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="green"
                  onClick={handleMergeView}
                  isDisabled={!documents.length}
                >
                  Merge View
                </Button>
              </HStack>
            </Flex>
            <Divider borderColor="slate.200" />
            <Box p={{ base: 4, md: 5 }}>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
                {documents.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </SimpleGrid>
            </Box>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default SearchResults;
