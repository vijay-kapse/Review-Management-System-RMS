import { FC, KeyboardEvent, useEffect, useState } from "react";
import { Alert, Button, Form, ProgressBar } from "react-bootstrap";
import { IoCloseSharp } from "react-icons/io5";
import { v4 as uuidv4 } from "uuid";
import { suggestKeywords } from "../../api/keywords";
import { addTerm, buildBooleanQuery, keywordConcept } from "../../utils/keywordQuery";
import Query from "../Query";

interface KeywordAssistantProps {
  researchQuestion?: string | null;
  currentQuery: string;
  onUseQuery: (query: string) => void;
}

const TYPICAL_SECONDS = 30;

// The model only proposes concepts and terms; the user decides which terms go in, adds their
// own, and can still edit the finished query by hand before fetching.
const KeywordAssistant: FC<KeywordAssistantProps> = ({
  researchQuestion,
  currentQuery,
  onUseQuery,
}) => {
  const [question, setQuestion] = useState("");
  const [concepts, setConcepts] = useState<keywordConcept[]>([]);
  const [model, setModel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [termDrafts, setTermDrafts] = useState<Record<string, string>>({});
  const [conceptDraft, setConceptDraft] = useState("");

  useEffect(() => {
    if (!isLoading) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  const hasUserEdits = concepts.some(
    (concept) =>
      concept.terms.some((term) => term.source === "user" || !term.selected)
  );

  const suggest = () => {
    if (
      hasUserEdits &&
      !window.confirm("Replace your current keyword groups with new suggestions?")
    )
      return;
    setIsLoading(true);
    setError("");
    suggestKeywords(question)
      .then((data) => {
        setModel(data.model);
        setConcepts(
          data.concepts.map((concept) => ({
            id: uuidv4(),
            label: concept.concept,
            terms: concept.terms.map((text) => ({
              text,
              selected: true,
              source: "model" as const,
            })),
          }))
        );
        if (!data.concepts.length)
          setError("No keywords came back for this question. Try rewording it, or add your own below.");
      })
      .catch((e) => {
        console.log(e);
        setError(
          e?.response?.status === 503
            ? "The keyword model is busy or offline right now. You can still add your own keywords below."
            : "Could not get suggestions. You can still add your own keywords below."
        );
      })
      .finally(() => setIsLoading(false));
  };

  const updateConcept = (id: string, change: (concept: keywordConcept) => keywordConcept) =>
    setConcepts((current) =>
      current.map((concept) => (concept.id === id ? change(concept) : concept))
    );

  const toggleTerm = (id: string, index: number) =>
    updateConcept(id, (concept) => ({
      ...concept,
      terms: concept.terms.map((term, position) =>
        position === index ? { ...term, selected: !term.selected } : term
      ),
    }));

  const removeTerm = (id: string, index: number) =>
    updateConcept(id, (concept) => ({
      ...concept,
      terms: concept.terms.filter((_, position) => position !== index),
    }));

  const setAllTerms = (id: string, selected: boolean) =>
    updateConcept(id, (concept) => ({
      ...concept,
      terms: concept.terms.map((term) => ({ ...term, selected })),
    }));

  const submitTerm = (id: string) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    updateConcept(id, (concept) => addTerm(concept, termDrafts[id] || ""));
    setTermDrafts({ ...termDrafts, [id]: "" });
  };

  const submitConcept = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const label = conceptDraft.replace(/\s+/g, " ").trim();
    if (!label) return;
    setConcepts([
      ...concepts,
      { id: uuidv4(), label, terms: [{ text: label, selected: true, source: "user" }] },
    ]);
    setConceptDraft("");
  };

  const builtQuery = buildBooleanQuery(concepts);

  const applyQuery = () => {
    if (
      currentQuery.trim() &&
      currentQuery.trim() !== builtQuery &&
      !window.confirm("Replace the query you have typed with this one?")
    )
      return;
    onUseQuery(builtQuery);
  };

  return (
    <div className="keyword-assistant">
      <div className="keyword-assistant-head">
        <h6>Keyword assistant</h6>
        <span>
          Suggests search terms from your question. You choose what goes into
          the query.
        </span>
      </div>

      <Form.Control
        as="textarea"
        rows={2}
        maxLength={2000}
        placeholder="Type your research question, e.g. How does fast charging affect lithium-ion battery degradation?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="keyword-assistant-actions">
        {!!researchQuestion?.trim() && (
          <Button
            variant="link"
            className="keyword-link"
            disabled={isLoading}
            onClick={() => setQuestion(researchQuestion.trim())}
          >
            Use project research question
          </Button>
        )}
        <Button
          className="c-btn-primary"
          disabled={isLoading || !question.trim()}
          onClick={suggest}
        >
          {concepts.length ? "Suggest again" : "Suggest keywords"}
        </Button>
      </div>

      {isLoading && (
        <div className="scoring-progress">
          Suggesting keywords on the server's local model... {elapsed}s
          (usually 15-30 s)
          <ProgressBar
            now={Math.min(95, (elapsed / TYPICAL_SECONDS) * 100)}
            animated
          />
        </div>
      )}
      {error && <Alert className="keyword-assistant-error">{error}</Alert>}

      {!!concepts.length && (
        <p className="keyword-assistant-hint">
          A paper must match <strong>every</strong> group, using{" "}
          <strong>any</strong> one term in it. Click a term to leave it out.
          {model && <> Suggested by {model}.</>}
        </p>
      )}

      {concepts.map((concept, conceptIndex) => (
        <div key={concept.id}>
          {conceptIndex > 0 && <div className="keyword-and">AND</div>}
          <div className="keyword-concept">
            <div className="keyword-concept-head">
              <strong>{concept.label}</strong>
              <span className="keyword-concept-tools">
                <button type="button" onClick={() => setAllTerms(concept.id, true)}>
                  All
                </button>
                <button type="button" onClick={() => setAllTerms(concept.id, false)}>
                  None
                </button>
                <button
                  type="button"
                  aria-label={`Remove group ${concept.label}`}
                  onClick={() =>
                    setConcepts(concepts.filter((item) => item.id !== concept.id))
                  }
                >
                  <IoCloseSharp />
                </button>
              </span>
            </div>
            <div className="keyword-chips">
              {concept.terms.map((term, index) => (
                <span
                  key={term.text}
                  className={`keyword-chip ${term.selected ? "is-on" : "is-off"} ${
                    term.source === "user" ? "is-user" : ""
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={term.selected}
                    title={term.selected ? "Click to leave out" : "Click to include"}
                    onClick={() => toggleTerm(concept.id, index)}
                  >
                    {term.text}
                  </button>
                  {term.source === "user" && (
                    <button
                      type="button"
                      className="keyword-chip-remove"
                      aria-label={`Remove ${term.text}`}
                      onClick={() => removeTerm(concept.id, index)}
                    >
                      <IoCloseSharp />
                    </button>
                  )}
                </span>
              ))}
              <input
                className="keyword-add"
                placeholder="+ add your term"
                value={termDrafts[concept.id] || ""}
                onChange={(e) =>
                  setTermDrafts({ ...termDrafts, [concept.id]: e.target.value })
                }
                onKeyDown={submitTerm(concept.id)}
              />
            </div>
          </div>
        </div>
      ))}

      <input
        className="keyword-add keyword-add-concept"
        placeholder="+ Add your own group (e.g. a method or population), press Enter"
        value={conceptDraft}
        onChange={(e) => setConceptDraft(e.target.value)}
        onKeyDown={submitConcept}
      />

      {builtQuery && (
        <div className="keyword-preview">
          <span className="keyword-preview-label">Query preview</span>
          <Query queryText={builtQuery} />
          <div className="keyword-assistant-actions">
            <Button className="c-btn-primary" onClick={applyQuery}>
              Use this query
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeywordAssistant;
