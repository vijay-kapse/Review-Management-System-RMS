import csv
import io
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

import requests

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - fallback for the deployed runtime
    from PyPDF2 import PdfReader


CHUNK_SIZE = int(os.getenv("QUEST_CHUNK_SIZE", "900"))
CHUNK_OVERLAP = int(os.getenv("QUEST_CHUNK_OVERLAP", "150"))
EMBEDDING_MODEL_NAME = os.getenv("QUEST_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
BROAD_QUESTION_KEYWORDS = (
    "main idea",
    "summarize",
    "summary",
    "overall",
    "what is this about",
    "key points",
    "instructions",
    "requirements",
    "what do i need to do",
    "what is being asked",
    "explain the document",
    "overview",
)
FIT_QUESTION_KEYWORDS = (
    "good fit",
    "fit for",
    "suitable",
    "qualified",
    "match for",
    "right fit",
)
FIT_SIGNAL_TERMS = (
    "ai/ml",
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "pytorch",
    "tensorflow",
    "llm",
    "neural",
    "model",
    "models",
    "computer vision",
    "segmentation",
    "classification",
    "gpu",
)
SECTION_BOUNDARY_TERMS = (
    "professional summary",
    "experience",
    "education",
    "technical skills",
    "selected projects",
    "projects",
    "publications",
)
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "for", "with", "from", "into",
    "that", "this", "what", "which", "when", "where", "who", "whom", "why",
    "how", "many", "much", "about", "there", "their", "them", "they",
    "your", "you", "our", "ours", "have", "has", "had", "were", "was",
    "are", "is", "be", "been", "being", "does", "did", "can", "could",
    "should", "would", "will", "shall", "than", "then", "also", "please",
    "tell", "give", "show", "document", "documents", "file", "files",
    "good", "fit", "work",
}


@dataclass
class UploadedDocument:
    filename: str
    content: bytes


@dataclass
class DocumentChunk:
    source: str
    page: str
    chunk_id: int
    content: str
    file_type: str


@dataclass
class DocumentCollection:
    titles: List[str]
    chunks: List[DocumentChunk]
    embeddings: Optional[object] = None
    embedding_error: str = ""


_embedding_model = None


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def title_from_filename(filename: str) -> str:
    base = os.path.basename(filename or "document")
    title, _ = os.path.splitext(base)
    return title or base


def load_uploaded_documents(files: Sequence[UploadedDocument]) -> List[DocumentChunk]:
    chunks: List[DocumentChunk] = []
    next_chunk_id = 1

    for uploaded_file in files:
        filename = os.path.basename(uploaded_file.filename or "document")
        extension = os.path.splitext(filename)[1].lower()

        if extension == ".pdf":
            loaded = load_pdf(uploaded_file.content, filename)
        elif extension == ".txt":
            loaded = load_txt(uploaded_file.content, filename)
        elif extension == ".csv":
            loaded = load_csv(uploaded_file.content, filename)
        else:
            raise ValueError(f"{filename} is not a supported file type.")

        for source, page, file_type, text in loaded:
            for piece in split_text(text):
                chunks.append(
                    DocumentChunk(
                        source=source,
                        page=page,
                        chunk_id=next_chunk_id,
                        content=piece,
                        file_type=file_type,
                    )
                )
                next_chunk_id += 1

    return chunks


def load_pdf(content: bytes, filename: str) -> List[Tuple[str, str, str, str]]:
    reader = PdfReader(io.BytesIO(content))
    documents: List[Tuple[str, str, str, str]] = []
    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            documents.append((filename, str(page_index), "pdf", text))
    return documents


def load_txt(content: bytes, filename: str) -> List[Tuple[str, str, str, str]]:
    text = content.decode("utf-8", errors="ignore")
    return [(filename, "N/A", "txt", text)] if text.strip() else []


