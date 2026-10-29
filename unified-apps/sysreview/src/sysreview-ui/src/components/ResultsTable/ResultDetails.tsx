import { FC, ReactNode } from "react";
import { ExpanderComponentProps } from "react-data-table-component";
import { paperDetailsType, resultType } from "../../api/types";
import { Container } from "react-bootstrap";
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
};

const SOURCE_LABEL: Record<string, string> = {
  openalex: "OpenAlex",
  crossref: "Crossref",
  sciencedirect: "ScienceDirect (Elsevier)",
  ieee: "IEEE Xplore",
  semanticscholar: "Semantic Scholar",
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
> = ({ data, details, terms = [], rank }) => {
  const { document } = data;
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
              {cached?.abstractText ? (
                <>
                  <Highlighted text={cached.abstractText} terms={terms} />
                  {cached.abstractSource && (
                    <div className="paper-note">
                      From {SOURCE_LABEL[cached.abstractSource] || cached.abstractSource}.
                    </div>
                  )}
                </>
              ) : (
                <span className="text-muted">
                  No abstract available; the suggested score for this paper
                  comes from its title only.
                </span>
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
