from pymongo import MongoClient

client = MongoClient('localhost', 27017)
db = client['Argus']  

def update_postings(doc_id, cleaned_text, session_key):
    """
    Update postings for each term in the cleaned text within a session-specific collection.

    Args:
        doc_id (str): The document ID.
        cleaned_text (list): The list of cleaned terms from the document.
        session_key (str): The session key to identify the collection.
    """
    # Create a session-specific collection name
    collection_name = f"Postings_{session_key}"  
    postings_collection = db[collection_name]  # Dynamically access the session-specific collection

    for position, term in enumerate(cleaned_text):
        # Find the term in the session-specific collection
        postings = postings_collection.find_one({"term": term})
        if postings is None:
            # If the term doesn't exist, create a new entry
            postings = {"term": term, "positions": {doc_id: [position]}}
        else:
            # Update the existing entry with the new document and position
            positions = postings.get("positions", {})
            positions[doc_id] = positions.get(doc_id, []) + [position]
            postings["positions"] = positions

        # Upsert the term entry back into the session-specific collection
        postings_collection.replace_one({"term": term}, postings, upsert=True)

def get_term_postings(term, session_key):
    """
    Get the postings for a given term in a session-specific collection.

    Args:
        term (str): The term to get postings for.
        session_key (str): The session key to identify the collection.

    Returns:
        dict: The postings for the term.
    """
    # Create a session-specific collection name
    collection_name = f"Postings_{session_key}"  # Dynamic collection name based on session key
    postings_collection = db[collection_name]  # Dynamically access the session-specific collection

    try:
        # Find the postings for the term in the session-specific collection
        term_postings = postings_collection.find_one({"term": term})
        if term_postings:
            return term_postings.get("positions", None)  # Return the positions if found
        return None  # Return None if the term is not found
    except Exception as e:
        print(f"Error fetching term postings: {e}")
        return None


def get_postings_collection(session_key):
    """
    Returns the session-specific postings collection based on the session key.

    Args:
        session_key (str): The session key to identify the collection.

    Returns:
        pymongo.collection.Collection: The session-specific collection for postings.
    """
    collection_name = f"Postings_{session_key}"  # Dynamic collection name based on session key
    return db[collection_name]  # Return the session-specific collection