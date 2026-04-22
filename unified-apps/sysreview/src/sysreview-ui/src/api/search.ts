import axios from "axios";
import { API_URI } from "../constants";
import {
  categorySetType,
  datasourceKeyType,
  datasourceType,
  resultData,
} from "./types";
import { getConfig, processSearchResponse } from "./utility";

type returnSearchType = (data: {
  datasource: datasourceKeyType;
  queryText: string;
  dateRange?: { from: number; to: number };
  categories: categorySetType;
}) => Promise<resultData>;

const search: returnSearchType = async (data) => {
  const config = getConfig();
  console.log("Searching", data);

  let url =
    API_URI +
    "/search/" +
    data.datasource.toUpperCase() +
    "?queryText=" +
    data.queryText;

  if (data.dateRange) {
    url += "&from=" + data.dateRange.from + "&to=" + data.dateRange.to;
  }

  const resp = await axios.get(url, config);
  console.log(resp.data);

  const processedData = processSearchResponse(
    resp.data.documents,
    data.datasource as datasourceKeyType,
    data.categories
  );
  if (!processedData.length)
    alert("No results available for " + data.datasource);
  return {
    apiResultsCount: resp.data.apiResultsCount as number,
    documents: processedData,
  };
};

type returnDatasources = () => Promise<datasourceType>;
const getDataSources: returnDatasources = async () => {
  console.log("Fetching Datasources");
  const url = API_URI + "/search/datasources";

  const resp = await axios.get(url);
  console.log(resp.data);
  let out = {};
  resp.data.forEach((el: any) => {
    out[el.name] = { url: el.url };
  });
  return out as datasourceType;
};

export { search, getDataSources };
