import { FC, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { IoCloseSharp } from "react-icons/io5";
import { FiArrowLeft, FiEdit2, FiExternalLink, FiList, FiRefreshCw } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi";
import {
  categorySetType,
  datasourceKeyType,
  projectType,
  queryRefetchType,
  queryType,
  resultCollectionType,
  resultType,
} from "../../api/types";
import { refetchQuery } from "../../api/query";
import { search } from "../../api/search";
import {
  copyToClipboard,
  getPaperUrl,
  mergeResults,
  normalizeResultTitle,
} from "../../api/utility";
import AppContext from "../../contexts/AppContext";
import { APP_URI_PREFIX } from "../../constants";
import DateRangePicker from "./DateRangePicker";
import KeywordAssistant from "./KeywordAssistant";

interface QueriesModalProps {
  show: boolean;
  onHide: () => void;
  queries: queryType[];
  // Opens straight on one query (from the table's Queries column); null shows the list.
  initialQueryId: number | null;
  project: projectType;
  categories: categorySetType;
  // Called after a refetch is saved, so the page can reload its papers.
  onRefetched: (summary: queryRefetchType) => void;
}

type draftType = {
  name: string;
  searchText: string;
  fromMonth?: string;
  toMonth?: string;
  includeRange: boolean;
  sources: datasourceKeyType[];
};

type fetchStateType = {
  status: "loading" | "done" | "error";
  apiResultsCount?: number;
  documents?: resultType[];
  error?: string;
};

const MAX_QUERY = 3000;

// Same key the server, the worker and the curation table group papers on.
const paperKey = (result: resultType) =>
  normalizeResultTitle(result.document.title) ||
  ((result.document.url || "").trim().toLowerCase()
    ? "url:" + (result.document.url || "").trim().toLowerCase()
    : "");

const apiSources = (query: queryType) =>
  Object.keys(query.searchResults).filter(
    (source) => source !== "MANUAL",
  ) as datasourceKeyType[];

const describeRange = (query: { fromMonth?: string; toMonth?: string }) =>
  query.fromMonth && query.toMonth
    ? `${query.fromMonth} to ${query.toMonth}`
    : query.fromMonth
      ? `From ${query.fromMonth}`
      : query.toMonth
        ? `Up to ${query.toMonth}`
        : "Any date";

const errorText = (e: any) =>
  e?.response?.data?.message ||
  (e?.response?.status ? `HTTP ${e.response.status}` : e?.message) ||
  "failed";

const QueriesModal: FC<QueriesModalProps> = ({
  show,
  onHide,
  queries,
  initialQueryId,
  project,
  categories,
  onRefetched,
}) => {
  const { datasources } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState<number | null>(initialQueryId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<draftType | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [fetches, setFetches] = useState<{ [source: string]: fetchStateType }>({});
  const [fetchedFor, setFetchedFor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<queryRefetchType | null>(null);
  const [showFullQuestion, setShowFullQuestion] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!show) return;
    setSelectedId(initialQueryId);
    setEditing(false);
    setSaved(null);
  }, [show, initialQueryId]);

  const query = queries.find((q) => q.queryId === selectedId) || null;
  const defaultCategory = Object.values(categories)[0];
  const searchableSources = Object.keys(datasources).filter(
    (source) => source !== "MANUAL",
  ) as datasourceKeyType[];

  const startEditing = () => {
    if (!query) return;
    setDraft({
      name: query.query_name,
      searchText: query.searchText,
      fromMonth: query.fromMonth,
      toMonth: query.toMonth,
      includeRange: !!(query.fromMonth || query.toMonth),
      sources: apiSources(query),
    });
    setFetches({});
    setFetchedFor("");
    setSaveError("");
    setSaved(null);
    setShowAssistant(false);
    setShowFullQuestion(false);
    setEditing(true);
  };

  const stopEditing = () => {
    setEditing(false);
    setDraft(null);
    setFetches({});
    setSaveError("");
  };

  const openQuery = (id: number | null) => {
    stopEditing();
    setSaved(null);
    setSelectedId(id);
  };

  // A refetch is only valid for the exact text, range and sources it was run with.
  const draftSignature = draft
    ? JSON.stringify([
        draft.searchText.trim(),
        draft.includeRange ? [draft.fromMonth, draft.toMonth] : null,
        [...draft.sources].sort(),
      ])
    : "";
  const fetchIsCurrent = !!draft && fetchedFor === draftSignature;
  const fetchStates = Object.values(fetches);
  const fetching = fetchStates.some((f) => f.status === "loading");
  const fetchFailed = fetchStates.some((f) => f.status === "error");
  const fetchDone =
    fetchIsCurrent &&
    !!draft?.sources.length &&
    draft.sources.every((source) => fetches[source]?.status === "done");

  const range = useMemo<[string, string]>(
    () => [draft?.fromMonth || "", draft?.toMonth || ""],
    [draft?.fromMonth, draft?.toMonth],
  );

  const runFetch = async () => {
    if (!draft) return;
    const text = draft.searchText.trim();
    if (!text) return;
    const signature = draftSignature;
    const initial: { [source: string]: fetchStateType } = {};
    draft.sources.forEach((source) => (initial[source] = { status: "loading" }));
    setFetches(initial);
    setFetchedFor(signature);
    setSaveError("");
    // One source at a time, as a reviewer would; Web of Science allows few searches a day.
    for (const source of draft.sources) {
      try {
        const searchData: any = { datasource: source, queryText: text, categories, quiet: true };
        if (draft.includeRange && draft.fromMonth && draft.toMonth) {
          searchData.dateRange = { from: draft.fromMonth, to: draft.toMonth };
        }
        const data = await search(searchData);
        setFetches((current) => ({
          ...current,
          [source]: {
            status: "done",
            apiResultsCount: data.apiResultsCount,
            documents: data.documents || [],
          },
        }));
      } catch (e) {
        setFetches((current) => ({
          ...current,
          [source]: { status: "error", error: errorText(e) },
        }));
      }
    }
  };

  // What saving would do, by paper (title key), against this query's API-source papers.
  const preview = useMemo(() => {
    if (!query || !draft || !fetchDone) return null;
    const currentRows = mergeResults(
      apiSources(query).map((source) => query.searchResults[source]),
    );
    const current = new Map<string, resultType>();
    currentRows.forEach((row) => {
      const key = paperKey(row);
      if (key && !current.has(key)) current.set(key, row);
    });
    const incoming = new Map<string, resultType>();
    draft.sources.forEach((source) =>
      (fetches[source]?.documents || []).forEach((row) => {
        const key = paperKey(row);
        if (key && !incoming.has(key)) incoming.set(key, row);
      }),
    );
    const kept = Array.from(incoming.keys()).filter((key) => current.has(key));
    const added = Array.from(incoming.entries())
      .filter(([key]) => !current.has(key))
      .map(([, row]) => row);
    const removed = Array.from(current.entries())
      .filter(([key]) => !incoming.has(key))
      .map(([, row]) => row);
    const removedCategorized = removed.filter(
      (row) => defaultCategory && row.priority !== defaultCategory.priority,
    );
    return { kept: kept.length, added, removed, removedCategorized };
  }, [query, draft, fetchDone, fetches, defaultCategory]);

  const save = () => {
    if (!query || !draft || !preview) return;
    if (
      preview.removed.length &&
      !window.confirm(
        `${preview.removed.length} paper${preview.removed.length === 1 ? "" : "s"} the new search did not return will be removed from this query` +
          (preview.removedCategorized.length
            ? `, including ${preview.removedCategorized.length} you had put in a category other than "${defaultCategory?.label}"`
            : "") +
          ". Continue?",
      )
    )
      return;
    const searchResults: resultCollectionType = {};
    draft.sources.forEach((source) => {
      const state = fetches[source];
      searchResults[source] = {
        apiResultsCount: state.apiResultsCount || 0,
        documents: state.documents || [],
      };
    });
    const body: queryType = {
      queryId: query.queryId,
      query_name: draft.name.trim() || query.query_name,
      searchText: draft.searchText.trim(),
      fromMonth: draft.includeRange ? draft.fromMonth : undefined,
      toMonth: draft.includeRange ? draft.toMonth : undefined,
      searchResults,
    };
    setSaving(true);
    setSaveError("");
    refetchQuery(query.queryId, body)
      .then((summary) => {
        setSaved(summary);
        stopEditing();
        onRefetched(summary);
      })
      .catch((e) => setSaveError(errorText(e)))
      .finally(() => setSaving(false));
  };

  const question = project.researchQuestion?.trim() || "";
  const longQuestion = question.split("\n").length > 4 || question.length > 400;
  const researchQuestionBlock = (
    <div className="query-modal-block">
      <div className="query-modal-label">Research question</div>
      {question ? (
        <>
          <div
            className={`query-modal-text ${
              longQuestion && !showFullQuestion ? "is-clamped" : ""
            }`}
          >
            {question}
          </div>
          {longQuestion && (
            <button
              type="button"
              className="query-modal-more"
              onClick={() => setShowFullQuestion(!showFullQuestion)}
            >
              {showFullQuestion ? "Show less" : "Show all"}
            </button>
          )}
        </>
      ) : (
        <div className="text-muted">
          No research question yet. Add one in Project settings so the model
          can rate papers against it.
        </div>
      )}
    </div>
  );

  const paperList = (rows: resultType[], label: string) =>
    rows.length > 0 && (
      <details className="query-modal-papers">
        <summary>{label}</summary>
        <ul>
          {rows.map((row, i) => {
            const url = getPaperUrl(row);
            return (
              <li key={i}>
                {row.document.title}{" "}
                {url && (
                  <a href={url} target="_blank" rel="noreferrer">
                    <FiExternalLink />
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    );

  const listView = (
    <>
      {researchQuestionBlock}
      <div className="query-modal-list">
        {queries.map((q) => {
          const papers = mergeResults(Object.values(q.searchResults)).length;
          return (
            <button
              type="button"
              key={q.queryId}
              className="query-modal-row"
              onClick={() => openQuery(q.queryId)}
            >
              <span className="query-modal-row-name">{q.query_name}</span>
              <span className="query-modal-row-text">{q.searchText}</span>
              <span className="query-modal-row-meta">
                {papers} paper{papers === 1 ? "" : "s"} ·{" "}
                {Object.keys(q.searchResults).join(", ") || "no sources"} ·{" "}
                {describeRange(q)}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const detailView = query && (
    <>
      {saved && (
        <Alert variant="success" className="query-modal-alert">
          Saved. {saved.kept} found again (category and rating kept),{" "}
          {saved.added} new, {saved.removed} removed
          {saved.removedFromCollections > 0 &&
            ` (and taken out of ${saved.removedFromCollections} collection entr${saved.removedFromCollections === 1 ? "y" : "ies"})`}
          .{saved.added > 0 && project.researchQuestion?.trim() &&
            " The model rates new papers in the background; the table fills in by itself."}
        </Alert>
      )}
      {researchQuestionBlock}
      {!editing || !draft ? (
        <>
          <div className="query-modal-block">
            <div className="query-modal-label d-flex justify-content-between align-items-center">
              Query
              <button
                type="button"
                className="query-modal-more"
                onClick={() =>
                  copyToClipboard(query.searchText)
                    .then(() => {
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    })
                    .catch(() => setCopied(false))
                }
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="query-modal-query">{query.searchText}</pre>
          </div>
          <div className="query-modal-facts">
            <div>
              <small>Published</small>
              <span>{describeRange(query)}</span>
            </div>
            {Object.entries(query.searchResults).map(([source, res]) => (
              <div key={source}>
                <small>{source}</small>
                <span>
                  {res.documents?.length || 0} saved
                  {source !== "MANUAL" && ` of ${res.apiResultsCount || 0} found`}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <Form.Group className="mb-3">
            <Form.Label className="query-modal-label">Name</Form.Label>
            <Form.Control
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label className="query-modal-label d-flex justify-content-between align-items-center">
              Query
              <Button
                className={`keyword-assistant-toggle ${showAssistant ? "is-open" : ""}`}
                aria-expanded={showAssistant}
                onClick={() => setShowAssistant(!showAssistant)}
              >
                <HiOutlineSparkles /> Keywords
              </Button>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={7}
              className="query-modal-query-input"
              value={draft.searchText}
              maxLength={MAX_QUERY}
              onChange={(e) => setDraft({ ...draft, searchText: e.target.value })}
            />
            <Form.Text muted>
              {draft.searchText.length} / {MAX_QUERY} characters
            </Form.Text>
          </Form.Group>
          {showAssistant && (
            <KeywordAssistant
              researchQuestion={project.researchQuestion}
              currentQuery={draft.searchText}
              onUseQuery={(text) => setDraft({ ...draft, searchText: text })}
            />
          )}
          <DateRangePicker
            disabled={false}
            includeRange={draft.includeRange}
            range={range}
            setRange={([from, to]) =>
              setDraft({
                ...draft,
                fromMonth: from || undefined,
                toMonth: to || undefined,
                includeRange: !!from,
              })
            }
          />
          <div className="query-modal-block">
            <div className="query-modal-label">Search these sources</div>
            <div className="d-flex flex-wrap gap-3">
              {searchableSources.map((source) => (
                <Form.Check
                  key={source}
                  id={`refetch-source-${source}`}
                  type="checkbox"
                  label={source}
                  checked={draft.sources.includes(source)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      sources: e.target.checked
                        ? [...draft.sources, source]
                        : draft.sources.filter((s) => s !== source),
                    })
                  }
                />
              ))}
            </div>
            <div className="query-modal-note">
              Papers from a source you untick are removed from this query.
              {query.searchResults.MANUAL &&
                (query.searchResults.MANUAL.documents?.length === 1
                  ? " The 1 uploaded (MANUAL) paper stays as it is."
                  : ` The ${query.searchResults.MANUAL.documents?.length || 0} uploaded (MANUAL) papers stay as they are.`)}
              {draft.sources.includes("WOS") &&
                " Web of Science allows only a few searches a day."}
            </div>
          </div>

          {fetchStates.length > 0 && fetchIsCurrent && (
            <div className="query-modal-fetches">
              {draft.sources.map((source) => {
                const state = fetches[source];
                return (
                  <div key={source} className={`query-modal-fetch is-${state?.status}`}>
                    <strong>{source}</strong>
                    {state?.status === "loading" && (
                      <span>
                        <Spinner size="sm" /> searching…
                      </span>
                    )}
                    {state?.status === "done" && (
                      <span>
                        {state.documents?.length || 0} fetched of{" "}
                        {state.apiResultsCount || 0} found
                      </span>
                    )}
                    {state?.status === "error" && (
                      <span>Search failed: {state.error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {fetchStates.length > 0 && !fetchIsCurrent && (
            <div className="query-modal-note">
              The query changed since the last fetch. Fetch again to see what it returns.
            </div>
          )}

          {preview && (
            <div className="query-modal-preview">
              <div className="query-modal-label">If you save</div>
              <ul>
                <li>
                  <strong>{preview.kept}</strong>{" "}
                  {preview.kept === 1
                    ? "paper found again keeps its"
                    : "papers found again keep their"}{" "}
                  category and model rating.
                </li>
                <li>
                  <strong>{preview.added.length}</strong> new paper
                  {preview.added.length === 1 ? "" : "s"} (a paper already
                  categorized elsewhere in the project keeps that category).
                </li>
                <li>
                  <strong>{preview.removed.length}</strong> paper
                  {preview.removed.length === 1 ? "" : "s"} no longer returned will be
                  removed from this query
                  {preview.removedCategorized.length > 0 &&
                    `, ${preview.removedCategorized.length} of them in a category other than "${defaultCategory?.label}"`}
                  .
                </li>
              </ul>
              {paperList(preview.added, `Show the ${preview.added.length} new`)}
              {paperList(preview.removed, `Show the ${preview.removed.length} to be removed`)}
            </div>
          )}
          {saveError && (
            <Alert variant="danger" className="query-modal-alert">
              Could not save: {saveError}. Nothing was changed.
            </Alert>
          )}
        </>
      )}
    </>
  );

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      scrollable
      className="c-modal workspace-modal query-modal"
    >
      <Modal.Header className="workspace-modal__header">
        <div>
          <div className="workspace-modal__eyebrow">
            <FiList />
            {query ? "Saved query" : "Saved queries"}
          </div>
          <Modal.Title>{query ? query.query_name : `${queries.length} queries`}</Modal.Title>
          {query && (
            <button
              type="button"
              className="query-modal-back"
              onClick={() => openQuery(null)}
            >
              <FiArrowLeft /> All queries
            </button>
          )}
        </div>
        <button
          type="button"
          className="workspace-modal__close"
          aria-label="Close"
          onClick={onHide}
        >
          <IoCloseSharp />
        </button>
      </Modal.Header>
      <Modal.Body className="workspace-modal__body">
        {query ? detailView : listView}
      </Modal.Body>
      {query && (
        <Modal.Footer className="workspace-modal__footer">
          {!editing ? (
            <>
              <a
                className="workspace-secondary-action btn"
                href={`${APP_URI_PREFIX}/query/?id=${query.queryId}&pId=${project.projectId}`}
                target="_blank"
                rel="noreferrer"
              >
                <FiExternalLink /> Open query curation
              </a>
              <Button className="workspace-primary-action" onClick={startEditing}>
                <FiEdit2 /> Edit &amp; refetch
              </Button>
            </>
          ) : (
            <>
              <Button
                className="workspace-secondary-action"
                onClick={stopEditing}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className={fetchDone ? "workspace-secondary-action" : "workspace-primary-action"}
                onClick={runFetch}
                disabled={!draft?.searchText.trim() || !draft?.sources.length || fetching || saving}
              >
                {fetching ? <Spinner size="sm" /> : <FiRefreshCw />}
                <span>{fetchDone || fetchFailed ? "Fetch again" : "Fetch papers"}</span>
              </Button>
              <Button
                className="workspace-primary-action"
                onClick={save}
                disabled={!preview || saving || fetching}
                title={!preview ? "Fetch papers with the edited query first" : undefined}
              >
                {saving && <Spinner size="sm" />}
                <span>Save changes</span>
              </Button>
            </>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default QueriesModal;
