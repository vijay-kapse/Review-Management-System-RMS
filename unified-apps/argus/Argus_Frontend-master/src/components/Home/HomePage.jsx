import {
  Box,
  Container,
  VStack,
  Text,
  SimpleGrid,
  Button,
  useToast,
  HStack,
  Badge,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DocumentCard from "../SearchResults/DocumentCard";

const SYSREVIEW_HANDOFF_KEY = "argus:sysreview-selection";

const getPaperTitle = (paper) => paper?.document?.title || "Untitled paper";
const getPaperAuthors = (paper) => {
  const authors = paper?.document?.authorNames;
  if (!Array.isArray(authors) || authors.length === 0) return "";
  return authors.slice(0, 3).join(", ");
};

const HomePage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearingUploads, setClearingUploads] = useState(false);
  const [sysReviewPapers, setSysReviewPapers] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchSessionDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/results/", {
        credentials: "include", // Add this line
      });
      if (!response.ok) throw new Error("Failed to fetch documents");

      const data = await response.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      toast({
        title: "Error fetching documents",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Add 'toast' because it comes from a hook and could change.

  useEffect(() => {
    fetchSessionDocuments();
  }, [fetchSessionDocuments]);

  useEffect(() => {
    const rawSelection = sessionStorage.getItem(SYSREVIEW_HANDOFF_KEY);
    if (!rawSelection) return;

    try {
      const parsedSelection = JSON.parse(rawSelection);
      setSysReviewPapers(Array.isArray(parsedSelection) ? parsedSelection : []);
    } catch (error) {
      console.error("Unable to read SysReview handoff", error);
      sessionStorage.removeItem(SYSREVIEW_HANDOFF_KEY);
      toast({
        title: "Unable to open SysReview selection",
        description: "The paper selection could not be loaded in ARGUS.",
        status: "error",
        duration: 5000,
      });
    }
  }, [toast]);

  const handleClearUploadedFiles = useCallback(async () => {
    if (!documents.length) {
      toast({
        title: "No uploaded files to clear",
        status: "info",
        duration: 3000,
      });
      return;
    }

    setClearingUploads(true);
    try {
      const response = await fetch("/api/clear_uploads/", {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRFToken": document.cookie.match(/csrftoken=([\w-]+)/)?.[1] || "",
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Failed to clear uploaded files");
      }

      setDocuments([]);
      toast({
        title: "Uploaded files cleared",
        description: `Removed ${data.deleted_count || 0} files from your current Argus session`,
        status: "success",
        duration: 4000,
      });
    } catch (error) {
      toast({
        title: "Failed to clear uploaded files",
        description: error.message,
        status: "error",
        duration: 5000,
      });
    } finally {
      setClearingUploads(false);
    }
  }, [documents.length, toast]);

  const clearSysReviewSelection = useCallback(() => {
    sessionStorage.removeItem(SYSREVIEW_HANDOFF_KEY);
    setSysReviewPapers([]);
  }, []);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
          flexDir={{ base: "column", md: "row" }}
          spacing={4}
        >
          <Text fontSize="2xl" fontWeight="bold" color="green.700">
            Current Session Documents
          </Text>
          <HStack spacing={3} w={{ base: "full", md: "auto" }}>
            <Button
              colorScheme="green"
              onClick={() => navigate("/upload")}
              w={{ base: "full", md: "auto" }}
            >
              Upload Documents
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={handleClearUploadedFiles}
              isLoading={clearingUploads}
              loadingText="Clearing..."
              isDisabled={loading || !documents.length}
              w={{ base: "full", md: "auto" }}
            >
              Clear Uploaded Files
            </Button>
          </HStack>
        </HStack>

        {sysReviewPapers.length > 0 && (
          <Box
            borderWidth="1px"
            borderColor="green.200"
            borderRadius="lg"
            p={5}
            bg="green.50"
          >
            <HStack
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              flexDir={{ base: "column", md: "row" }}
              spacing={3}
              mb={4}
            >
              <Box>
                <Text fontSize="lg" fontWeight="bold" color="green.800">
                  SysReview Selection
                </Text>
                <Text color="gray.700">
                  {sysReviewPapers.length} paper
                  {sysReviewPapers.length === 1 ? "" : "s"} sent from SysReview
                </Text>
              </Box>
              <Button
                variant="outline"
                colorScheme="green"
                onClick={clearSysReviewSelection}
                w={{ base: "full", md: "auto" }}
              >
                Clear Selection
              </Button>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {sysReviewPapers.slice(0, 12).map((paper, index) => {
                const paperUrl = paper?.document?.url;
                return (
                  <Box
                    key={`${paper.resultId || "paper"}-${index}`}
                    bg="white"
                    borderWidth="1px"
                    borderColor="green.100"
                    borderRadius="md"
                    p={4}
                  >
                    <Text fontWeight="bold" color="gray.800" noOfLines={2}>
                      {getPaperTitle(paper)}
                    </Text>
                    {getPaperAuthors(paper) && (
                      <Text fontSize="sm" color="gray.600" noOfLines={1} mt={2}>
                        {getPaperAuthors(paper)}
                      </Text>
                    )}
                    <HStack spacing={2} mt={3} wrap="wrap">
                      {paper.datasource && (
                        <Badge colorScheme="blue">{paper.datasource}</Badge>
                      )}
                      {paper.categoryLabel && (
                        <Badge colorScheme="purple">
                          {paper.categoryLabel}
                        </Badge>
                      )}
                      {paper.document?.publicationName && (
                        <Badge colorScheme="gray">
                          {paper.document.publicationName}
                        </Badge>
                      )}
                    </HStack>
                    {paperUrl && (
                      <Button
                        as="a"
                        href={paperUrl}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                        colorScheme="green"
                        variant="outline"
                        mt={4}
                      >
                        Open Paper
                      </Button>
                    )}
                  </Box>
                );
              })}
            </SimpleGrid>

            {sysReviewPapers.length > 12 && (
              <Text fontSize="sm" color="gray.600" mt={3}>
                Showing 12 of {sysReviewPapers.length} selected papers.
              </Text>
            )}
          </Box>
        )}

        {loading ? (
          <Text>Loading documents...</Text>
        ) : documents.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {documents.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </SimpleGrid>
        ) : (
          <Box textAlign="center" py={10}>
            <Text mb={4}>No documents uploaded in this session</Text>
            <Button colorScheme="green" onClick={() => navigate("/upload")}>
              Upload Documents
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default HomePage;
