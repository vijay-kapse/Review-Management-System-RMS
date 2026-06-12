export type projectType = {
  projectId: number;
  projectName: string;
  description: string;
  owner: string;
  collections: number[];
};

export type querySetType = {
  [qId: string]: queryType;
};

export type userType = {
  email: string;
  firstName: string;
  lastName: string;
  userId: number;
  username: string;
};

export type datasourceKeyType = "IEEE" | "WOS" | "PUBMED" | "SCOPUS" | "MANUAL";

export type datasourceType = {
  [key in datasourceKeyType]: { url: string };
};

// export type datasourceType = {
//   IEEE: { url: string };
//   WOS: { url: string };
//   PUBMED: { url: string };
//   MANUAL: { url: string };
// };

export type resultData = {
  apiResultsCount: number;
  documents: resultType[] | null;
};

export type resultCollectionType = {
  [source: string]: resultData;
};

export type queryType = {
  queryId: number;
  query_name: string;
  searchText: string;
  format?: string;
  fromMonth?: string;
  toMonth?: string;
  includeRange?: boolean;
  searchResults: resultCollectionType;
};

export type resultDocumentType = {
  affiliationCountry: string[];
  affiliationNames: string[];
  articleDate: string;
  authorNames: string[];
  issn: string;
  publicationName: string;
  title: string;
  url: string;
};

export type resultType = {
  datasource: datasourceKeyType;
  priority: number;
  resultId: number;
  document: resultDocumentType;
};

export type projectResultOccurrenceType = resultType & {
  queryId: number;
  queryName: string;
};

export type projectResultType = resultType & {
  queryId: number;
  queryName: string;
  duplicateCount: number;
  duplicateResultIds: number[];
  duplicateQueryIds: number[];
  duplicateSourceSummary: string;
  duplicateQuerySummary: string;
  categoryLabel?: string;
  categoryColor?: string;
  occurrences: projectResultOccurrenceType[];
};

export type categorySetType = {
  [cId: string]: categoryType;
};

export type categoryType = {
  categoryId: number;
  color: string;
  label: string;
  priority: number;
};
