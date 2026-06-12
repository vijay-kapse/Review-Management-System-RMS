import { ANALYSER_API_URI } from "../constants";
import { resultType } from "./types";

const SAFE_GET_URL_LENGTH = 7000;

const compactResultForAnalyser = (result: resultType) => ({
  datasource: result.datasource,
  priority: result.priority,
  resultId: result.resultId,
  queryId: (result as any).queryId,
  queryName: (result as any).queryName,
  duplicateCount: (result as any).duplicateCount,
  duplicateSourceSummary: (result as any).duplicateSourceSummary,
  duplicateQuerySummary: (result as any).duplicateQuerySummary,
  categoryLabel: (result as any).categoryLabel,
  document: result.document,
});

const submitAnalyserPost = (payload: string) => {
  const targetName = `argus-handoff-${Date.now()}`;
  const openedWindow = window.open("", targetName);
  const form = document.createElement("form");
  form.action = ANALYSER_API_URI;
  form.method = "POST";
  form.target = openedWindow ? targetName : "_blank";
  form.style.display = "none";

  const jsonInput = document.createElement("input");
  jsonInput.type = "hidden";
  jsonInput.name = "json";
  jsonInput.value = payload;
  form.appendChild(jsonInput);

  const sourceInput = document.createElement("input");
  sourceInput.type = "hidden";
  sourceInput.name = "source";
  sourceInput.value = "sysreview";
  form.appendChild(sourceInput);

  document.body.appendChild(form);
  form.submit();
  form.remove();
  openedWindow?.focus();
};

export const openAnalyser = (rowData: resultType[]) => {
  if (!rowData.length) return;

  const payload = JSON.stringify(rowData.map(compactResultForAnalyser));
  const queryParams = `json=${encodeURIComponent(payload)}&source=sysreview`;
  const finalUrl = `${ANALYSER_API_URI}?${queryParams}`;

  if (rowData.length > 1 || finalUrl.length > SAFE_GET_URL_LENGTH) {
    submitAnalyserPost(payload);
    return;
  }

  window.open(finalUrl, "_blank")?.focus();
};
