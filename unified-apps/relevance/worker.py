"""TRACE relevance worker.

Scores every saved paper in a TRACE project against that project's
"research question and inclusion criteria", and writes the score back to
search_results so the curation table can suggest likely-relevant papers.

The score is a Jev-style decision readout from a local LLM served by
llama.cpp: one forward pass, then the probability mass the model puts on
"yes" versus "no". Papers are ranked by the log-odds (relevance_logit) and
shown as a calibrated probability (relevance_score = sigmoid(a * logit + b)).

Usage:
    python worker.py loop                     # PM2: score active projects forever
    python worker.py score --project 91512    # one pass over one project, archived or not
    python worker.py calibrate --project 91512  # fit a, b on that project's human labels
    python worker.py rescale                  # recompute relevance_score from stored logits
    python worker.py backfill-keywords        # fetch OpenAlex keywords for cached abstracts (no model calls)

The score is a suggestion only: this worker never touches categories.
"""

import argparse
import difflib
import hashlib
import json
import math
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras
import requests

LLM_URL = os.getenv("RELEVANCE_LLM_URL", "http://127.0.0.1:8090")
MODEL_NAME = os.getenv("RELEVANCE_MODEL_NAME", "Qwen3.5-9B-Q4_K_M")
# v2: scored by resuming from the shared-prefix checkpoint (logits differ from v1 by
# up to ~0.5 from numerics), so v1 scores are redone rather than mixed with v2.
PROMPT_VERSION = "v2"
SECRETS_PATH = os.path.expanduser(
    os.getenv("SYSREVIEW_SECRETS", "~/unified-apps/sysreview/secrets.properties")
)
CALIBRATION_PATH = os.path.expanduser(
    os.getenv("RELEVANCE_CALIBRATION", "~/relevance/calibration.json")
)
IDLE_SLEEP_SECONDS = 300
ABSTRACT_RETRY_DAYS = 14
MAX_ABSTRACT_WORDS = 350
MIN_TITLE_MATCH = 0.92
MAX_LOOKUP_FAILURES = 3
DOI_PATTERN = re.compile(r"(10\.\d{4,9}/[^\s?#&]+)")

SYSTEM_PROMPT = (
    "You screen papers for a systematic literature review. A paper is relevant only if it "
    "addresses at least one of the review's research questions and meets every inclusion "
    "criterion. Judge from the title and abstract."
)


def log(message):
    print(f"[{datetime.now().isoformat(timespec='seconds')}] {message}", flush=True)


# ---------------------------------------------------------------- database


def connect():
    props = {}
    with open(SECRETS_PATH) as handle:
        for line in handle:
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                props[key.strip()] = value.strip()
    return psycopg2.connect(
        host="localhost",
        dbname=props.get("spring.datasource.name", "sysreview_vijay"),
        user=props["spring.datasource.username"],
        password=props["spring.datasource.password"],
    )


def ensure_schema(conn):
    # TRACE's entities map the same columns (ddl-auto=update); creating them here as well
    # means the worker does not depend on the order the two are deployed in.
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE projects ADD COLUMN IF NOT EXISTS research_question text")
        for column, kind in (
            ("relevance_score", "float8"),
            ("relevance_logit", "float8"),
            ("relevance_model", "varchar(255)"),
            ("relevance_rq_hash", "varchar(255)"),
            ("relevance_scored_at", "timestamp"),
        ):
            cur.execute(f"ALTER TABLE search_results ADD COLUMN IF NOT EXISTS {column} {kind}")
        cur.execute(
            """CREATE TABLE IF NOT EXISTS relevance_abstracts (
                   title_key   text PRIMARY KEY,
                   doi         text,
                   abstract    text,
                   source      text,
                   fetched_at  timestamp NOT NULL
               )"""
        )
        # JSON array of OpenAlex keyword strings; NULL = not fetched yet, '[]' = none exist.
        cur.execute("ALTER TABLE relevance_abstracts ADD COLUMN IF NOT EXISTS keywords text")
    conn.commit()


# ---------------------------------------------------------------- grouping


def normalize_title(title):
    # Same key as getProjectCurationResults in sysreview-ui/src/api/utility.ts,
    # so one score covers exactly one row of the deduplicated curation table.
    title = (title or "").strip()
    title = re.sub(r"[.\s]+$", "", title)
    return re.sub(r"\s+", " ", title).lower()