def load_csv(content: bytes, filename: str) -> List[Tuple[str, str, str, str]]:
    text = content.decode("utf-8-sig", errors="ignore")
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        return []

    formatted_rows = []
    header = rows[0]
    data_rows = rows[1:] if len(rows) > 1 else []
    if header:
        formatted_rows.append("Columns: " + " | ".join(cell.strip() for cell in header))
    for row_index, row in enumerate(data_rows[:5000], start=1):
        if header and len(header) == len(row):
            row_text = "; ".join(f"{header[i].strip()}: {cell.strip()}" for i, cell in enumerate(row))
        else:
            row_text = " | ".join(cell.strip() for cell in row)
        formatted_rows.append(f"Row {row_index}: {row_text}")

    return [(filename, "N/A", "csv", "\n".join(formatted_rows))]


def split_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    text = normalize_text(text)
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    current_units: List[str] = []

    for unit in split_text_units(text):
        if len(unit) > chunk_size:
            if current_units:
                chunks.append(" ".join(current_units).strip())
                current_units = []
            chunks.extend(split_long_unit(unit, chunk_size))
            continue

        candidate_units = current_units + [unit]
        candidate = " ".join(candidate_units).strip()
        if current_units and len(candidate) > chunk_size:
            chunks.append(" ".join(current_units).strip())
            current_units = trailing_overlap_units(current_units, overlap)
            candidate_units = current_units + [unit]
            if len(" ".join(candidate_units).strip()) > chunk_size:
                current_units = []
        current_units.append(unit)

    if current_units:
        chunks.append(" ".join(current_units).strip())

    return [chunk for chunk in chunks if chunk]


def split_text_units(text: str) -> List[str]:
    units = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\[])|\s+(?=\u2022\s)|(?<=\u2022)\s+", normalize_text(text))
    return [unit.strip() for unit in units if unit.strip()]


def split_long_unit(unit: str, chunk_size: int) -> List[str]:
    pieces = []
    remaining = unit.strip()
    while len(remaining) > chunk_size:
        window = remaining[:chunk_size]
        break_candidates = [window.rfind(separator) for separator in (". ", "; ", ", ", " | ", " ")]
        break_at = max(break_candidates)
        if break_at < chunk_size // 3:
            break_at = window.rfind(" ")
        if break_at <= 0:
            break_at = chunk_size

        piece = remaining[:break_at + 1].strip(" ,;|")
        if piece:
            pieces.append(piece)
        remaining = remaining[break_at + 1:].strip(" ,;|")

    if remaining:
        pieces.append(remaining)
    return pieces


def trailing_overlap_units(units: Sequence[str], overlap: int) -> List[str]:
    if overlap <= 0:
        return []

    selected: List[str] = []
    selected_length = 0
    for unit in reversed(units):
        projected_length = selected_length + len(unit) + (1 if selected else 0)
        if projected_length > overlap:
            break
        selected.insert(0, unit)
        selected_length = projected_length

    return selected if len(selected) < len(units) else []


def build_collection(files: Sequence[UploadedDocument]) -> DocumentCollection:
    chunks = load_uploaded_documents(files)
    titles = []
    seen_titles = set()
    for chunk in chunks:
        title = title_from_filename(chunk.source)
        if title not in seen_titles:
            titles.append(title)
            seen_titles.add(title)

    collection = DocumentCollection(titles=titles, chunks=chunks)
    if not chunks:
        return collection

    try:
        collection.embeddings = encode_texts([chunk.content for chunk in chunks])
    except Exception as exc:
        collection.embedding_error = str(exc)
        print(f"Embedding generation unavailable; using keyword retrieval fallback: {exc}")

    return collection


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer

        _embedding_model = SentenceTransformer(
            EMBEDDING_MODEL_NAME,
            device=os.getenv("QUEST_EMBEDDING_DEVICE", "cpu"),
        )
    return _embedding_model


def encode_texts(texts: Sequence[str]):
    import numpy as np

    model = get_embedding_model()
    try:
        vectors = model.encode(list(texts), normalize_embeddings=True)
    except TypeError:
        vectors = model.encode(list(texts))
    vectors = np.asarray(vectors, dtype="float32")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return vectors / norms


def detect_broad_question(question: str) -> bool:
    lowered_question = question.lower()
    return any(keyword in lowered_question for keyword in BROAD_QUESTION_KEYWORDS)


