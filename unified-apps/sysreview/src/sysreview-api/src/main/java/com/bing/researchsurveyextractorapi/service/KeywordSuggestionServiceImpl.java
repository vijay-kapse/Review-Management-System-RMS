package com.bing.researchsurveyextractorapi.service;

import com.bing.researchsurveyextractorapi.pojo.keywords.KeywordConceptDto;
import com.bing.researchsurveyextractorapi.pojo.keywords.KeywordSuggestionDto;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Suggests search concepts and terms for a research question using the local model that also
 * judges relevance (llama-server, CPU only, never leaves the server). The model only suggests:
 * the user picks, edits and adds terms in the UI before anything becomes a query.
 */
@Slf4j
@Service
public class KeywordSuggestionServiceImpl implements KeywordSuggestionService {

    private static final String SYSTEM_PROMPT =
            "You help researchers build boolean search queries for scholarly databases such as Scopus, IEEE Xplore and Web of Science.\n"
                    + "Split the research question into its 2 to 5 core concepts. Each concept is ONE idea that a relevant paper must mention "
                    + "(for example 'social media' and 'information diffusion' are two separate concepts).\n"
                    + "For each concept list 3 to 8 search terms that papers actually use: the plain term, synonyms, abbreviations, "
                    + "and British/American spelling variants. Each term is 1 to 3 words. Use * for truncation only where it clearly helps (tweet*). "
                    + "Never use generic words such as study, analysis, method, approach, framework, impact.\n"
                    + "Answer with one line per concept and nothing else, in this exact format:\n"
                    + "Concept name: term; term; term";

    private static final int MAX_QUESTION_CHARS = 2000;
    private static final int MAX_CONCEPTS = 6;
    private static final int MAX_TERMS = 10;
    private static final int MAX_TERM_WORDS = 5;
    private static final int MAX_TERM_CHARS = 60;

    private static final Pattern LIST_MARKER = Pattern.compile("^[\\s\\-*•#>]*(\\d+[.)]\\s*)?");
    private static final Pattern TERM_SEPARATOR = Pattern.compile("[;,]");
    private static final Pattern EDGE_JUNK = Pattern.compile("^[\\s\"'`.*]+|[\\s\"'`.;:]+$");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    @Value("${relevance.llm.url:http://127.0.0.1:8090}")
    private String llmUrl;

    @Value("${relevance.llm.model:Qwen3.5-9B}")
    private String modelName;

    private final RestTemplate restTemplate;

    public KeywordSuggestionServiceImpl() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3000);
        // CPU generation takes 15-30 s, plus up to one paper's scoring if the worker is mid-request.
        factory.setReadTimeout(180000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public KeywordSuggestionDto suggest(String question) {
        String trimmed = question == null ? "" : question.trim();
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a research question first");
        }
        if (trimmed.length() > MAX_QUESTION_CHARS) {
            trimmed = trimmed.substring(0, MAX_QUESTION_CHARS);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("messages", Arrays.asList(
                message("system", SYSTEM_PROMPT),
                message("user", "Research question: " + trimmed)));
        body.put("temperature", 0.2);
        body.put("max_tokens", 400);
        body.put("chat_template_kwargs", Collections.singletonMap("enable_thinking", false));

        JsonNode response;
        try {
            response = restTemplate.postForObject(llmUrl + "/v1/chat/completions", body, JsonNode.class);
        } catch (RestClientException e) {
            log.warn("Keyword suggestion model unavailable: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The keyword model is not available right now. You can still add your own keywords.");
        }
        String content = response == null ? "" : response.path("choices").path(0).path("message").path("content").asText("");
        return KeywordSuggestionDto.builder()
                .concepts(parseConcepts(content))
                .model(modelName)
                .build();
    }

    private static Map<String, String> message(String role, String content) {
        Map<String, String> message = new HashMap<>();
        message.put("role", role);
        message.put("content", content);
        return message;
    }

    /** Reads "Concept: term; term" lines, tolerating list markers, bold and comma separators. */
    static List<KeywordConceptDto> parseConcepts(String content) {
        List<KeywordConceptDto> concepts = new ArrayList<>();
        Set<String> seenConcepts = new HashSet<>();
        for (String rawLine : content.split("\\r?\\n")) {
            String line = LIST_MARKER.matcher(rawLine.replace("**", "")).replaceFirst("").trim();
            int colon = line.indexOf(':');
            if (colon <= 0) continue;
            String label = cleanTerm(line.substring(0, colon));
            if (label.isEmpty() || !seenConcepts.add(label.toLowerCase(Locale.ROOT))) continue;

            List<String> terms = new ArrayList<>();
            Set<String> seenTerms = new HashSet<>();
            // The concept name is usually the plainest term, and the model often leaves it out.
            if (isUsableTerm(label)) {
                terms.add(label);
                seenTerms.add(label.toLowerCase(Locale.ROOT));
            }
            for (String piece : TERM_SEPARATOR.split(line.substring(colon + 1))) {
                String term = cleanTerm(piece);
                if (!isUsableTerm(term) || !seenTerms.add(term.toLowerCase(Locale.ROOT))) continue;
                terms.add(term);
                if (terms.size() == MAX_TERMS) break;
            }
            if (terms.isEmpty()) continue;
            concepts.add(KeywordConceptDto.builder().concept(label).terms(terms).build());
            if (concepts.size() == MAX_CONCEPTS) break;
        }
        return concepts;
    }

    private static String cleanTerm(String raw) {
        String collapsed = WHITESPACE.matcher(raw).replaceAll(" ");
        return EDGE_JUNK.matcher(collapsed).replaceAll("").replace("\"", "");
    }

    private static boolean isUsableTerm(String term) {
        return !term.isEmpty()
                && term.length() <= MAX_TERM_CHARS
                && term.split(" ").length <= MAX_TERM_WORDS;
    }
}