def group_key(row):
    return (
        normalize_title(row["title"])
        or (row["url"] or "").strip().lower()
        or f"{row['datasource']}:{row['result_id']}"
    )


def rq_hash(research_question):
    payload = f"{PROMPT_VERSION}|{MODEL_NAME}|{research_question.strip()}"
    return hashlib.sha1(payload.encode()).hexdigest()[:16]


def load_project_groups(conn, project_id):
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT sr.result_id, sr.datasource,
                      sr.document->>'title' AS title, sr.document->>'url' AS url,
                      sr.relevance_rq_hash
                 FROM search_results sr JOIN queries q ON q.query_id = sr.query_id
                WHERE q.project_id = %s
                ORDER BY sr.result_id""",
            (project_id,),
        )
        rows = cur.fetchall()
    groups = {}
    for row in rows:
        groups.setdefault(group_key(row), []).append(row)
    return groups


# ---------------------------------------------------------------- abstracts


def reconstruct_abstract(inverted_index):
    positions = {}
    for word, indexes in (inverted_index or {}).items():
        for index in indexes:
            positions[index] = word
    return " ".join(positions[i] for i in sorted(positions))


class LookupUnavailable(Exception):
    """A metadata service kept failing after retries; try this paper again on a later pass."""


def fetch_json(url, params=None):
    """GET with retries. Returns parsed JSON, or None for a 404. Rate limits wait for the
    service's Retry-After (capped); server errors, timeouts and non-JSON error pages back
    off and retry. Raises LookupUnavailable when every attempt fails."""
    delays = [5, 15, 45, 120]
    for attempt in range(len(delays) + 1):
        wait = None
        try:
            response = requests.get(url, params=params, timeout=30)
            if response.status_code == 404:
                return None
            if response.status_code == 429 or response.status_code >= 500:
                retry_after = response.headers.get("Retry-After", "")
                wait = min(int(retry_after), 300) if retry_after.isdigit() else None
                error = f"HTTP {response.status_code}"
            else:
                response.raise_for_status()
                return response.json()
        except (requests.RequestException, ValueError) as exc:
            error = str(exc)
        if attempt == len(delays):
            raise LookupUnavailable(f"{url}: {error}")
        time.sleep(wait if wait is not None else delays[attempt])
    return None


def find_doi(title, urls):
    for url in urls:
        match = DOI_PATTERN.search(url or "")
        if match:
            return match.group(1).rstrip(".")
    data = fetch_json(
        "https://api.crossref.org/works",
        {"rows": 5, "select": "DOI,title", "query.bibliographic": title},
    )
    wanted = normalize_title(title)
    for item in (data or {}).get("message", {}).get("items", []):
        candidate = normalize_title((item.get("title") or [""])[0])
        if difflib.SequenceMatcher(None, wanted, candidate).ratio() >= MIN_TITLE_MATCH:
            return item["DOI"]
    return None


def openalex_keywords(work):
    """OpenAlex's machine-assigned keywords, falling back to its topic names."""
    names = [item.get("display_name") for item in (work or {}).get("keywords") or []]
    if not any(names):
        names = [item.get("display_name") for item in (work or {}).get("topics") or []]
    return [name for name in names if name][:12]


def fetch_abstract(doi):
    """OpenAlex by DOI first (free; searches are metered), then Crossref's deposited abstract.
    Returns (abstract, source, keywords)."""
    work = fetch_json(
        f"https://api.openalex.org/works/doi:{doi}",
        {"select": "abstract_inverted_index,keywords,topics"},
    )
    keywords = openalex_keywords(work)
    abstract = reconstruct_abstract((work or {}).get("abstract_inverted_index"))
    if abstract:
        return abstract, "openalex", keywords
    record = fetch_json(f"https://api.crossref.org/works/{urllib.parse.quote(doi)}")
    jats = (record or {}).get("message", {}).get("abstract") or ""
    abstract = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", jats)).strip()
    abstract = re.sub(r"^Abstract\s+", "", abstract)
    return (abstract, "crossref", keywords) if abstract else (None, None, keywords)


