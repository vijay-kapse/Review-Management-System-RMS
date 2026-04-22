# from elasticsearch import Elasticsearch
# from transformers import AutoTokenizer, AutoModel
# import torch
# import yaml

# with open('config/config.yaml', 'r') as file:
#     config = yaml.safe_load(file)

# es_host = config['elasticsearch']['host']
# es_port = config['elasticsearch']['port']
# es_index = config['elasticsearch']['index_name']

# try:
#     es = Elasticsearch([{'scheme': 'http', 'host': es_host, 'port': es_port}])
#     print("Elasticsearch connection successful:", es.info())
# except Exception as e:
#     print(f"Error connecting to Elasticsearch: {e}")
#     es = None  # Disable Elasticsearch if connection fails


# tokenizer = AutoTokenizer.from_pretrained(config['embedding']['model_name'])
# model = AutoModel.from_pretrained(config['embedding']['model_name'])

# def generate_embedding(text):
#     inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
#     with torch.no_grad():
#         outputs = model(**inputs)
#     return outputs.last_hidden_state.mean(dim=1).squeeze().tolist()

# def index_document(doc_id, title, author, content, keywords):
#     global es  # Declare 'es' as global to modify it if needed
#     if es is None:
#         print("Elasticsearch is not available, skipping indexing.")
#         return  # Exit the function if Elasticsearch is not connected
#     try:
#         embedding = generate_embedding(content)
#         body = {
#             'title': title,
#             'author': author,
#             'content': content,
#             'keywords': keywords,
#             'embedding': embedding
#         }
#         es.index(index=es_index, id=doc_id, body=body)
#         print(f"Successfully indexed document {doc_id} into index {es_index}")
#     except Exception as e:
#         print(f"Error indexing document: {e}")


# revised version with RAG implementation

# app/indexer.py-> enhanced with RAG capabilities
from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer
import torch
import yaml
import uuid
import re


with open('config/config.yaml', 'r') as file:
    config = yaml.safe_load(file)

es_host = config['elasticsearch']['host']
es_port = config['elasticsearch']['port']
es_index = config['elasticsearch']['index_name']

print(f"Connecting to Elasticsearch on {es_host}:{es_port}, index={es_index}")

try:
    es = Elasticsearch([{'scheme': 'http', 'host': es_host, 'port': es_port}])
    print("Elasticsearch connection successful:", es.info())
    
    # creating index with mappings if it doesnt exist
    if not es.indices.exists(index=es_index):
        index_settings = {
            "mappings": {
                "properties": {
                    "title": {"type": "text"},
                    "author": {"type": "text"},
                    "content": {"type": "text"},
                    "chunk_id": {"type": "keyword"},
                    "document_id": {"type": "keyword"},
                    "page": {"type": "integer"},
                    "chunk_num": {"type": "integer"},
                    "keywords": {"type": "keyword"},
                    "embedding": {
                        "type": "dense_vector",
                        "dims": 384,
                        "index": True,
                        "similarity": "cosine"
                    }
                }
            }
        }
        es.indices.create(index=es_index, body=index_settings)
        print(f"Created index {es_index} with embedding support")
        
except Exception as e:
    print(f"Error connecting to Elasticsearch: {e}")
    es = None

# laoding the embedding model
model_name = config['embedding']['model_name']
embedding_model = SentenceTransformer(model_name)

def generate_embedding(text):
    """Generate embeddings for text using SentenceTransformer"""
    with torch.no_grad():
        embedding = embedding_model.encode(text)
        return embedding.tolist()

def index_document(file_path, title, author, content, keywords=None):
    """Process and index a document with chunking and embeddings"""
    if es is None:
        print("Elasticsearch is not available, skipping  the indexing.")
        return
    
    if keywords is None:
        keywords = []
    
    # Generating a unique document ID
    doc_id = str(uuid.uuid4())
    
    # Chunking the document
    from app.text_extractor import chunk_text
    chunks = chunk_text(content)
    
    print(f"Indexing document {title} with {len(chunks)} chunks")
    
    for i, chunk in enumerate(chunks):
        try:
            # Generateing embedding for this chunk
            embedding = generate_embedding(chunk)
            
            # Extracting the page number from chunk if possible
            page_match = re.search(r'\[Page (\d+)\]', chunk)
            page = int(page_match.group(1)) if page_match else 0
            
            # Creating the unique ID for this chunk
            chunk_id = f"{doc_id}_{i}"
            
            # Creating the document body
            body = {
                'title': title,
                'author': author,
                'content': chunk,
                'chunk_id': chunk_id,
                'document_id': doc_id,
                'page': page,
                'chunk_num': i,
                'keywords': keywords,
                'embedding': embedding
            }
            
            # Indexing this chunk
            es.index(index=es_index, id=chunk_id, body=body)
            
        except Exception as e:
            print(f"Error indexing chunk {i}: {e}")
    
    print(f"Successfully indexed document {title} with {len(chunks)} chunks")
    return doc_id
