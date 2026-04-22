# import PyPDF2
# from pdfminer.high_level import extract_text

# def extract_text_from_pdf(file_path):
#     try:
#         with open(file_path, 'rb') as file:
#             reader = PyPDF2.PdfFileReader(file)
#             text = ""
#             for page in range(reader.numPages):
#                 text += reader.getPage(page).extractText()
#         return text
#     except:
#         return extract_text(file_path)


# revised code with RAG implementations

# app/text_extractor.py - Enhanced version
import PyPDF2
import re

# def extract_text_from_pdf(file_path):
#     with open(file_path, "rb") as file:
#         reader = PyPDF2.PdfReader(file)
#         text = ""
#         metadata = {
#             "title": file_path.split("/")[-1],
#             "pages": len(reader.pages)
#         }
        
#         for page_num, page in enumerate(reader.pages):
#             content = page.extract_text()
#             text += f"[Page {page_num+1}]: {content}\n\n"
            
#     return text, metadata
# -------
# adding necessary conditions and error handling

def extract_text_from_pdf(file_path):
    try:
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            metadata = {
                "title": file_path.split("/")[-1],
                "pages": len(reader.pages)
            }
            for page_num, page in enumerate(reader.pages):
                try:
                    content = page.extract_text()
                    text += f"[Page {page_num+1}]: {content}\n\n"
                except Exception as e:
                    print(f"Error extracting text from page {page_num+1}: {e}")
                    text += f"[Page {page_num+1}]: [Error extracting text]\n\n"
                
        return text, metadata
    except Exception as e:
        print(f"Error processing PDF {file_path}: {e}")
        return "", {"title": file_path.split("/")[-1], "pages": 0}


def chunk_text(text, chunk_size=1000, overlap=200):
    """Split text into overlapping chunks for better context retrieval"""
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        # finding the last period or newline to make clean chunks
        if end < text_length:
            # trying to find a period or newline to break at
            last_period = text[start:end].rfind('.')
            last_newline = text[start:end].rfind('\n')
            break_point = max(last_period, last_newline)
            
            if break_point > chunk_size // 2:  # only using if it is reasonable far in
                end = start + break_point + 1
        
        chunk = text[start:end]
        chunks.append(chunk)
        
        # moving the start point, accounting for any overlap
        start = end - overlap if end < text_length else text_length
    
    return chunks