def get_abstract(conn, title_key, title, urls):
    with conn.cursor() as cur:
        cur.execute(
            "SELECT abstract, fetched_at FROM relevance_abstracts WHERE title_key = %s",
            (title_key,),
        )
        cached = cur.fetchone()
    if cached and (
        cached[0] or cached[1] > datetime.now() - timedelta(days=ABSTRACT_RETRY_DAYS)
    ):
        return cached[0]
    if not title:
        return None
    doi = find_doi(title, urls)
    abstract, source, keywords = fetch_abstract(doi) if doi else (None, None, None)
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO relevance_abstracts (title_key, doi, abstract, source, keywords, fetched_at)
               VALUES (%s, %s, %s, %s, %s, now())
               ON CONFLICT (title_key) DO UPDATE
                  SET doi = EXCLUDED.doi, abstract = EXCLUDED.abstract,
                      source = EXCLUDED.source, keywords = EXCLUDED.keywords,
                      fetched_at = EXCLUDED.fetched_at""",
            (title_key, doi, abstract, source, json.dumps(keywords) if keywords is not None else None),
        )
    conn.commit()
    return abstract


# ---------------------------------------------------------------- scoring


PAPER_MARKER = "<<<PAPER>>>"


def paper_block(title, abstract):
    if abstract:
        words = abstract.split()
        if len(words) > MAX_ABSTRACT_WORDS:
            abstract = " ".join(words[:MAX_ABSTRACT_WORDS]) + " ..."
    return f"Title: {title}\nAbstract: {abstract or '(no abstract available; judge from the title)'}"


def build_messages(research_question, paper):
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Review research questions and inclusion criteria:\n{research_question.strip()}\n\n"
                f"Paper:\n{paper}\n\n"
                "Is this paper relevant to the review? Answer yes or no."
            ),
        },
    ]


def log_sum_exp(values):
    peak = max(values)
    return peak + math.log(sum(math.exp(v - peak) for v in values))


class PromptTemplate:
    """The chat-templated prompt split around the paper, so everything before the paper
    (instructions, research question, criteria) is identical for every paper of a project.

    Qwen3.5 is a hybrid model, so llama.cpp can only resume from a saved state
    checkpoint, not from an arbitrary cached token. warm() processes the prefix on its
    own, which leaves a checkpoint exactly where every paper prompt diverges; each paper
    then costs only its own tokens (~13 s instead of ~30 s on sysrev2). This needs
    --checkpoint-min-step 0 on the server (start-relevance-llm.sh)."""

    def __init__(self, research_question):
        response = requests.post(
            f"{LLM_URL}/apply-template",
            json={
                "messages": build_messages(research_question, PAPER_MARKER),
                "chat_template_kwargs": {"enable_thinking": False},
            },
            timeout=60,
        )
        response.raise_for_status()
        self.prefix, self.suffix = response.json()["prompt"].split(PAPER_MARKER)
        self.prefix_tokens = None

    def warm(self):
        timings = complete(self.prefix, n_predict=0)["timings"]
        self.prefix_tokens = timings["prompt_n"] + timings.get("cache_n", 0)

    def score(self, paper):
        if self.prefix_tokens is None:
            self.warm()
        result = complete(self.prefix + paper + self.suffix, n_predict=1, n_probs=20)
        # After a model server restart the checkpoint is gone; re-warm for the next paper.
        if result["timings"].get("cache_n", 0) < self.prefix_tokens:
            self.prefix_tokens = None
        return answer_logit(result["completion_probabilities"][0]["top_logprobs"])


def complete(prompt, **options):
    response = requests.post(
        f"{LLM_URL}/completion",
        json={"prompt": prompt, "temperature": 0, "cache_prompt": True, **options},
        timeout=900,
    )
    response.raise_for_status()
    return response.json()


def answer_logit(top):
    """Log-odds of yes vs no for the first answer token."""
    yes = [t["logprob"] for t in top if t["token"].strip().lower() == "yes"]
    no = [t["logprob"] for t in top if t["token"].strip().lower() == "no"]
    floor = min(t["logprob"] for t in top)
    # An answer missing from the top 20 has at most the smallest listed probability.
    yes_lp = log_sum_exp(yes) if yes else floor
    no_lp = log_sum_exp(no) if no else floor
    return yes_lp - no_lp


def load_calibration():
    try:
        with open(CALIBRATION_PATH) as handle:
            data = json.load(handle)
        return float(data["a"]), float(data["b"])
    except (OSError, ValueError, KeyError):
        return 1.0, 0.0


def to_probability(logit, calibration):
    a, b = calibration
    z = a * logit + b
    return 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))


def score_project(conn, project_id, research_question):
    current_hash = rq_hash(research_question)
    calibration = load_calibration()
    template = None
    groups = load_project_groups(conn, project_id)
    pending = [
        (key, rows)
        for key, rows in groups.items()
        if any(row["relevance_rq_hash"] != current_hash for row in rows)
    ]
    if pending:
        log(f"project {project_id}: {len(pending)} of {len(groups)} papers to score")
    lookup_failures = 0
    for done, (key, rows) in enumerate(pending, 1):
        title = rows[0]["title"] or ""
        try:
            abstract = get_abstract(conn, key, title, [row["url"] for row in rows])
            lookup_failures = 0
        except LookupUnavailable as exc:
            # Never score without the abstract because a service was down; and stop the
            # pass if it stays down rather than skipping through the whole project.
            lookup_failures += 1
            log(f"abstract lookup failed, will retry: {title[:60]!r}: {exc}")
            if lookup_failures >= MAX_LOOKUP_FAILURES:
                log(f"project {project_id}: lookups keep failing, pausing this pass")
                break
            continue
        started = time.time()
        if template is None:
            template = PromptTemplate(research_question)
        logit = template.score(paper_block(title, abstract))
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE search_results
                      SET relevance_logit = %s, relevance_score = %s, relevance_model = %s,
                          relevance_rq_hash = %s, relevance_scored_at = now()
                    WHERE result_id = ANY(%s)""",
                (
                    logit,
                    to_probability(logit, calibration),
                    MODEL_NAME,
                    current_hash,
                    [row["result_id"] for row in rows],
                ),
            )
        conn.commit()
        log(
            f"project {project_id} [{done}/{len(pending)}] logit={logit:+.2f} "
            f"{'abstract' if abstract else 'title-only'} {time.time() - started:.0f}s {title[:70]!r}"
        )
    return len(pending)


