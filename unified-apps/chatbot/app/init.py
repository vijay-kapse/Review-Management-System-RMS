# app/__init__.py
from .main import app
from .indexer import index_document
from .searcher import search
from .text_extractor import extract_text_from_pdf
from .chatbot import chatbot_response