def retrieve_chunks(collection: DocumentCollection, question: str, max_chunks: int = 6) -> List[DocumentChunk]:
    if detect_broad_question(question):
        return collection.chunks[:max_chunks]

    if collection.embeddings is not None:
        try:
            import numpy as np

            query_vector = encode_texts([question])[0]
            scores = collection.embeddings @ query_vector
            ranked_indices = np.argsort(scores)[::-1][:max_chunks]
            return [collection.chunks[int(index)] for index in ranked_indices]
        except Exception as exc:
            print(f"Semantic retrieval failed; using keyword retrieval fallback: {exc}")

    return retrieve_chunks_by_keyword(collection, question, max_chunks=max_chunks)


def retrieve_chunks_by_keyword(collection: DocumentCollection, question: str, max_chunks: int = 6) -> List[DocumentChunk]:
    keywords = extract_keywords(question)
    if not keywords:
        return collection.chunks[:max_chunks]

    scored = []
    for chunk in collection.chunks:
        content = chunk.content.lower()
        score = sum(content.count(keyword) for keyword in keywords)
        if score:
            scored.append((score, len(chunk.content), chunk))

    scored.sort(key=lambda item: (-item[0], item[1]))
    return [item[2] for item in scored[:max_chunks]]


def extract_keywords(question: str) -> List[str]:
    return [
        token
        for token in re.findall(r"[a-zA-Z0-9']+", question.lower())
        if len(token) > 2 and token not in STOP_WORDS
    ]


def build_context(chunks: Sequence[DocumentChunk]) -> str:
    context_parts = []
    for index, chunk in enumerate(chunks, start=1):
        content = trim_excerpt(chunk.content, 1200)
        context_parts.append(
            f"[Source {index}: {chunk.source}, Page {chunk.page}, Chunk {chunk.chunk_id}]\n{content}"
        )
    return "\n\n---\n\n".join(context_parts)


def build_chat_history(chat_history: Sequence[dict], max_messages: int = 3) -> str:
    recent_messages = list(chat_history)[-max_messages:]
    formatted_messages = []
    for message in recent_messages:
        role = message.get("role", "unknown")
        content = message.get("content", "")
        formatted_messages.append(f"{role.upper()}: {content}")
    return "\n".join(formatted_messages)


def build_prompt(context: str, question: str, chat_history: str) -> str:
    return f"""
You are a document-only research assistant.

You must follow these rules exactly:

1. Answer ONLY using the uploaded document context provided below.
2. Do NOT use outside knowledge.
3. Do NOT guess.
4. If the answer is not clearly supported by the document context, say:
   "I could not find that in the uploaded documents."
5. When answering, include the document source and page when available.
6. If the user asks for a summary, main idea, instructions, or requirements,
   summarize only what is found in the uploaded document context.
7. Keep the answer clear, organized, and easy to understand.

Recent conversation:
{chat_history}

Uploaded document context:
{context}

User question:
{question}

Answer:
""".strip()


