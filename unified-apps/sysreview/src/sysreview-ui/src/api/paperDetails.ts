import axios from "axios";
import { paperDetailsType } from "./types";
import { getConfig } from "./utility";
import { API_URI } from "../constants";

// Abstracts and keywords cached by the relevance worker, keyed by normalized title.
// A failure here must never block the curation table, so callers treat it as "no details".
type returnPaperDetails = (projectId: number) => Promise<paperDetailsType[]>;
const getPaperDetails: returnPaperDetails = async (projectId) => {
  const resp = await axios.get(
    API_URI + "/projects/" + projectId + "/paper-details",
    getConfig()
  );
  return resp.data;
};

export { getPaperDetails };
