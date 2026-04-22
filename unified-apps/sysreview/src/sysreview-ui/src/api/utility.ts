import {
  categorySetType,
  categoryType,
  datasourceKeyType,
  querySetType,
  queryType,
  resultCollectionType,
  resultData,
  resultDocumentType,
  resultType,
  userType,
} from "./types";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import Papa from "papaparse";

export const getToken = () => {
  const token = Cookies.get("token");
  return token || false;
};

export const setToken = (token: string) => {
  // console.log("Setting token:", token);

  if (!token) throw new Error("Token not provided to set");
  Cookies.set("token", token);
};

export const unsetToken = () => {
  Cookies.remove("token");
};

export const validateToken = () => {
  const token = getToken();
  if (!token) return false;
  const decodedToken = jwtDecode(token);
  if (!decodedToken.exp) return false;

  const current = new Date().getTime();
  const tokenIsExpired = current >= decodedToken.exp * 1000;
  return !tokenIsExpired;
};

export const getUserFromToken = () => {
  // console.log("getting user from token");
  const token = getToken();
  if (!token) return null;
  const decodedToken: any = jwtDecode(token);
  const { email, firstName, lastName, username, userId } = decodedToken;
  const user: userType = { email, firstName, lastName, username, userId };
  return user;
};

export const isTokenSet = () => {
  if (getToken()) return true;
  return false;
};

export const getConfig = () => {
  const token = getToken();
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

type returnUniqueResults = (
  results: resultCollectionType
) => resultCollectionType;
export const filterResultsByTitle: returnUniqueResults = (results) => {
  let f: string[] = [];

  const uniqueRes: resultCollectionType = {};

  Object.entries(results).forEach(([source, resData]) => {
    if (!resData.documents) {
      uniqueRes[source] = {
        ...resData,
        documents: [],
      };
      return;
    }
    const filtered = resData["documents"].filter((doc) => {
      if (doc.document.title.charAt(doc.document.title.length - 1) === ".") {
        doc.document.title = doc.document.title.slice(0, -1);
      }
      const index = f.indexOf(doc.document.title);
      if (index === -1) {
        f.push(doc.document.title);
        return true;
      } else {
        return false;
      }
    });
    uniqueRes[source] = {
      ...resData,
      documents: filtered,
    };
  });
  return uniqueRes;
};

// using app context's api call instead of this
// type returnDatasource = () => datasourceType[];
// export const getDataSources: returnDatasource = () => {
//   return ["IEEE", "WOS", "PUBMED", "MANUAL"];
// };

type returnMapping = (name: string) => Object;
export const getTemplateMapping: returnMapping = (name: string) => {
  const mapping: Object = require("../data/" + name + ".json");
  if (mapping) {
    return mapping;
  }
  throw Error(`Mapping not found:${mapping}`);
};

export const getSupportedTemplates = () => {
  return ["DEFAULT", "PUBMED", "IEEE", "WOS", "CUSTOM"];
};

type returnCategorySet = (cats: categoryType[]) => categorySetType;
export const createCategorySet: returnCategorySet = (cats) => {
  let catSet = {};
  cats.forEach((cat) => {
    catSet[cat.categoryId.toString()] = { ...cat };
  });

  return catSet;
};

type returnProcessedSearchResponse = (
  data: resultDocumentType[],
  source: datasourceKeyType,
  categories: categorySetType
) => resultType[];
export const processSearchResponse: returnProcessedSearchResponse = (
  data,
  source,
  categories
) => {
  const defaultCat = Object.values(categories)[0];
  const processedData: resultType[] = data.map((doc) => {
    return {
      datasource: source,
      priority: defaultCat.priority,
      document: doc,
      resultId: 0,
    };
  });
  return processedData;
};

// helper function to get the apiCountMap from searchResults property of each query
type returnResultsAndCount = (results: resultCollectionType) => {
  countMap: { [key: string]: number };
  results: { [key: string]: resultType[] };
};
export const extractResultsAndApiCountMap: returnResultsAndCount = (
  results
) => {
  let map = {
    countMap: {},
    results: {},
  };
  console.log(results);
  Object.entries(results).forEach(([source, resData]) => {
    map.results[source] = resData.documents;
    map.countMap[source] = resData.apiResultsCount;
  });
  return map;
};

// helper function to add apiResultCount in the searchResults property of each query
type returnProcessedQueryResponse = (queries: any[]) => queryType[];
export const processQueryResponse: returnProcessedQueryResponse = (queries) => {
  const processedData: queryType[] = queries.map((q) => {
    const temp: resultCollectionType = {};
    Object.entries(q.datasourceApiFetchCount).forEach(([source, count]) => {
      const docs = q.searchResults[source] || [];
      temp[source] = {
        apiResultsCount: (count as number) || (docs as resultType[]).length,
        documents: docs as resultType[],
      };
    });

    return {
      ...q,
      searchResults: temp,
    };
  });
  return processedData;
};

type returnColor = (cats: categorySetType, p: number) => string;
export const getCategoryColor: returnColor = (cats, p) => {
  const cat = Object.values(cats).find(({ priority }) => priority === p);
  return cat?.color || "#00000";
};

type returnLabel = (cats: categorySetType, p: number) => string;
export const getCategoryLabel: returnLabel = (cats, p) => {
  const cat = Object.values(cats).find(({ priority }) => priority === p);
  return cat?.label || "";
};

// flattens the resultData[] into ResultType[]
type returnMergedResults = (res: resultData[]) => resultType[];
export const mergeResults: returnMergedResults = (res) => {
  let mergedResults: resultType[] = [];
  res.forEach(({ documents }) => {
    // falttening the 2D array
    if (documents) mergedResults = mergedResults.concat(documents);
  });
  // const uniqueRes = filterResultsByTitle(mergedResults);
  return mergedResults;
};

type returnObjectArray = (csvContent: string) => Object[];
export const csvToJson: returnObjectArray = (csvContent: string) => {
  const json = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
  }).data as Object[];
  return json.slice(0, -1);
};

