# TRACE relevance suggestions

Gives every saved paper in a TRACE project a machine-suggested relevance score
against the project's **research question and inclusion criteria** (Project
settings in TRACE). The score is shown in the curation table's "Suggested"
column. It is a suggestion only: nothing here changes a paper's category.

## How it scores

- Model: Qwen3.5-9B (Q4_K_M GGUF, Apache 2.0) served by llama.cpp `llama-server`
  on 127.0.0.1:8090, CPU only (`relevance-llm` in PM2).
- Jev-style decision readout: the research question, inclusion criteria, title
  and abstract go in; the question is "Is this paper relevant to the review?
  yes/no"; the score is the log-odds of the yes/no answer tokens in one forward
  pass, not generated text.
- Papers are ranked by that log-odds (`relevance_logit`). The percentage shown
  is `relevance_score = sigmoid(a * logit + b)`, with `a`, `b` fitted on a
  project with finished human screening (`~/relevance/calibration.json`).
- Abstracts are not stored by TRACE, so the worker looks each title up on
  OpenAlex (title similarity >= 0.92) and caches it in `relevance_abstracts`.
  Papers with no abstract are judged from the title alone.
- One score per deduplicated paper (same title key as the curation table),
  written to all of that paper's rows in `search_results`.
- Changing a project's research question, the model or the prompt changes
  `relevance_rq_hash`, so the worker rescores that project.

Speed on sysrev2 (4 vCPU, no GPU): about 30 s per paper, so a 160-paper
project takes about 80 minutes. The worker (`relevance-worker` in PM2) polls
active projects every 5 minutes.

## Server layout

| Path | What |
|---|---|
| `~/unified-apps/relevance/worker.py` | this worker |
| `~/relevance/venv` | its Python env (`requirements.txt`) |
| `~/relevance/llama/llama-b11381/` | llama.cpp CPU build b11381 |
| `~/relevance/models/Qwen3.5-9B-Q4_K_M.gguf` | model, sha256 03b74727…daf52b7e8 |
| `~/relevance/calibration.json` | fitted a, b plus AUC on the calibration project |

## Commands

```bash
cd ~/unified-apps/relevance
~/relevance/venv/bin/python worker.py score --project 91512      # one project, even if archived
~/relevance/venv/bin/python worker.py calibrate --project 91512  # fit a, b on human labels
~/relevance/venv/bin/python worker.py rescale                    # apply new a, b to stored logits
```

To swap the model, point `start-relevance-llm.sh` at another GGUF and set
`RELEVANCE_MODEL_NAME`; every project is then rescored.
