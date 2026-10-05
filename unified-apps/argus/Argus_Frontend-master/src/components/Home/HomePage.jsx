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
  Heading,
  Flex,
  Icon,
  Spinner,
  Divider,
} from "@chakra-ui/react";
import { AddIcon, AttachmentIcon, CheckCircleIcon, DeleteIcon } from "@chakra-ui/icons";
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

const formatTotalSize = (documents) => {
  const totalKb = documents.reduce((sum, doc) => {
    const sizeKb = Number(doc.file_size_kb);
    if (Number.isFinite(sizeKb)) return sum + sizeKb;
    const sizeMb = Number(doc.file_size_mb);
    return Number.isFinite(sizeMb) ? sum + sizeMb * 1024 : sum;
  }, 0);

  if (!totalKb) return "0 MB";
  if (totalKb >= 1024) return `${(totalKb / 1024).toFixed(1)} MB`;
  return `${Math.round(totalKb)} KB`;
};

const getTypeSummary = (documents) => {
  const types = Array.from(
    new Set(documents.map((doc) => doc.file_type).filter(Boolean)),
  );
  if (!types.length) return "No files";
  if (types.length <= 2) return types.join(", ");
  return `${types.slice(0, 2).join(", ")} +${types.length - 2}`;
};

const MetricCard = ({ label, value, hint, accent = "brand" }) => {
  const compactValue = String(value).length > 10;

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="slate.200"
      borderRadius="8px"
      p={{ base: 4, md: 5 }}
      boxShadow="0 18px 45px rgba(15, 23, 42, 0.05)"
    >
      <Text fontSize="xs" color="slate.500" fontWeight="800" textTransform="uppercase" letterSpacing="0">
        {label}
      </Text>
      <Text
        fontSize={compactValue ? { base: "lg", md: "xl" } : { base: "2xl", md: "3xl" }}
        fontWeight="900"
        color={`${accent}.700`}
        mt="1"
        noOfLines={1}
      >
        {value}
      </Text>
      <Text fontSize="sm" color="slate.500" mt="1" noOfLines={1}>
        {hint}
      </Text>
    </Box>
  );
};

const EmptySession = ({ onUpload }) => (
  <Box
    bg="white"
    border="1px solid"
    borderColor="slate.200"
    borderRadius="8px"
    p={{ base: 7, md: 10 }}
    textAlign="center"
    boxShadow="0 20px 55px rgba(15, 23, 42, 0.06)"
  >
    <Flex
      mx="auto"
      mb="5"
      w="64px"
      h="64px"
      align="center"
      justify="center"
      borderRadius="8px"
      bg="brand.50"
      color="brand.700"
      border="1px solid"
      borderColor="brand.100"
    >
      <Icon as={AttachmentIcon} boxSize={7} />
    </Flex>
    <Heading as="h2" size="md" color="slate.900" mb="2">
      No documents uploaded
    </Heading>
    <Text color="slate.500" maxW="480px" mx="auto">
      Add PDFs, documents, or images to begin the current ARGUS review session.
    </Text>
    <Button mt="6" leftIcon={<AddIcon />} onClick={onUpload}>
      Upload Documents
    </Button>
  </Box>
);

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
        credentials: "include",
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
  }, [toast]);

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
    <Container maxW="7xl" py={{ base: 4, md: 8 }}>
      <VStack spacing={{ base: 5, md: 7 }} align="stretch">
        <Flex
          justify="space-between"
          align={{ base: "stretch", lg: "end" }}
          flexDir={{ base: "column", lg: "row" }}
          gap={5}
        >
          <Box>
            <Text fontSize="sm" color="brand.700" fontWeight="900" letterSpacing="0">
              ARGUS WORKSPACE
            </Text>
            <Heading as="h1" size={{ base: "lg", md: "xl" }} color="slate.900" mt="2">
              Current session documents
            </Heading>
            <Text color="slate.600" mt="3" maxW="720px" lineHeight="1.7">
              Keep uploaded research documents, image files, and extracted evidence together in one active review session.
            </Text>
          </Box>
          <Flex
            gap={3}
            w={{ base: "full", lg: "auto" }}
            align="stretch"
            flexDir={{ base: "column", sm: "row" }}
          >
            <Button
              leftIcon={<AddIcon />}
              onClick={() => navigate("/upload")}
              w={{ base: "full", md: "auto" }}
            >
              Upload Documents
            </Button>
            <Button
              leftIcon={<DeleteIcon />}
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
          </Flex>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
          <MetricCard label="Documents" value={documents.length} hint="In the current session" />
          <MetricCard label="Total size" value={formatTotalSize(documents)} hint="Uploaded content" accent="accent" />
          <MetricCard label="File types" value={getTypeSummary(documents)} hint="Ready for review" />
        </SimpleGrid>

        {sysReviewPapers.length > 0 && (
          <Box
            borderWidth="1px"
            borderColor="brand.200"
            borderRadius="8px"
            p={5}
            bg="brand.50"
          >
            <HStack
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              flexDir={{ base: "column", md: "row" }}
              spacing={3}
              mb={4}
            >
              <Box>
                <Text fontSize="lg" fontWeight="900" color="brand.800">
                  SysReview Selection
                </Text>
                <Text color="slate.600">
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
                    borderColor="brand.100"
                    borderRadius="8px"
                    p={4}
                  >
                    <Text fontWeight="800" color="slate.900" noOfLines={2}>
                      {getPaperTitle(paper)}
                    </Text>
                    {getPaperAuthors(paper) && (
                      <Text fontSize="sm" color="slate.600" noOfLines={1} mt={2}>
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
          <Flex
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            borderRadius="8px"
            p={8}
            align="center"
            justify="center"
            gap={3}
          >
            <Spinner color="brand.500" />
            <Text color="slate.600" fontWeight="700">Loading current session...</Text>
          </Flex>
        ) : documents.length > 0 ? (
          <Box
            bg="white"
            border="1px solid"
            borderColor="slate.200"
            borderRadius="8px"
            boxShadow="0 20px 55px rgba(15, 23, 42, 0.06)"
            overflow="hidden"
          >
            <Flex
              px={{ base: 4, md: 5 }}
              py="4"
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              flexDir={{ base: "column", md: "row" }}
              gap={3}
            >
              <HStack>
                <Icon as={CheckCircleIcon} color="brand.600" />
                <Text fontWeight="900" color="slate.900">
                  Ready for review
                </Text>
              </HStack>
              <Button size="sm" variant="outline" onClick={() => navigate("/results")}>
                Open Search Results
              </Button>
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
        ) : (
          <EmptySession onUpload={() => navigate("/upload")} />
        )}
      </VStack>
    </Container>
  );
};

export default HomePage;
