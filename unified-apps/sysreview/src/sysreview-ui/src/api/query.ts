import axios from "axios";
import { queryType } from "./types";
import { API_URI } from "../constants";
import {
  getConfig,
  extractResultsAndApiCountMap,
  processQueryResponse,
  filterResultsByTitle,
} from "./utility";

type returnQueries = (pId: number) => Promise<queryType[]>;

const getQueries: returnQueries = async (pId) => {
  const config = getConfig();

  console.log("Fetching Queries for project", pId);
  const url = API_URI + "/queries/project/" + pId;

  const resp = await axios.get(url, config);
  console.log(resp.data);
  const processedQueries = processQueryResponse(resp.data);
  return processedQueries;
};

type returnQuery = (pId: number) => Promise<queryType>;

const getQuery: returnQuery = async (id) => {
  const config = getConfig();

  console.log("Fetching Query", id);
  const url = API_URI + "/queries/" + id;

  const resp = await axios.get(url, config);
  console.log(resp.data);
  const processedQueries = processQueryResponse([resp.data]);
  return processedQueries[0];
};
type returnSavedQuery = (pId: number, data: queryType) => Promise<queryType>;
const postQuery: returnSavedQuery = async (pId, data) => {
  const config = getConfig();
  const uniqueResults = filterResultsByTitle(data.searchResults);
  const { results, countMap } = extractResultsAndApiCountMap(uniqueResults);
  const body = {
    projectId: pId,
    ...data,
    searchResults: results,
    datasourceApiFetchCount: countMap,
  };
  console.log("Saving queries", body);
  const url = API_URI + "/queries";

  const resp = await axios.post(url, body, config);
  console.log(resp.data);
  const processedQueries = processQueryResponse([resp.data]);
  return processedQueries[0];
};

type returnDeletedQuery = (qId: number) => Promise<boolean>;
const deleteQuery: returnDeletedQuery = async (qId) => {
  const config = getConfig();

  console.log("Deleting query", qId);
  const url = API_URI + "/queries/" + qId;

  const resp = await axios.delete(url, config);
  console.log(resp.data);
  return true;
};

type returnUpdatedQuery = (
  id: number,
  resultIds: number[],
  priority: number
) => Promise<void>;
const updateQuery: returnUpdatedQuery = async (id, resultIds, priority) => {
  const config = getConfig();
  const body = resultIds.map((resultId) => {
    return { resultId, priority };
  });
  console.log("Updating query", body);

  const url = API_URI + "/queries/results/" + id;
  const resp = await axios.patch(url, body, config);
  console.log(resp.data);
  return resp.data;
};

export { getQueries, postQuery, getQuery, updateQuery, deleteQuery };
