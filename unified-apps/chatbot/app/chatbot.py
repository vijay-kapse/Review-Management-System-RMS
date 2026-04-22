# # # from app.searcher import search

# # # def chatbot_response(query):
# # #     results = search(query)
# # #     response = f"Here are the most relevant results for your query:\n\n"
# # #     for hit in results:
# # #         response += f"Title: {hit['_source']['title']}\n"
# # #         response += f"Author: {hit['_source']['author']}\n"
# # #         response += f"Excerpt: {hit['_source']['content'][:200]}...\n\n"
# # #     return response


# # # -------------------------

# # # RAG implementtaion

# # # app/chatbot.py - Complete RAG implementation
# # from elasticsearch import Elasticsearch
# # import yaml
# # import torch
# # from sentence_transformers import SentenceTransformer
# # from app.indexer import generate_embedding

# # # Import LLM - alternatives include transformers, OpenAI API, etc.
# # from transformers import AutoTokenizer, AutoModelForCausalLM

# # # Load configuration
# # with open('config/config.yaml', 'r') as file:
# #     config = yaml.safe_load(file)

# # es_host = config['elasticsearch']['host']
# # es_port = config['elasticsearch']['port']
# # es_index = config['elasticsearch']['index_name']

# # # Connect to Elasticsearch
# # try:
# #     es = Elasticsearch([{'scheme': 'http', 'host': es_host, 'port': es_port}])
# # except Exception as e:
# #     print(f"Error connecting to Elasticsearch: {e}")
# #     es = None

# # # Load LLM model
# # model_name = config.get('llm', {}).get('model_name', "google/gemma-2b-it")  # Or any other suitable model
# # tokenizer = AutoTokenizer.from_pretrained(model_name)
# # model = AutoModelForCausalLM.from_pretrained(model_name)

# # def search_documents(query, top_k=3):
# #     """Search for relevant document chunks based on semantic similarity"""
# #     if es is None:
# #         return []
    
# #     # Generate embedding for the query
# #     query_embedding = generate_embedding(query)
    
# #     # Define search query using both semantic and keyword search
# #     search_query = {
# #         "size": top_k,
# #         "query": {
# #             "bool": {
# #                 "should": [
# #                     # Semantic search using vector similarity
# #                     {
# #                         "script_score": {
# #                             "query": {"match_all": {}},
# #                             "script": {
# #                                 "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
# #                                 "params": {"query_vector": query_embedding}
# #                             }
# #                         }
# #                     },
# #                     # Keyword search using BM25
# #                     {
# #                         "match": {
# #                             "content": {
# #                                 "query": query,
# #                                 "boost": 0.5
# #                             }
# #                         }
# #                     }
# #                 ]
# #             }
# #         }
# #     }
    
# #     # Execute search
# #     try:
# #         response = es.search(index=es_index, body=search_query)
# #         return [hit["_source"] for hit in response["hits"]["hits"]]
# #     except Exception as e:
# #         print(f"Error searching documents: {e}")
# #         return []

# # def generate_llm_response(prompt):
# #     """Generate a response using an LLM based on prompt"""
# #     inputs = tokenizer(prompt, return_tensors="pt")
# #     with torch.no_grad():
# #         outputs = model.generate(
# #             **inputs,
# #             max_new_tokens=512,
# #             temperature=0.7,
# #             do_sample=True,
# #             top_p=0.9
# #         )
# #     return tokenizer.decode(outputs[0], skip_special_tokens=True)

# # def chatbot_response(query):
# #     """Main RAG function: retrieve context and generate an answer"""
# #     # Get relevant document chunks
# #     relevant_chunks = search_documents(query)
    
# #     if not relevant_chunks:
# #         return "I couldn't find any relevant information in the uploaded documents. Please try a different question or upload more documents."
    
# #     # Format context from retrieved chunks
# #     context = ""
# #     sources = []
    
# #     for i, chunk in enumerate(relevant_chunks):
# #         # Format chunk with page number and title
# #         title = chunk.get('title', 'Untitled')
# #         page = chunk.get('page', 0)
# #         content = chunk.get('content', '')
        
# #         # Add to context
# #         context += f"Document {i+1}: {title} (Page {page})\n{content}\n\n"
        
# #         # Track source for citation
# #         sources.append({
# #             'title': title,
# #             'page': page,
# #             'chunk_id': chunk.get('chunk_id', '')
# #         })
    
# #     # Construct prompt for the LLM
# #     prompt = f"""
# #     Answer the following question based on the provided context. 
# #     If you don't know the answer, say so - don't make up information.
    
# #     Context:
# #     {context}
    
# #     Question: {query}
    
# #     Answer:
# #     """
    
# #     # Generate answer
# #     llm_response = generate_llm_response(prompt)
    
# #     # Format final response with citations
# #     response = f"{llm_response}\n\nSources:\n"
# #     for i, source in enumerate(sources):
# #         response += f"[{i+1}] {source['title']}, Page {source['page']}\n"
    
