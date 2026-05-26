from __future__ import annotations

import hashlib
import os
import secrets
from typing import Dict, List

from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.rag_backend import (
    DocumentCollection,
    UploadedDocument,
    answer_question,
    build_collection,
    title_from_filename,
)


app = FastAPI(title="QUEST Document Chatbot")

PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")
app.mount("/chatbot/static", StaticFiles(directory=PUBLIC_DIR), name="chatbot_static")
print(f"Static files mounted from: {PUBLIC_DIR}")

USERS: Dict[str, str] = {}
SESSIONS: Dict[str, str] = {}
COOKIE_NAME = "session_token"
SESSION_COOKIE_OPTIONS = {
    "httponly": True,
    "samesite": os.getenv("QUEST_COOKIE_SAMESITE", "lax"),
    "secure": os.getenv("QUEST_COOKIE_SECURE", "false").lower() == "true",
    "path": os.getenv("QUEST_COOKIE_PATH", "/"),
}

app.state.uploaded_files_by_user = {}
app.state.document_collections = {}
app.state.chat_histories = {}


@app.get("/chatbot/")
@app.get("/chatbot", include_in_schema=False)
async def chatbot_root():
    return RedirectResponse("/chatbot/static/index.html")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_session(username: str) -> str:
    token = secrets.token_hex(16)
    SESSIONS[token] = username
    return token


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(key=COOKIE_NAME, value=token, **SESSION_COOKIE_OPTIONS)


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path=SESSION_COOKIE_OPTIONS["path"])


def get_current_user(session_token: str = Cookie(None, alias=COOKIE_NAME)):
    if session_token and session_token in SESSIONS:
        return SESSIONS[session_token]
    return None


def require_current_user(session_token: str = Cookie(None, alias=COOKIE_NAME)) -> str:
    username = get_current_user(session_token)
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    return username


def user_uploads(username: str) -> Dict[str, UploadedDocument]:
    return app.state.uploaded_files_by_user.setdefault(username, {})


def user_collection(username: str) -> DocumentCollection | None:
    return app.state.document_collections.get(username)


def user_history(username: str) -> List[dict]:
    return app.state.chat_histories.setdefault(username, [])


def supported_filename(filename: str) -> bool:
    return os.path.splitext(filename.lower())[1] in {".pdf", ".txt", ".csv"}


@app.get("/chatbot/shared-entry")
async def chatbot_shared_entry(sharedEmail: str = "", email: str = "", next: str = "/chatbot/"):
    resolved_email = (email or sharedEmail or "").strip().lower()
    if not resolved_email:
        return JSONResponse({"error": "email is required"}, status_code=400)

    username = resolved_email.split("@")[0]
    if username not in USERS:
        USERS[username] = hash_password("shared-login-placeholder")

    token = create_session(username)
    redirect_target = next if next.startswith("/chatbot") else "/chatbot/"
    response = RedirectResponse(redirect_target)
    set_session_cookie(response, token)
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
    set_session_cookie(response, token)
    return {"message": "Login successful"}


@app.post("/chatbot/admin/logout")
async def admin_logout(response: Response, session_token: str = Cookie(None, alias=COOKIE_NAME)):
    if session_token:
        SESSIONS.pop(session_token, None)
    clear_session_cookie(response)
    return {"message": "Logged out"}


@app.get("/chatbot/admin/check")
async def admin_check(username: str = Depends(get_current_user)):
    if username:
        return {"logged_in": True, "username": username}
    return {"logged_in": False}


@app.get("/chatbot/uploaded_files")
async def get_uploaded_files(username: str = Depends(require_current_user)):
    collection = user_collection(username)
    return {"files": collection.titles if collection else []}


@app.delete("/chatbot/uploaded_files")
async def clear_uploaded_files(username: str = Depends(require_current_user)):
    cleared_count = len(user_uploads(username))
    app.state.uploaded_files_by_user[username] = {}
    app.state.document_collections.pop(username, None)
    app.state.chat_histories.pop(username, None)
    return {
        "status": "success",
        "message": f"Successfully cleared {cleared_count} uploaded documents.",
    }


@app.post("/chatbot/upload")
async def upload_file(files: List[UploadFile] = File(...), username: str = Depends(require_current_user)):
    if not files:
        raise HTTPException(status_code=400, detail="Upload at least one document.")

    uploads = user_uploads(username)
    uploaded_titles = []
    rejected_files = []

    for file in files:
        filename = os.path.basename(file.filename or "document")
        if not supported_filename(filename):
            rejected_files.append(filename)
            continue

        content = await file.read()
        if not content:
            rejected_files.append(filename)
            continue

        title = title_from_filename(filename)
        uploads[title] = UploadedDocument(filename=filename, content=content)
        uploaded_titles.append(title)

    if not uploaded_titles:
        detail = "No supported documents were uploaded. Use PDF, TXT, or CSV files."
        if rejected_files:
            detail += f" Rejected: {', '.join(rejected_files)}."
        raise HTTPException(status_code=400, detail=detail)

    try:
        collection = build_collection(list(uploads.values()))
    except Exception as exc:
        print(f"Failed to process uploaded documents: {exc}")
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded documents: {exc}") from exc

    if not collection.chunks:
        raise HTTPException(status_code=400, detail="No readable text could be extracted from the uploaded documents.")

    app.state.document_collections[username] = collection
    app.state.chat_histories[username] = []

    message = f"Successfully processed {len(uploaded_titles)} documents."
    if rejected_files:
        message += f" Skipped unsupported or empty files: {', '.join(rejected_files)}."

    return {
        "message": message,
        "uploaded": uploaded_titles,
        "files": collection.titles,
        "total_files": len(collection.titles),
        "embeddingFallback": bool(collection.embedding_error),
    }


@app.post("/chatbot/query")
async def query(query: str = Form(...), username: str = Depends(require_current_user)):
    question = query.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    collection = user_collection(username)
    if not collection:
        return {
            "response": "Upload and process documents before asking a question.",
            "sources": [],
        }

    history = user_history(username)
    answer, sources = answer_question(collection, question, history)
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer, "sources": sources})
    del history[:-12]

    return {"response": answer, "sources": sources}


if __name__ == "__main__":
    import uvicorn

    print("Starting QUEST FastAPI app...")
    uvicorn.run(app, host="0.0.0.0", port=8080)
