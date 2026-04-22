import { createContext, useState } from "react";
import {
  datasourceKeyType,
  querySetType,
  queryType,
  resultType,
} from "../api/types";
import { v4 as uuidv4 } from "uuid";

type queryContexttype = {
  queries: querySetType;
  setQueries: (quer: querySetType) => void;
  removeQuery: (qId: string) => void;
  removeSource: (qId: string, source: string) => void;
  addResultToSource: (
    qId: string,
    count: number,
    source: datasourceKeyType,
    results: resultType[] | null
  ) => void;
  cloneQuery: (qId: string) => void;
};

const initialQueryState: queryContexttype = {
  queries: {},
  setQueries: () => {},
  removeQuery: () => {},
  removeSource: () => {},
  addResultToSource: () => {},
  cloneQuery: () => {},
};

export const QueryContext = createContext<queryContexttype>(initialQueryState);

export const QueryContextProvider = ({ children }) => {
  const [queries, setQueries] = useState<querySetType>(
    initialQueryState.queries
  );

  const removeQuery = (qId: string) => {
    let updatedQueries = { ...queries };
    delete updatedQueries[qId];
    setQueries(updatedQueries);
  };
  const removeSource = (qId: string, source: string) => {
    let updatedQueries = { ...queries };
    delete updatedQueries[qId]["searchResults"][source];
    setQueries(updatedQueries);
  };

  const addResultToSource = (
    qId: string,
    count: number,
    source: datasourceKeyType,
    results: resultType[] | null
  ) => {
    let updatedQueries = { ...queries };
    if (
      updatedQueries[qId].searchResults[source] &&
      updatedQueries[qId].searchResults[source].documents
    )
      return; // avoid overwrite of results
    updatedQueries[qId].searchResults[source] = {
      apiResultsCount: count,
      documents: results,
    };
    setQueries(updatedQueries);
  };

  const cloneQuery = (qId: string) => {
    if (!queries[qId]) return;
    const toClone = queries[qId];
    const newId: string = uuidv4();
    const newQuery: queryType = {
      ...toClone,
      query_name: `Copy of ${toClone.query_name || "New Query"}`,
      queryId: 0,
      searchResults: {},
    };
    setQueries({ ...queries, [newId]: newQuery });
  };

  const value = {
    queries,
    setQueries,
    removeQuery,
    removeSource,
    addResultToSource,
    cloneQuery,
  };

  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export default QueryContext;
