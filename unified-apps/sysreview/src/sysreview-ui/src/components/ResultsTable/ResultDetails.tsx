import { FC, ReactNode, useState } from "react";
import { ExpanderComponentProps } from "react-data-table-component";
import { abstractSaveType, paperDetailsType, resultType } from "../../api/types";
import { Button, Container, Form, Spinner } from "react-bootstrap";
import { normalizeResultTitle } from "../../api/utility";
import {
  highlightSegments,
  matchSummary,
  queryTerm,
} from "../../utils/matchHighlight";
import { verdictFor } from "../../utils/relevanceVerdict";

export type ResultDetailsExtras = {
  // Cached abstract/keywords by normalized title; empty where the page has none.
  details?: Map<string, paperDetailsType>;
  // Content words of the project's research question, used to highlight matches.
  terms?: queryTerm[];
  // Where this paper sits in the suggested review order, when it has been scored.
  rank?: (row: resultType) => { rank: number; total: number } | null;
  // Saves a reviewer's abstract for a paper none of the lookups found one for.
  onSaveAbstract?: (row: resultType, abstractText: string) => Promise<abstractSaveType>;
};

const SOURCE_LABEL: Record<string, string> = {
  openalex: "OpenAlex",
  crossref: "Crossref",
  sciencedirect: "ScienceDirect (Elsevier)",
  ieee: "IEEE Xplore",
  semanticscholar: "Semantic Scholar",
  user: "a reviewer (added by hand)",
};

const MIN_ABSTRACT = 40;