def active_projects(conn):
    with conn.cursor() as cur:
        cur.execute(
            """SELECT project_id, research_question FROM projects
                WHERE NOT archived AND coalesce(btrim(research_question), '') <> ''
                ORDER BY project_id DESC"""
        )
        return cur.fetchall()


def project_question(conn, project_id):
    with conn.cursor() as cur:
        cur.execute("SELECT research_question FROM projects WHERE project_id = %s", (project_id,))
        row = cur.fetchone()
    if not row or not (row[0] or "").strip():
        sys.exit(f"project {project_id} has no research question set")
    return row[0]


# ---------------------------------------------------------------- calibration


def calibrate(conn, project_id):
    """Platt scaling on one project's human labels: Relevant = 1, Not Relevant = 0,
    one data point per deduplicated paper. Only a and b change; the ranking does not."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT sr.result_id, sr.datasource, sr.document->>'title' AS title,
                      sr.document->>'url' AS url, sr.relevance_logit, c.label
                 FROM search_results sr
                 JOIN queries q ON q.query_id = sr.query_id
                 JOIN categories c ON c.category_id = sr.category_id
                WHERE q.project_id = %s AND sr.relevance_logit IS NOT NULL""",
            (project_id,),
        )
        rows = cur.fetchall()
    papers = {}
    for row in rows:
        label = row["label"].strip().lower()
        if label not in ("relevant", "not relevant"):
            continue
        key = group_key(row)
        positive = papers.get(key, (row["relevance_logit"], False))[1] or label == "relevant"
        papers[key] = (row["relevance_logit"], positive)
    xs = [x for x, _ in papers.values()]
    ys = [1.0 if y else 0.0 for _, y in papers.values()]
    if sum(ys) < 5 or len(ys) - sum(ys) < 5:
        sys.exit(f"not enough labelled papers to calibrate ({int(sum(ys))} relevant of {len(ys)})")
    a, b = 1.0, 0.0
    for _ in range(100):  # Newton's method on the logistic log-likelihood
        ga = gb = haa = hab = hbb = 0.0
        for x, y in zip(xs, ys):
            p = to_probability(x, (a, b))
            w = p * (1 - p)
            ga += (y - p) * x
            gb += y - p
            haa += w * x * x
            hab += w * x
            hbb += w
        det = haa * hbb - hab * hab
        if det <= 1e-12:
            break
        da = (hbb * ga - hab * gb) / det
        db = (haa * gb - hab * ga) / det
        a, b = a + da, b + db
        if abs(da) < 1e-9 and abs(db) < 1e-9:
            break
    ranked = sorted(zip(xs, ys), key=lambda pair: -pair[0])
    positives = sum(ys)
    auc_hits = sum(
        1 for i, (_, yi) in enumerate(ranked) if yi for _, yj in ranked[i + 1:] if not yj
    )
    auc = auc_hits / (positives * (len(ys) - positives))
    found = {k: int(sum(y for _, y in ranked[:k])) for k in (20, 50, 100)}
    os.makedirs(os.path.dirname(CALIBRATION_PATH), exist_ok=True)
    with open(CALIBRATION_PATH, "w") as handle:
        json.dump(
            {
                "a": a,
                "b": b,
                "project_id": project_id,
                "papers": len(ys),
                "relevant": int(positives),
                "auc": round(auc, 4),
                "relevant_in_top": found,
                "model": MODEL_NAME,
                "prompt_version": PROMPT_VERSION,
                "fitted_at": datetime.now().isoformat(timespec="seconds"),
            },
            handle,
            indent=2,
        )
    log(f"calibration a={a:.4f} b={b:.4f} from {len(ys)} papers ({int(positives)} relevant), "
        f"AUC={auc:.3f}, relevant in top 20/50/100: {found}")