type returnDocs = (
  sourceJson: Object[],
  mapping: Object
) => resultDocumentType[];
export const convertToDocType: returnDocs = (sourceJsonArray, mapping) => {
  let docs: resultDocumentType[] = [];
  sourceJsonArray.forEach((sourceJson) => {
    const temp = {};
    // following fields are of array type in db
    const arrayTargetFields = [
      "affiliationCountry",
      "affiliationNames",
      "authorNames",
    ];
    Object.entries(mapping).forEach(([sourceKey, targetKey]) => {
      if (arrayTargetFields.includes(targetKey)) {
        temp[targetKey] = sourceJson[sourceKey]?.split(",");
      } else {
        temp[targetKey] = sourceJson[sourceKey];
      }
    });
    docs.push(temp as resultDocumentType);
  });

  return docs;
};

type returnCopier = (text: string) => Promise<boolean>;
export const copyToClipboard: returnCopier = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    return false;
  }
};

export type resultStatsType = {
  sources: {
    [key: string]: number;
  };
  total: number;
};

type returnResultStats = (results: resultCollectionType) => resultStatsType;
export const getResultStats: returnResultStats = (results) => {
  const uniqueResults = mergeResults(Object.values(results));

  let sourcesInitialCount: { [key: string]: number } = {};
  let stats = {
    sources: sourcesInitialCount,
    total: 0,
  };

  uniqueResults.forEach((result) => {
    if (!stats["sources"][result.datasource]) {
      stats["sources"][result.datasource] = 0;
    }
    stats["sources"][result.datasource] += 1;
  });
  stats["total"] = Object.values(stats["sources"]).reduce(
    (acc, i) => acc + i,
    0
  );
  return stats;
};

type returnQueriesStats = (
  queries: querySetType,
  datasources: datasourceKeyType[]
) => {
  sources: { [key: string]: number };
  total: number;
};
export const getQueriesStats: returnQueriesStats = (queries, datasources) => {
  let sourcesInitialCount: { [key: string]: number } = {};
  let stats = {
    sources: sourcesInitialCount,
    total: 0,
  };

  Object.values(queries).forEach((query) => {
    const { sources } = getResultStats(query.searchResults);
    datasources.forEach((src) => {
      if (!stats["sources"][src]) {
        stats["sources"][src] = 0;
      }
      stats["sources"][src] += sources[src] || 0;
    });
  });
  stats["total"] = Object.values(stats["sources"]).reduce(
    (acc: number, i) => acc + i,
    0
  );
  return stats;
};

// converts array of objects into a object with idKey as key
export const arrayToObject = (data: Object[], idKey: string) => {
  let object = {};
  data.forEach((d) => {
    if (d[idKey] === "undefined") {
      throw new Error(
        `utility:arrayToObject | ${idKey} not present in the object`
      );
    }
    object[d[idKey]] = d;
  });
  return object;
};

export const getDatePickerDefaults = () => {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 5);
  const to = new Date();
  return [from, to];
};

// converts the Date object to YYYY-MM format string
export const dateToString = (date: Date) => {
  const month = ("0" + (date.getMonth() + 1).toString()).slice(-2); // increase month by 1 since dateRangePicker gives jan = 0
  const year = date.getFullYear().toString();
  return year + "-" + month;
};

// converts the  YYYY-MM format string to Date object
export const stringToDate = (date: string) => {
  return new Date(date + "-1");
};
