from fastapi import FastAPI, File, UploadFile, Form, Request, Response, Cookie, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import os
import re
from app.text_extractor import extract_text_from_pdf
INDEXER_AVAILABLE = True
try:
    from app.indexer import index_document
except Exception as e:
    INDEXER_AVAILABLE = False
    print(f"Indexer unavailable in copied runtime: {e}")
    def index_document(*args, **kwargs):
        file_path = str(args[0]) if args else ""
        return f"local-{hashlib.sha1(file_path.encode('utf-8')).hexdigest()[:12]}"
CHATBOT_ENGINE_AVAILABLE = True
try:
    from app.chatbot import chatbot_response
except Exception as e:
    CHATBOT_ENGINE_AVAILABLE = False
    print(f"Chatbot engine unavailable in copied runtime: {e}")
    def chatbot_response(query, document_titles=None):
        titles = document_titles or []
        return f"Local chatbot fallback active for query: {query}. Active documents: {', '.join(titles) if titles else 'none'}."
import hashlib
import secrets
import glob

app = FastAPI()

@app.get("/chatbot/")
@app.get("/chatbot", include_in_schema=False)
async def chatbot_root():
    return RedirectResponse("/chatbot/static/index.html")

os.environ["HUGGING_FACE_HUB_TOKEN"] = "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"

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
app.mount("/chatbot/static", StaticFiles(directory=PUBLIC_DIR), name="chatbot_static")
print(f"Static files mounted from: {PUBLIC_DIR}")

USERS = {}  # username->password_hash
SESSIONS = {}  # session_token--> username

# --- Track all uploaded document titles for multi-file support ---
app.state.uploaded_document_titles = []
app.state.uploaded_documents = []

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_session(username: str) -> str:
    token = secrets.token_hex(16)
    SESSIONS[token] = username
    return token

def get_current_user(session_token: str = Cookie(None)):
    if session_token and session_token in SESSIONS:
        return SESSIONS[session_token]
    return None


STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "for", "with", "from", "into", "that",
    "this", "what", "which", "when", "where", "who", "whom", "why", "how", "many",
    "much", "about", "there", "their", "them", "they", "your", "you", "our", "ours",
    "have", "has", "had", "were", "was", "are", "is", "be", "been", "being", "does",
    "did", "can", "could", "should", "would", "will", "shall", "than", "then", "also",
    "please", "tell", "give", "show", "document", "documents", "file", "files"
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def split_sentences(text: str):
    cleaned = normalize_text(text)
    if not cleaned:
        return []
    parts = re.split(r"(?<=[.!?])\s+|\s*\[Page \d+\]:\s*", cleaned)
    return [part.strip() for part in parts if part and len(part.strip()) > 30]


def summarize_text(text: str, limit: int = 3) -> str:
    sentences = split_sentences(text)
    if not sentences:
        return "No readable text could be extracted from this document."
    return " ".join(sentences[:limit])


def extract_keywords(query: str):
    return [
        token for token in re.findall(r"[a-zA-Z0-9']+", query.lower())
        if len(token) > 2 and token not in STOP_WORDS
    ]


def build_local_chatbot_response(query: str, documents: list[dict]) -> str:
    if not documents:
        return "No uploaded documents are available yet. Upload a PDF first, then ask a question."

    query_text = normalize_text(query)
    lowered = query_text.lower()
    total_words = sum(doc.get("word_count", 0) for doc in documents)
    total_pages = sum((doc.get("metadata") or {}).get("pages", 0) for doc in documents)

    if "how many words" in lowered or "word count" in lowered:
        if len(documents) == 1:
            doc = documents[0]
            return (
                f"{doc['title']} contains approximately {doc['word_count']} words "
                f"across {(doc.get('metadata') or {}).get('pages', 0)} pages."
            )
        lines = [f"{doc['title']}: {doc['word_count']} words" for doc in documents]
        lines.append(f"Total across {len(documents)} documents: {total_words} words.")
        return "\n".join(lines)

    if "how many pages" in lowered or "page count" in lowered:
        if len(documents) == 1:
            doc = documents[0]
            return f"{doc['title']} contains {(doc.get('metadata') or {}).get('pages', 0)} pages."
        lines = [f"{doc['title']}: {(doc.get('metadata') or {}).get('pages', 0)} pages" for doc in documents]
        lines.append(f"Total across {len(documents)} documents: {total_pages} pages.")
        return "\n".join(lines)

    if "what is this" in lowered or "summarize" in lowered or "summary" in lowered or "overview" in lowered:
        summaries = [
            f"{doc['title']}: {summarize_text(doc.get('text', ''))}"
            for doc in documents[:3]
        ]
        return "\n\n".join(summaries)

    keywords = extract_keywords(query_text)
    scored_snippets = []
    for doc in documents:
        for sentence in split_sentences(doc.get("text", "")):
            lowered_sentence = sentence.lower()
            score = sum(lowered_sentence.count(keyword) for keyword in keywords)
            if score > 0:
                scored_snippets.append((score, len(sentence), doc["title"], sentence))

    if scored_snippets:
        scored_snippets.sort(key=lambda item: (-item[0], item[1]))
        top_matches = scored_snippets[:3]
        lines = ["I found the following relevant passages in the uploaded documents:"]
        for _, _, title, sentence in top_matches:
            lines.append(f"- {title}: {sentence}")
        return "\n".join(lines)

    summaries = [
        f"{doc['title']}: {summarize_text(doc.get('text', ''), limit=2)}"
        for doc in documents[:2]
    ]
    return (
        "I could not find a direct keyword match for that question in the uploaded documents.\n\n"
        + "\n\n".join(summaries)
    )