class OllamaClient:
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.model_name = os.getenv("QUEST_OLLAMA_MODEL", "llama3.2:3b")
        self.auto_start = os.getenv("QUEST_OLLAMA_AUTO_START", "true").lower() != "false"
        self.auto_pull = os.getenv("QUEST_OLLAMA_AUTO_PULL", "true").lower() != "false"

    def is_running(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=3)
            return response.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def start_server(self) -> bool:
        if self.is_running():
            return True
        if not self.auto_start or shutil.which("ollama") is None:
            return False

        try:
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            for _ in range(10):
                time.sleep(1)
                if self.is_running():
                    return True
        except Exception as exc:
            print(f"Unable to start Ollama: {exc}")
        return False

    def ensure_model_available(self) -> bool:
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
            models = response.json().get("models", [])
            model_names = {model.get("name") for model in models}
            if self.model_name in model_names:
                return True
            if not self.auto_pull:
                return False
            pull_response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": self.model_name, "stream": False},
                timeout=600,
            )
            return pull_response.status_code == 200
        except requests.exceptions.RequestException as exc:
            print(f"Unable to verify Ollama model availability: {exc}")
            return False

    def prepare(self) -> bool:
        return self.start_server() and self.ensure_model_available()

    def generate(self, prompt: str) -> Optional[str]:
        if not self.prepare():
            return None
        try:
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": int(os.getenv("QUEST_OLLAMA_NUM_PREDICT", "220")),
                        "num_ctx": int(os.getenv("QUEST_OLLAMA_NUM_CTX", "4096")),
                        "temperature": float(os.getenv("QUEST_OLLAMA_TEMPERATURE", "0.2")),
                        "top_p": float(os.getenv("QUEST_OLLAMA_TOP_P", "0.9")),
                    },
                },
                timeout=int(os.getenv("QUEST_OLLAMA_TIMEOUT", "600")),
            )
            response.raise_for_status()
            answer = response.json().get("response", "").strip()
            return answer or None
        except requests.exceptions.RequestException as exc:
            print(f"Ollama request failed: {exc}")
            return None


_ollama_client = OllamaClient()


def answer_question(
    collection: DocumentCollection,
    question: str,
    chat_history: Sequence[dict],
) -> Tuple[str, List[str]]:
    if not collection.chunks:
        return "I could not find that in the uploaded documents.", []

    retrieved_chunks = retrieve_chunks(collection, question)
    if not retrieved_chunks:
        return "I could not find that in the uploaded documents.", []

    context = build_context(retrieved_chunks)
    history = build_chat_history(chat_history)
    prompt = build_prompt(context=context, question=question, chat_history=history)

    answer = _ollama_client.generate(prompt)
    if not answer:
        answer = build_extractive_answer(retrieved_chunks, question, collection.embedding_error)

    sources = format_sources(retrieved_chunks)
    return answer, sources


def build_extractive_answer(
    chunks: Sequence[DocumentChunk],
    question: str,
    embedding_error: str = "",
) -> str:
    lines = [build_extractive_intro(chunks, question, embedding_error)]
    for chunk in chunks[:3]:
        excerpt = build_relevant_excerpt(chunk.content, question, 560)
        lines.append(f"- {chunk.source}, Page {chunk.page}: {excerpt}")
    return "\n".join(lines)


def build_extractive_intro(chunks: Sequence[DocumentChunk], question: str, embedding_error: str = "") -> str:
    if detect_fit_question(question):
        if has_fit_evidence(chunks):
            return (
                "Based on the uploaded document, this appears to be a good fit. "
                "The strongest supporting evidence is:"
            )
        return (
            "I found related passages, but the uploaded document does not clearly prove fit. "
            "The closest evidence is:"
        )

    if embedding_error:
        return "I found the clearest matching passages in the uploaded documents:"
    return "I found the following support in the uploaded documents:"


def detect_fit_question(question: str) -> bool:
    lowered_question = question.lower()
    return any(keyword in lowered_question for keyword in FIT_QUESTION_KEYWORDS)


def has_fit_evidence(chunks: Sequence[DocumentChunk]) -> bool:
    evidence_text = " ".join(chunk.content for chunk in chunks).lower()
    return any(term in evidence_text for term in FIT_SIGNAL_TERMS)


def build_relevant_excerpt(text: str, question: str, limit: int) -> str:
    text = normalize_text(text)
    if len(text) <= limit:
        return clean_excerpt(text)

    units = split_text_units(text)
    keywords = extract_keywords(question)
    if not units or not keywords:
        return trim_excerpt(text, limit)

    scored_units = [
        (sum(unit.lower().count(keyword) for keyword in keywords), index, unit)
        for index, unit in enumerate(units)
    ]
    scored_units.sort(key=lambda item: (-item[0], item[1]))
    if not scored_units or scored_units[0][0] <= 0:
        return trim_excerpt(text, limit)

    selected_indexes = []
    selected_length = 0
    for score, index, unit in scored_units:
        if score <= 0:
            break
        projected_length = selected_length + len(unit) + (1 if selected_indexes else 0)
        if projected_length > limit and selected_indexes:
            continue
        selected_indexes.append(index)
        selected_length = projected_length
        if selected_length >= limit * 0.7:
            break

    selected_text = " ".join(units[index] for index in sorted(selected_indexes))
    return trim_excerpt(focus_excerpt(selected_text or text, keywords, limit), limit)