# #     return response


# # -----

# from elasticsearch import Elasticsearch
# import yaml
# import torch
# from sentence_transformers import SentenceTransformer
# from transformers import AutoTokenizer, AutoModelForCausalLM

# # Load configuration
# with open('config/config.yaml', 'r') as file:
#     config = yaml.safe_load(file)

# es_host = config['elasticsearch']['host']
# es_port = config['elasticsearch']['port']
# es_index = config['elasticsearch']['index_name']

# # Connect to Elasticsearch
# try:
#     es = Elasticsearch([{'scheme': 'http', 'host': es_host, 'port': es_port}])
#     print("[INFO] Connected to Elasticsearch")
# except Exception as e:
#     print(f"[ERROR] Could not connect to Elasticsearch: {e}")
#     es = None

# # Load LLM model
# model_name = config.get('llm', {}).get('model_name', "google/gemma-2b-it")
# try:
#     tokenizer = AutoTokenizer.from_pretrained(model_name)
#     model = AutoModelForCausalLM.from_pretrained(model_name)
#     print(f"[INFO] Loaded LLM model: {model_name}")
# except Exception as e:
#     print(f"[ERROR] Could not load LLM model: {e}")
#     tokenizer = None
#     model = None

# def search_documents(query, top_k=3, document_title=None):
#     if es is None:
#         print("[WARNING] Elasticsearch is not available.")
#         return []

#     # generating the embedding for the query
#     embedding_model = SentenceTransformer(config['embedding']['model_name'])
#     query_embedding = embedding_model.encode(query)

#     # building the filter for document title
#     filter_clause = []
#     if document_title:
#         filter_clause.append({"term": {"title.keyword": document_title}})

#     search_query = {
#         "size": top_k,
#         "query": {
#             "bool": {
#                 "filter": filter_clause,
#                 "should": [
#                     {
#                         "script_score": {
#                             "query": {"match_all": {}},
#                             "script": {
#                                 "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
#                                 "params": {"query_vector": query_embedding}
#                             }
#                         }
#                     },
#                     {
#                         "match": {
#                             "content": {
#                                 "query": query,
#                                 "boost": 0.5
#                             }
#                         }
#                     }
#                 ]
#             }
#         }
#     }

#     try:
#         response = es.search(index=es_index, body=search_query)
#         print(f"[INFO] Found {len(response['hits']['hits'])} relevant chunks.")
#         return [hit["_source"] for hit in response["hits"]["hits"]]
#     except Exception as e:
#         print(f"[ERROR] Error searching documents: {e}")
#         return []

# def generate_llm_response(prompt):
#     """Generate a response using an LLM based on prompt"""
#     if tokenizer is None or model is None:
#         print("[WARNING] LLM model is not available.")
#         return "I am unable to generate a response at this time."
    
#     try:
#         inputs = tokenizer(prompt, return_tensors="pt")
#         with torch.no_grad():
#             outputs = model.generate(
#                 **inputs,
#                 max_new_tokens=512,
#                 temperature=0.7,
#                 do_sample=True,
#                 top_p=0.9
#             )
#         return tokenizer.decode(outputs[0], skip_special_tokens=True)
#     except Exception as e:
#         print(f"[ERROR] Error generating LLM response: {e}")
#         return "Sorry, there was an error generating my response."

# def chatbot_response(query, document_title=None):
#     """Main RAG function: retrieve context and generate an answer"""
#     try:
#         # Only retrieve chunks from the specified (current) document
#         relevant_chunks = search_documents(query, document_title=document_title)
        
#         if not relevant_chunks:
#             return "I couldn't find any relevant information in the uploaded document. Please try a different question or upload a document."
        
#         # formatting the context from retrieved chunks
#         context = ""
#         sources = []
        
#         for i, chunk in enumerate(relevant_chunks):
#             # formatting the chunk with page number and title
#             title = chunk.get('title', 'Untitled')
#             page = chunk.get('page', 0)
#             content = chunk.get('content', '')
            
#             # adding to the context
#             context += f"Document {i+1}: {title} (Page {page})\n{content}\n\n"
            
#             # tracking the source for citation
#             sources.append({
#                 'title': title,
#                 'page': page,
#                 'chunk_id': chunk.get('chunk_id', '')
#             })
        
#         # constructing prompt for the LLM
#         prompt = f"""
#         Answer the following question based on the provided context. 
#         If you don't know the answer, say so - don't make up information.
        
#         Context:
#         {context}
        
#         Question: {query}
        
#         Answer:
#         """
        
#         # generating the answer
#         llm_response = generate_llm_response(prompt)
        
#         # formatting the final response with citations
#         response = f"{llm_response}\n\nSources:\n"
#         for i, source in enumerate(sources):
#             response += f"[{i+1}] {source['title']}, Page {source['page']}\n"
        