@app.get("/chatbot/shared-entry")
async def chatbot_shared_entry(sharedEmail: str, next: str = "/chatbot/"):
    username = sharedEmail.split("@")[0]
    if username not in USERS:
        USERS[username] = hash_password("shared-login-placeholder")
    token = create_session(username)
    response = RedirectResponse(next)
    response.set_cookie(key="session_token", value=token, httponly=True)
    return response

@app.post("/chatbot/admin/register")
async def admin_register(username: str = Form(...), password: str = Form(...)):
    if username in USERS:
        return JSONResponse({"error": "Username already exists"}, status_code=400)
    USERS[username] = hash_password(password)
    return {"message": "Admin user registered successfully"}

@app.post("/chatbot/admin/login")
async def admin_login(response: Response, username: str = Form(...), password: str = Form(...)):
    if username not in USERS or USERS[username] != hash_password(password):
        return JSONResponse({"error": "Invalid credentials"}, status_code=401)
    token = create_session(username)
    response.set_cookie(key="session_token", value=token, httponly=True)
    return {"message": "Login successful"}

@app.get("/chatbot/admin/check")
async def admin_check(session_token: str = Cookie(None)):
    user = get_current_user(session_token)
    if user:
        return {"logged_in": True, "username": user}
    return {"logged_in": False}

@app.get("/chatbot/uploaded_files")
async def get_uploaded_files():
    return {"files": app.state.uploaded_document_titles}

@app.delete("/chatbot/uploaded_files")
async def clear_uploaded_files():
    try:
        # Clear the document titles from memory
        cleared_count = len(app.state.uploaded_document_titles)
        app.state.uploaded_document_titles = []
        app.state.uploaded_documents = []
        
        # Delete temporary PDF files
        temp_files = glob.glob("temp_*.pdf")
        deleted_files = []
        
        for temp_file in temp_files:
            try:
                os.remove(temp_file)
                deleted_files.append(temp_file)
                print(f"Deleted temp file: {temp_file}")
            except OSError as e:
                print(f"Error deleting {temp_file}: {e}")
        
        print(f"Cleared {cleared_count} document titles and deleted {len(deleted_files)} temp files")
        
        return {
            "status": "success", 
            "message": f"Successfully cleared {cleared_count} documents and deleted {len(deleted_files)} temp files"
        }
        
    except Exception as e:
        print(f"Error clearing files: {e}")
        return JSONResponse(
            {"status": "error", "message": f"Failed to clear files: {str(e)}"}, 
            status_code=500
        )

@app.post("/chatbot/admin/logout")
async def admin_logout(response: Response, session_token: str = Cookie(None)):
    if session_token and session_token in SESSIONS:
        del SESSIONS[session_token]
    response.delete_cookie("session_token")
    return {"message": "Logged out"}

# --- Modified upload endpoint for multiple files ---
@app.post("/chatbot/upload")
async def upload_file(files: list[UploadFile] = File(...)):
    uploaded_titles = []
    for file in files:
        print(f"POST /upload called with file: {file.filename}")
        content = await file.read()
        temp_filename = f"temp_{file.filename}"
        with open(temp_filename, "wb") as f:
            f.write(content)
        print(f"File saved as {temp_filename}")

        text, metadata = extract_text_from_pdf(temp_filename)
        print(f"Extracted text length: {len(text)} characters")

        title = os.path.splitext(file.filename)[0]
        doc_id = index_document(temp_filename, title, "Unknown Author", text, ["document"])
        print(f"Document indexed with ID: {doc_id}")

        word_count = len(re.findall(r"\b\w+\b", text))
        app.state.uploaded_documents = [
            document for document in app.state.uploaded_documents
            if document.get("title") != title
        ]
        app.state.uploaded_documents.append({
            "id": doc_id,
            "title": title,
            "filename": file.filename,
            "text": text,
            "metadata": metadata,
            "word_count": word_count,
        })
        uploaded_titles.append(title)

    # Store all uploaded document titles
    app.state.uploaded_document_titles = [document["title"] for document in app.state.uploaded_documents]

    return {
        "message": f"Successfully uploaded and indexed {len(files)} files",
        "uploaded": uploaded_titles,
        "total_files": len(app.state.uploaded_document_titles)
    }

@app.post("/chatbot/query")
async def query(query: str = Form(...)):
    print(f"POST /query called with query: {query}")
    documents = app.state.uploaded_documents
    if CHATBOT_ENGINE_AVAILABLE:
        try:
            response = chatbot_response(query, document_titles=app.state.uploaded_document_titles)
        except Exception as e:
            print(f"Chatbot engine failed during query, falling back locally: {e}")
            response = build_local_chatbot_response(query, documents)
    else:
        response = build_local_chatbot_response(query, documents)
    print(f"Chatbot response generated (length: {len(response)})")
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI app...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
