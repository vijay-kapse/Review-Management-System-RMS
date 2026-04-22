import os
import subprocess
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from docx import Document as DocxDocument


def _build_pdf_from_lines(lines, pdf_file):
    doc = SimpleDocTemplate(pdf_file, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        alignment=TA_LEFT,
        spaceBefore=6,
        spaceAfter=6,
        firstLineIndent=20
    )

    for line in lines:
        if line.strip():
            line = line.strip().replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            story.append(Paragraph(line, normal_style))

    doc.build(story)

def convert_docx_to_pdf(input_path, output_path):
    """
    Convert DOCX to PDF using LibreOffice on macOS/Linux or docx2pdf on Windows
    """
     # Windows
    if os.name == 'nt': 
        import pythoncom
        from docx2pdf import convert
        pythoncom.CoInitialize()
        convert(input_path, output_path)
    else:  
        # Get the directory containing the output file
        output_dir = os.path.dirname(output_path)
        
        try:
            subprocess.run([
                'soffice',
                '--headless',
                '--convert-to',
                'pdf',
                '--outdir',
                output_dir,
                input_path
            ], check=True)
            
            # LibreOffice creates the PDF with the same base name as input
            temp_pdf = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')
            
            # Rename the file to match the desired output path
            if os.path.exists(temp_pdf) and temp_pdf != output_path:
                os.rename(temp_pdf, output_path)
                
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                # Try with 'libreoffice' command if 'soffice' fails
                subprocess.run([
                    'libreoffice',
                    '--headless',
                    '--convert-to',
                    'pdf',
                    '--outdir',
                    output_dir,
                    input_path
                ], check=True)
                
                # Same renaming process
                temp_pdf = os.path.join(output_dir, os.path.splitext(os.path.basename(input_path))[0] + '.pdf')
                if os.path.exists(temp_pdf) and temp_pdf != output_path:
                    os.rename(temp_pdf, output_path)
                    
            except (subprocess.CalledProcessError, FileNotFoundError):
                # Fallback for the Vijay copy: extract DOCX text and render it to PDF
                docx = DocxDocument(input_path)
                lines = [paragraph.text for paragraph in docx.paragraphs if paragraph.text.strip()]
                _build_pdf_from_lines(lines, output_path)

def convert_txt_to_pdf(txt_file, pdf_file):
    """
    Convert TXT to PDF using ReportLab
    """
    try:
        with open(txt_file, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except UnicodeDecodeError:
        # Try with a different encoding if UTF-8 fails
        with open(txt_file, 'r', encoding='latin-1') as file:
            lines = file.readlines()
    _build_pdf_from_lines(lines, pdf_file)
