from elasticsearch import Elasticsearch
import yaml
from app.indexer import generate_embedding

with open('config/config.yaml', 'r') as file:
    config = yaml.safe_load(file)

# es = Elasticsearch([{'host': config['elasticsearch']['host'], 'port': config['elasticsearch']['port']}])
es = Elasticsearch([{'scheme': 'http', 'host': config['elasticsearch']['host'], 'port': config['elasticsearch']['port']}])

# def search(query):
#     query_vector = generate_embedding(query)
#     body = {
#         "query": {
#             "multi_match": {
#                 "query": query,
#                 "fields": ["title^2", "content", "keywords^1.5"]
#             }
#         },
#         "knn": {
#             "field": "embedding",
#             "query_vector": query_vector,
#             "k": 5,
#             "num_candidates": 50
#         }
#     }
#     response = es.search(index=config['elasticsearch']['index_name'], body=body)
#     return response['hits']['hits']


# ---------
def search(query):
    query_vector = generate_embedding(query)
    body = {
        "query": {
            "bool": {
                "should": [
                    # for semmantic search using script_score which is more compatible
                    {
                        "script_score": {
                            "query": {"match_all": {}},
                            "script": {
                                "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                                "params": {"query_vector": query_vector}
                            }
                        }
                    },
                    # keyword  searching using BM25
                    {
                        "multi_match": {
                            "query": query,
                            "fields": ["title^2", "content", "keywords^1.5"],
                            "boost": 0.5
                        }
                    }
                ]
            }
        },
        "size": 5  # Retrieeval of  top 5 results
    }
    
    try:
        response = es.search(index=config['elasticsearch']['index_name'], body=body)
        return response['hits']['hits']
    except Exception as e:
        print(f"Error searching documents: {e}")
        return []

