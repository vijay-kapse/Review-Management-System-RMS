import axios from "axios";
import { keywordSuggestionType } from "./types";
import { getConfig } from "./utility";
import { API_URI } from "../constants";

// Runs on the server's local CPU model, so it takes 15-30 s (longer if the relevance worker is
// mid-paper). Callers must keep manual keyword entry working when this fails.
type returnKeywordSuggestion = (question: string) => Promise<keywordSuggestionType>;
const suggestKeywords: returnKeywordSuggestion = async (question) => {
  const resp = await axios.post(
    API_URI + "/keywords/suggest",
    { question },
    { ...getConfig(), timeout: 200000 }
  );
  return resp.data;
};

export { suggestKeywords };
