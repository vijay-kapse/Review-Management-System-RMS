from nltk.stem import PorterStemmer
from django.conf import settings
import hashlib
import fitz
import nltk
import os
import re

nltk.download('punkt')
nltk.download('averaged_perceptron_tagger')
nltk.download('wordnet')
nltk.download('stopwords')

stemmer = PorterStemmer()

def clean_and_stem(document):
    """
    Clean and stem the given document.

    Args:
        document (str): The document to clean and stem.

    Returns:
        list: List of stemmed tokens.
    """
    # Remove special characters and punctuation
    cleaned_doc = re.sub(r'[^a-zA-Z\s]', '', document)
    # Convert to lowercase
    cleaned_doc = cleaned_doc.lower()
    # Tokenize by splitting
    tokens = cleaned_doc.split()
    # Stemming
    stemmed_tokens = [stemmer.stem(token) for token in tokens]
    return stemmed_tokens

class CustomFileType:
    """
    Class to represent a custom file type.

    Attributes:
        mime (str): The MIME type of the file.
    """
    def __init__(self, mime=None):
        self.mime = mime

def generate_file_hash(file):
    """
    Generate a SHA-256 hash for the given file.

    Args:
        file (file): The file object for which to generate the hash.

    Returns:
        str: The SHA-256 hash of the file content.
    """
    try:
        file.seek(0)  # Move the file pointer to the beginning
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)
        return file_hash
    except Exception as e:
        print(f"Error generating file hash: {e}")
        return None


def highlight_text_in_pdf(pdf_path, file_name, queries, session_key, color_map={}):
    """
    Highlight text in PDF with both phrase and individual word matching.
    """
    import fitz  # PyMuPDF
    import os

    pdf_document = fitz.open(pdf_path)
    output_pdf = fitz.open()

    # Colors matching exactly with frontend ColorPanel
    COLOR_MAPPING = {
        'yellow': [1, 0.843, 0],        # #FFD700 for vector
        'blue': [0.255, 0.412, 0.882],  # #4169E1 for pathogen
        'green': [0.196, 0.804, 0.196], # #32CD32 for vector and pathogen
        'pink': [1, 0.412, 0.706],      # #FF69B4
        'purple': [0.576, 0.439, 0.859], # #9370DB
        'orange': [1, 0.647, 0],         # #FFA500
        'cyan': [0, 0.808, 0.820],       # #00CED1
        'teal': [0.125, 0.698, 0.667],   # #20B2AA
        'red': [1, 0.388, 0.278],        # #FF6347
        'lime': [0.596, 0.984, 0.596]    # #98FB98
    }

    # Process color mapping
    query_colors = {}
    if color_map:
        for query, color in color_map.items():
            query_colors[query] = COLOR_MAPPING.get(color.lower(), COLOR_MAPPING['yellow'])

    query_counts = {query: 0 for query in queries}

    # Separate queries into phrases and individual words
    phrase_queries = [q for q in queries if len(q.split()) > 1]
    word_queries = [q for q in queries if len(q.split()) == 1]

    def rects_intersect(r1, r2):
        """Check if two rectangles intersect"""
        return not (r1.x1 < r2.x0 or r1.x0 > r2.x1 or r1.y1 < r2.y0 or r1.y0 > r2.y1)

    for page_number in range(len(pdf_document)):
        page = pdf_document[page_number]
        highlighted_regions = []

        # First handle phrases (they take precedence)
        for query in phrase_queries:
            if query in query_colors:
                matches = page.search_for(query)
                for match in matches:
                    match_rect = match if isinstance(match, fitz.Rect) else fitz.Rect(match)
                    if not any(rects_intersect(match_rect, r) for r in highlighted_regions):
                        highlight = page.add_highlight_annot(match_rect)
                        highlight.set_colors(stroke=query_colors[query])
                        highlight.update(opacity=0.3)
                        query_counts[query] += 1
                        highlighted_regions.append(match_rect)

        # Then handle individual words
        for query in word_queries:
            if query in query_colors:
                matches = page.search_for(query)
                for match in matches:
                    match_rect = match if isinstance(match, fitz.Rect) else fitz.Rect(match)
                    # Only highlight if not part of an already highlighted phrase
                    if not any(rects_intersect(match_rect, r) for r in highlighted_regions):
                        highlight = page.add_highlight_annot(match_rect)
                        highlight.set_colors(stroke=query_colors[query])
                        highlight.update(opacity=0.3)
                        query_counts[query] += 1
                        highlighted_regions.append(match_rect)

        output_pdf.insert_pdf(pdf_document, from_page=page_number, to_page=page_number)

    highlighted_pdf_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, f'{file_name}_highlighted.pdf')
    os.makedirs(os.path.dirname(highlighted_pdf_path), exist_ok=True)
    output_pdf.save(highlighted_pdf_path)
    output_pdf.close()
    pdf_document.close()

    return highlighted_pdf_path, query_counts, query_colors