#         return response
#     except Exception as e:
#         print(f"[ERROR] An unexpected error occurred: {e}")
#         return "Sorry, an unexpected error occurred while processing your request."

#chatbot.py
from elasticsearch import Elasticsearch
import yaml
import torch
from sentence_transformers import SentenceTransformer
import requests
import json

# loading the configuration
with open('config/config.yaml', 'r') as file:
    config = yaml.safe_load(file)

es_host = config['elasticsearch']['host']
es_port = config['elasticsearch']['port']
es_index = config['elasticsearch']['index_name']

# connection to Elasticsearch
es_url = f"http://{es_host}:{es_port}"

es = Elasticsearch(
    es_url,
    headers={
        "Accept": "application/vnd.elasticsearch+json; compatible-with=8",
        "Content-Type": "application/vnd.elasticsearch+json; compatible-with=8",
    }
)

def search_documents(query, top_k=3, document_titles=None):
    if es is None:
        print("[WARNING] Elasticsearch is not available.")
        return []

    embedding_model = SentenceTransformer(config['embedding']['model_name'])
    query_embedding = embedding_model.encode(query)

    filter_clause = []
    if document_titles:  # <-- now expects a list of titles
        filter_clause.append({"terms": {"title.keyword": document_titles}})

    search_query = {
        "size": top_k,
        "query": {
            "bool": {
                "filter": filter_clause,
                "should": [
                    {
                        "script_score": {
                            "query": {"match_all": {}},
                            "script": {
                                "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                "params": {"query_vector": query_embedding}
                            }
                        }
                    },
                    {
                        "match": {
                            "content": {
                                "query": query,
                                "boost": 0.5
                            }
                        }
                    }
                ]
            }
        }
    }

    try:
        response = es.search(index=es_index, body=search_query)
        print(f"[INFO] Found {len(response['hits']['hits'])} relevant chunks.")
        return [hit["_source"] for hit in response["hits"]["hits"]]
    except Exception as e:
        print(f"[ERROR] Error searching documents: {e}")
        return []

def generate_llm_response(prompt):
    """Generate a response using the custom API endpoint"""
    try:
        api_url = config['llm']['api_url']
        api_key = config['llm']['api_key']
        model_name = config['llm']['model_name']
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": config['llm']['max_tokens'],
            "temperature": config['llm'].get('temperature', 0.7)
        }
        
        print(f"[INFO] Sending request to {api_url}")
        response = requests.post(api_url, headers=headers, json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            # Extract the response content
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content']
            else:
                print(f"[ERROR] Unexpected response format: {result}")
                return "Sorry, I received an unexpected response format."
        else:
            print(f"[ERROR] API request failed with status {response.status_code}: {response.text}")
            return f"Sorry, the API request failed with status {response.status_code}."
            
    except requests.exceptions.Timeout:
        print("[ERROR] API request timed out")
        return "Sorry, the request timed out. Please try again."
    except requests.exceptions.ConnectionError:
        print("[ERROR] Failed to connect to the API")
        return "Sorry, I couldn't connect to the language model. Please try again later."
    except Exception as e:
        print(f"[ERROR] Error generating LLM response: {e}")
        return "Sorry, there was an error generating my response."

def chatbot_response(query, document_titles=None):
    """the main RAG function: retrieve context and generate the answer"""
    try:
        relevant_chunks = search_documents(query, document_titles=document_titles)
        
        if not relevant_chunks:
            return "I couldn't find any relevant information in the uploaded documents. Please try a different question or upload more documents."
        
        context = ""
        sources = []
        
        for i, chunk in enumerate(relevant_chunks):
            title = chunk.get('title', 'Untitled')
            page = chunk.get('page', 0)
            content = chunk.get('content', '')
            context += f"Document {i+1}: {title} (Page {page})\n{content}\n\n"
            sources.append({
                'title': title,
                'page': page,
                'chunk_id': chunk.get('chunk_id', '')
            })
        
        prompt = f"""
        Below are excerpts extracted from uploaded documents:
        ---------------------
        Context:
        {context}
        ---------------------
        Based solely on the above content, answer the following question in a clear and concise manner.
        If the relevant information is not available in the provided context, please state so clearly.
        After your answer, include an "Evidence" section where you quote the specific excerpts you used to support your answer.
        
        Question: {query}
        
        Answer:
        """
        
        llm_response = generate_llm_response(prompt)
        
        # Clean up the response by removing the original prompt if it's included
        if "Answer:" in llm_response:
            llm_response = llm_response.split("Answer:")[-1].strip()
        
        response = f"{llm_response}\n\n📚 Sources:\n"
        for i, source in enumerate(sources):
            response += f"[{i+1}] {source['title']}, Page {source['page']}\n"
        
        return response
    except Exception as e:
        print(f"[ERROR] An unexpected error occurred: {e}")
        return "Sorry, an unexpected error occurred while processing your request."