// Lets a reviewer paste the abstract the lookups could not find (or fix one they added).
const AbstractEditor: FC<{
  initial: string;
  onSave: (text: string) => Promise<abstractSaveType>;
  onDone: (saved: abstractSaveType | null) => void;
}> = ({ initial, onSave, onDone }) => {
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const trimmed = text.trim();
  const submit = () => {
    setSaving(true);
    setError("");
    onSave(trimmed)
      .then((saved) => onDone(saved))
      .catch((e) =>
        setError(e?.response?.data?.message || e?.message || "Could not save the abstract")
      )
      .finally(() => setSaving(false));
  };
  return (
    <div className="abstract-editor">
      <Form.Control
        as="textarea"
        rows={6}
        autoFocus
        placeholder="Paste the paper's abstract, e.g. from the publisher's page or the PDF."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="abstract-editor-actions">
        <small className="text-muted">
          {trimmed.length < MIN_ABSTRACT
            ? `At least ${MIN_ABSTRACT} characters.`
            : "Saving asks the model to rate this paper again, from its title and this abstract."}
        </small>
        <div className="d-flex gap-2">
          <Button className="abstract-btn abstract-btn-secondary" onClick={() => onDone(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="abstract-btn abstract-btn-primary"
            onClick={submit}
            disabled={saving || trimmed.length < MIN_ABSTRACT}
          >
            {saving && <Spinner size="sm" />} Save abstract
          </Button>
        </div>
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
};

const KIND_LABEL = {
  exact: "same word",
  spelling: "spelling variant",
  stem: "same word root",
  partial: "partial match",
};

const Highlighted: FC<{ text?: string | null; terms: queryTerm[] }> = ({
  text,
  terms,
}) => (
  <>
    {highlightSegments(text, terms).map((segment, index) =>
      segment.weight ? (
        <mark
          key={index}
          className="match-mark"
          style={{ backgroundColor: `rgba(255, 193, 7, ${segment.weight * 0.75})` }}
          title={`${KIND_LABEL[segment.kind!]} of "${segment.term}" (weight ${segment.weight})`}
        >
          {segment.text}
        </mark>
      ) : (
        <span key={index}>{segment.text}</span>
      )
    )}
  </>
);

const Block: FC<{ label: string; tone: string; children: ReactNode }> = ({
  label,
  tone,
  children,
}) => (
  <div className={`paper-block paper-block-${tone}`}>
    <div className="paper-block-label">{label}</div>
    <div className="paper-block-body">{children}</div>
  </div>
);

const ResultDetails: FC<
  ExpanderComponentProps<resultType> & ResultDetailsExtras
> = ({ data, details, terms = [], rank, onSaveAbstract }) => {
  const { document } = data;
  const [editingAbstract, setEditingAbstract] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  const SingleData = ({ key, value }) => (
    <div className="d-flex gap-2 align-items-center" key={key}>
      <h6>{key}</h6>
      {value}
    </div>
  );
  const cached = details?.get(normalizeResultTitle(document.title));
  const position = rank?.(data);
  const verdict = verdictFor(data.relevanceLogit);
  const matches = matchSummary(
    [document.title, cached?.abstractText, ...(cached?.keywords || [])],
    terms
  );
  return (
    <>
      <Container className="result-details">
        {details && (
          <div className="paper-blocks">
            <Block label="Title" tone="title">
              <Highlighted text={document.title} terms={terms} />
            </Block>
            <Block label="Abstract" tone="abstract">
              {editingAbstract && onSaveAbstract ? (
                <AbstractEditor
                  initial={cached?.abstractSource === "user" ? cached.abstractText || "" : ""}
                  onSave={(text) => onSaveAbstract(data, text)}
                  onDone={(saved) => {
                    setEditingAbstract(false);
                    if (saved)
                      setSavedNote(
                        saved.scoringPaused
                          ? "Saved. Ratings are paused for this project (archived, or no research question), so the model will not rate it again until they resume."
                          : "Saved. The model will rate this paper again from its title and abstract, usually within a few minutes; the rating fills in by itself."
                      );
                  }}
                />
              ) : cached?.abstractText ? (
                <>
                  <Highlighted text={cached.abstractText} terms={terms} />
                  {cached.abstractSource && (
                    <div className="paper-note">
                      From {SOURCE_LABEL[cached.abstractSource] || cached.abstractSource}.
                      {cached.abstractSource === "user" && onSaveAbstract && (
                        <>
                          {" "}
                          <button
                            type="button"
                            className="paper-inline-action"
                            onClick={() => setEditingAbstract(true)}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="text-muted">
                    {cached
                      ? "No abstract found in OpenAlex, Crossref, ScienceDirect, IEEE or Semantic Scholar, so the model rated this paper from its title only."
                      : "No abstract yet. One is looked up when the model rates this paper."}
                  </span>
                  {onSaveAbstract && (
                    <div className="mt-2">
                      <Button
                        className="abstract-btn abstract-btn-secondary"
                        onClick={() => setEditingAbstract(true)}
                      >
                        Add abstract
                      </Button>
                    </div>
                  )}
                </>
              )}
              {savedNote && !editingAbstract && (
                <div className="paper-note paper-note-saved">{savedNote}</div>
              )}
            </Block>
            <Block label="Keywords" tone="keywords">
              {cached?.keywords?.length ? (
                <>
                  {cached.keywords.map((keyword) => (
                    <span className="paper-keyword" key={keyword}>
                      <Highlighted text={keyword} terms={terms} />
                    </span>
                  ))}
                  <div className="paper-note">
                    Machine-assigned by OpenAlex, not the authors' own keywords.
                  </div>
                </>
              ) : (
                <span className="text-muted">No keywords available.</span>
              )}
            </Block>
            {(position || matches.length > 0) && (
              <Block label="Model rating" tone="why">
                {verdict && (
                  <div>
                    <strong>{verdict.label}.</strong> The model answered yes with{" "}
                    {Math.round(verdict.yesConfidence * 100)}% confidence
                    {cached?.abstractText ? "" : ", from the title only"}. That is its own
                    confidence, not the chance of inclusion: it is reliable for ruling
                    papers out and weak at confirming them.
                  </div>
                )}
                {position && (
                  <div>
                    Ranked #{position.rank} of {position.total} scored papers
                    (top {Math.max(1, Math.ceil((position.rank / position.total) * 100))}%).
                    An ordering aid, not a decision.
                  </div>
                )}
                {matches.length > 0 ? (
                  <div className="paper-matches">
                    Matches the research question on:{" "}
                    {matches.slice(0, 8).map((match) => (
                      <span
                        className="paper-match-chip"
                        key={match.term}
                        title={`${KIND_LABEL[match.kind]} (weight ${match.best}), ${match.count}x`}
                        style={{ backgroundColor: `rgba(255, 193, 7, ${match.best * 0.75})` }}
                      >
                        {match.term}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted">
                    No words in common with the research question.
                  </div>
                )}
              </Block>
            )}
          </div>
        )}
        {["affiliationCountry", "affiliationNames", "authorNames"].map(
          (key) => {
            if (data[key] && data[key][0])
              return SingleData({ key, value: data[key].join(" | ") });
            return <></>;
          }
        )}
        {SingleData({
          key: "Publication Name",
          value: document.publicationName,
        })}
        {SingleData({ key: "ISSN", value: document.issn })}
        {SingleData({ key: "Article Date", value: document.articleDate })}
      </Container>
    </>
  );
};

export default ResultDetails;