def focus_excerpt(text: str, keywords: Sequence[str], limit: int) -> str:
    if len(text) <= limit:
        return text

    lowered_text = text.lower()
    keyword_positions = [
        lowered_text.find(keyword)
        for keyword in sorted(keywords, key=len, reverse=True)
        if keyword and lowered_text.find(keyword) >= 0
    ]
    if not keyword_positions:
        return text

    anchor = keyword_positions[0]
    start = best_excerpt_start(text, lowered_text, anchor, limit)
    end = min(len(text), start + limit)
    section_end = next_section_start(lowered_text, anchor, end)
    ended_at_section = section_end is not None and section_end > start
    if ended_at_section:
        end = section_end
    else:
        sentence_end = max(text.rfind(separator, start, end) for separator in (". ", "! ", "? "))
        if sentence_end > start + limit // 2:
            end = sentence_end + 1
        else:
            end = text.rfind(" ", start, end)
            if end <= start:
                end = min(len(text), start + limit)

    focused = clean_excerpt(text[start:end])
    if ended_at_section and focused and not focused.endswith((".", "!", "?")):
        focused = f"{focused}."
    elif end < len(text) and not focused.endswith((".", "!", "?")):
        focused = f"{focused}..."
    return focused


def next_section_start(lowered_text: str, anchor: int, end: int) -> Optional[int]:
    starts = [
        lowered_text.find(term, anchor + 1, end)
        for term in SECTION_BOUNDARY_TERMS
    ]
    starts = [start for start in starts if start >= 0]
    return min(starts) if starts else None


def best_excerpt_start(text: str, lowered_text: str, anchor: int, limit: int) -> int:
    section_starts = [
        lowered_text.rfind(term, 0, anchor + 1)
        for term in SECTION_BOUNDARY_TERMS
    ]
    section_start = max(section_starts)
    if section_start >= 0 and anchor - section_start <= limit // 2:
        return section_start

    start = max(0, anchor - limit // 4)
    boundary = max(text.rfind(separator, 0, start) for separator in (". ", "! ", "? ", "\u2022 "))
    if boundary >= 0:
        return boundary + 2

    if start > 0:
        next_space = text.find(" ", start)
        if next_space >= 0 and next_space < anchor:
            return next_space + 1
    return start


def trim_excerpt(text: str, limit: int) -> str:
    text = normalize_text(text)
    if len(text) <= limit:
        return clean_excerpt(text)

    window = text[:limit].rstrip()
    sentence_breaks = [window.rfind(separator) for separator in (". ", "! ", "? ")]
    sentence_break = max(sentence_breaks)
    if sentence_break >= limit // 2:
        return clean_excerpt(window[:sentence_break + 1])

    cut = window.rsplit(" ", 1)[0].strip(" ,;|\u2022")
    if not cut:
        cut = window
    suffix = "" if cut.endswith((".", "!", "?")) else "..."
    return clean_excerpt(f"{cut}{suffix}")


def clean_excerpt(text: str) -> str:
    text = normalize_text(text)
    text = re.sub(r"\s*\u2022\s*", "; ", text)
    text = re.sub(r"(;\s*)+", "; ", text)
    text = re.sub(r"\s+(SELECTED|PROJECTS|EXPERIENCE|EDUCATION|PUBLICATIONS)\.\.\.$", "...", text)
    text = text.replace(".;", ".")
    return text.strip(" ,;|")


def format_sources(chunks: Iterable[DocumentChunk]) -> List[str]:
    sources = []
    seen = set()
    for chunk in chunks:
        source_text = f"{chunk.source} - Page {chunk.page}, Chunk {chunk.chunk_id}"
        if source_text not in seen:
            sources.append(source_text)
            seen.add(source_text)
    return sources
