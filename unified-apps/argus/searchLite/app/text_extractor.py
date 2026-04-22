from bs4 import BeautifulSoup
from docx import Document
from PIL import Image
import pytesseract
import fitz
import csv

def extract_text_from_pdf(file_path):
    """
    Extract text from a PDF file.

    Args:
        file_path (str): The path to the PDF file.

    Returns:
        str: The extracted text.
    """
    text = ''
    try:
        with fitz.open(file_path) as pdf_file:
            for page_num in range(pdf_file.page_count):
                page = pdf_file[page_num]
                text += page.get_text()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
    return text

def extract_text_from_docx(file_path):
    """
    Extract text from a DOCX file.

    Args:
        file_path (str): The path to the DOCX file.

    Returns:
        str: The extracted text.
    """
    document = Document(file_path)
    return '\n'.join([paragraph.text for paragraph in document.paragraphs])

def extract_text_from_csv(file_path):
    """
    Extract text from a CSV file.

    Args:
        file_path (str): The path to the CSV file.

    Returns:
        str: The extracted text.
    """
    text = ''
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            text += ', '.join(row) + '\n'
    return text

def extract_text_from_text(file_path):
    """
    Extract text from a text file.

    Args:
        file_path (str): The path to the text file.

    Returns:
        str: The extracted text.
    """
    with open(file_path, 'r') as file:
        return file.read()

def extract_text_from_image(file_path):
    """
    Extract text from an image file.

    Args:
        file_path (str): The path to the image file.

    Returns:
        str: The extracted text.
    """
    text = ''
    try:
        text = pytesseract.image_to_string(Image.open(file_path), lang='eng')
    except Exception as e:
        print(f"Error extracting text from image: {e}")
    return text

def extract_text_from_html(file_path):
    """
    Extract text from an HTML file.

    Args:
        file_path (str): The path to the HTML file.

    Returns:
        str: The extracted text.
    """
    text = ''
    try:
        with open(file_path, 'r') as file:
            html_content = file.read()
            soup = BeautifulSoup(html_content, 'html.parser')
            # Extract text from all text-containing elements
            text = ''.join(soup.find_all(text=True, recursive=True))
    except Exception as e:
        print(f"Error extracting text from HTML: {e}")
    return text

def extract_text_from_gif(file_path):
    """
    Extract text from a GIF file.

    Args:
        file_path (str): The path to the GIF file.

    Returns:
        str: The extracted text.
    """
    text = ''
    try:
        with Image.open(file_path) as img:
            frames = img.n_frames if hasattr(img, 'n_frames') else 1
            for frame in range(frames):
                img.seek(frame)
                text += pytesseract.image_to_string(img, lang='eng')
    except Exception as e:
        print(f"Error extracting text from GIF: {e}")
    return text

def extract_text(file_path):
    """
    Extract text from a file based on its type.

    Args:
        file_path (str): The path to the file.

    Returns:
        str: The extracted text.
    """
    if file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(('.doc', '.docx')):
        return extract_text_from_docx(file_path)
    elif file_path.endswith('.csv'):
        return extract_text_from_csv(file_path)
    elif file_path.endswith(('.txt', '.text')):
        return extract_text_from_text(file_path)
    elif file_path.endswith(('.jpg', '.jpeg', '.png', '.bmp')):
        return extract_text_from_image(file_path)
    elif file_path.endswith(('.html', '.htm')):
        return extract_text_from_html(file_path)
    elif file_path.endswith(('.gif')):
        return extract_text_from_gif(file_path)
    else:
        return ''