def rescale(conn):
    calibration = load_calibration()
    with conn.cursor() as cur:
        cur.execute("SELECT DISTINCT relevance_logit FROM search_results WHERE relevance_logit IS NOT NULL")
        logits = [row[0] for row in cur.fetchall()]
        for logit in logits:
            cur.execute(
                "UPDATE search_results SET relevance_score = %s WHERE relevance_logit = %s",
                (to_probability(logit, calibration), logit),
            )
    conn.commit()
    log(f"rescaled {len(logits)} distinct scores with a={calibration[0]:.4f} b={calibration[1]:.4f}")


def backfill_keywords(conn):
    """Adds OpenAlex keywords to abstracts cached before the keywords column existed.
    Only reads OpenAlex by DOI; never touches scores or the model."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT title_key, doi FROM relevance_abstracts WHERE keywords IS NULL AND doi IS NOT NULL"
        )
        pending = cur.fetchall()
    log(f"backfilling keywords for {len(pending)} cached papers")
    for done, (title_key, doi) in enumerate(pending, 1):
        try:
            work = fetch_json(
                f"https://api.openalex.org/works/doi:{doi}", {"select": "keywords,topics"}
            )
        except LookupUnavailable as exc:
            log(f"keyword lookup failed, will retry next run: {doi}: {exc}")
            continue
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE relevance_abstracts SET keywords = %s WHERE title_key = %s",
                (json.dumps(openalex_keywords(work)), title_key),
            )
        conn.commit()
        if done % 25 == 0:
            log(f"keywords {done}/{len(pending)}")
        time.sleep(0.2)


# ---------------------------------------------------------------- main


def loop():
    while True:
        try:
            conn = connect()
            try:
                ensure_schema(conn)
                scored = sum(score_project(conn, pid, rq) for pid, rq in active_projects(conn))
            finally:
                conn.close()
        except (psycopg2.Error, requests.RequestException, LookupUnavailable) as exc:
            # Fail open: nothing is written for a paper unless it was scored, so a down
            # database or model server just delays suggestions until the next pass.
            log(f"pass failed, retrying in {IDLE_SLEEP_SECONDS}s: {exc}")
            scored = 0
        if not scored:
            time.sleep(IDLE_SLEEP_SECONDS)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["loop", "score", "calibrate", "rescale", "backfill-keywords"])
    parser.add_argument("--project", type=int)
    args = parser.parse_args()
    if args.command == "loop":
        return loop()
    conn = connect()
    ensure_schema(conn)
    if args.command == "score":
        score_project(conn, args.project, project_question(conn, args.project))
    elif args.command == "calibrate":
        calibrate(conn, args.project)
    elif args.command == "rescale":
        rescale(conn)
    elif args.command == "backfill-keywords":
        backfill_keywords(conn)


if __name__ == "__main__":
    main()
