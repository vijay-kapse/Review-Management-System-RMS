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
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "for", "with", "from", "into",
    "that", "this", "what", "which", "when", "where", "who", "whom", "why",
    "how", "many", "much", "about", "there", "their", "them", "they",
    "your", "you", "our", "ours", "have", "has", "had", "were", "was",
    "are", "is", "be", "been", "being", "does", "did", "can", "could",
    "should", "would", "will", "shall", "than", "then", "also", "please",
    "tell", "give", "show", "document", "documents", "file", "files",
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

    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        if end < len(text):
            window = text[start:end]
            break_candidates = [window.rfind(separator) for separator in ("\n\n", "\n", ". ", " ")]
            break_at = max(break_candidates)
            if break_at > chunk_size // 2:
                end = start + break_at + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break
        start = max(end - overlap, start + 1)

    return chunks


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
        content = chunk.content.strip()[:1200]
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
        answer = build_extractive_answer(retrieved_chunks, collection.embedding_error)

    sources = format_sources(retrieved_chunks)
    return answer, sources


def build_extractive_answer(chunks: Sequence[DocumentChunk], embedding_error: str = "") -> str:
    intro = "I found the following support in the uploaded documents:"
    if embedding_error:
        intro = (
            "The local Llama model or semantic index is not available, "
            "so I found the following support directly in the uploaded documents:"
        )

    lines = [intro]
    for chunk in chunks[:3]:
        excerpt = trim_excerpt(chunk.content, 420)
        lines.append(f"- {chunk.source}, Page {chunk.page}: {excerpt}")
    return "\n".join(lines)


def trim_excerpt(text: str, limit: int) -> str:
    text = normalize_text(text)
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return f"{cut}..."


def format_sources(chunks: Iterable[DocumentChunk]) -> List[str]:
    sources = []
    seen = set()
    for chunk in chunks:
        source_text = f"{chunk.source} - Page {chunk.page}, Chunk {chunk.chunk_id}"
        if source_text not in seen:
            sources.append(source_text)
            seen.add(source_text)
    return sources
