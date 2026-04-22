from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from datetime import datetime, timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt

from django.utils.timezone import localtime


from .constants import ALLOWED_FILE_TYPES
from .models import CorpusFile, Session
from .text_extractor import *
from .mongo_services import *
from .utils import *
from .document_converter import convert_docx_to_pdf, convert_txt_to_pdf

import filetype
import json
import shutil
import os
import traceback


def is_shared_portal_request(request):
    return request.META.get('HTTP_X_PORTAL_AUTH_MODE') == 'shared-session'


def get_request_session_key(request):
    ensure_session(request)
    return request.session.session_key


def get_visible_session_keys(request):
    return [get_request_session_key(request)]


def get_accessible_document(request, doc_id):
    return get_object_or_404(
        CorpusFile,
        id=doc_id,
        session_key__in=get_visible_session_keys(request),
    )


def clear_session_artifacts(session_key):
    try:
        db.drop_collection(f"Postings_{session_key}")
    except Exception as exc:
        print(f"Error clearing postings for session {session_key}: {exc}")

    for dir_name in ('highlighted_pdfs', 'corpus'):
        dir_path = os.path.join(settings.BASE_DIR, dir_name, session_key)
        if os.path.exists(dir_path):
            shutil.rmtree(dir_path, ignore_errors=True)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):

    if(not request):
       print('its null')
    print(request.data)
    try:
        data = request.data
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name')
        last_name = data.get('last_name')

        print(email, password, first_name, last_name)
        if not email or not password or not first_name or not last_name:
            return Response(
                {'message': 'Please provide all required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user already exists
        if get_user_model().objects.filter(email=email).exists():
            return Response(
                {'message': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        user = get_user_model().objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        return Response({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {'message': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        email = request.data.get('email')
        password = request.data.get('password')

        if not email or not password:
            return Response({
                'message': 'Please provide both email and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            login(request, user)
            ensure_session(request)  # Create session for the user
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                },
                'session_key': request.session.session_key
            })
        return Response({
            'message': 'Invalid credentials'
        }, status=status.HTTP_401_UNAUTHORIZED)

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


def view_pdf_document(pdf_path, filename, queries, session_key, color_map={}):
    """
    View and highlight PDF document
    Returns: (filename, query_counts, query_colors)
    """
    if not os.path.exists(pdf_path) or not pdf_path.endswith('.pdf'):
        return None, None, None

    query_counts = {}
    query_colors = {}

    if queries:
        try:
            # Call your existing PDF highlighting function
            pdf_path, query_counts, query_colors = highlight_text_in_pdf(
                pdf_path, 
                filename, 
                queries, 
                session_key, 
                color_map=color_map
            )
        except Exception as e:
            print(f"Error highlighting PDF: {e}")
            return None, None, None

    return filename, query_counts, query_colors

def view_html_document(html_path, filename, queries, color_map={}):
    """
    View and highlight HTML document
    Returns: (filename, query_counts, query_colors)
    """
    if not os.path.exists(html_path) or not html_path.endswith(('.html', '.htm')):
        return None, None, None

    query_counts = {}
    query_colors = {}

    if queries:
        try:
            # Call your existing HTML highlighting function
            html_path, query_counts, query_colors = highlight_text_in_html(
                html_path, 
                filename, 
                queries, 
                color_map=color_map
            )
        except Exception as e:
            print(f"Error highlighting HTML: {e}")
            return None, None, None

    return filename, query_counts, query_colors

def view_image_document(document, queries, session_key):
    """
    Handle image documents
    Returns: (filename, None, None) as images don't support highlighting
    """
    return document.stored_file_name, None, None

def load_document(doc_id, queries, session_key, color_map={}):
        # Get the document object based on the doc_id
        document = get_object_or_404(CorpusFile, id=doc_id)

        # Ensure the directory exists, if not, create it
        dir_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, "init.txt")
        directory = os.path.dirname(dir_path)
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Handle different file types
        if document.stored_file_name.endswith('.pdf'):  
            # Direct PDF handling
            pdf_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, document.stored_file_name)
            destination_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, f"{document.stored_file_name}.pdf")
            shutil.copy(pdf_path, destination_path)
            return view_pdf_document(destination_path, document.stored_file_name, queries, session_key, color_map=color_map)

        elif document.stored_file_name.endswith(('.doc', '.docx')):
            # Convert DOCX to PDF and then view
            try:
                docx_file = os.path.join(settings.BASE_DIR, 'corpus', session_key, document.stored_file_name)
                pdf_file = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, f"{document.stored_file_name}.pdf")
                
                convert_docx_to_pdf(docx_file, pdf_file)
                return view_pdf_document(pdf_file, f"{document.stored_file_name}.pdf", queries, session_key, color_map=color_map)
            except Exception as e:
                print(f"Error converting DOCX to PDF: {e}")
                return None, None, None

        elif document.stored_file_name.endswith('.txt'):
            # Convert TXT to PDF
            try:
                txt_file = os.path.join(settings.BASE_DIR, 'corpus', session_key, document.stored_file_name)
                pdf_file = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, f"{document.stored_file_name}.pdf")
                convert_txt_to_pdf(txt_file, pdf_file)
                return view_pdf_document(pdf_file, f"{document.stored_file_name}.pdf", queries, session_key, color_map=color_map)
            except Exception as e:
                print(f"Error converting TXT to PDF: {e}")
                return None, None, None

        elif document.stored_file_name.endswith(('.html', '.htm')):
            # Handle HTML files
            html_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, document.stored_file_name)
            destination_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key, f"{document.stored_file_name}.html")
            shutil.copy(html_path, destination_path)
            return view_html_document(destination_path, document.stored_file_name, queries, color_map=color_map)

        elif document.stored_file_name.endswith(('.jpg', '.jpeg', '.png', '.bmp')):
            # Handle image files
            return view_image_document(document, queries, session_key)

        else:
            return None, None, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        logout(request)
        return Response({'message': 'Logged out successfully'})
    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Document Upload and Processing
@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload(request):
    try:
        session_key = get_request_session_key(request)
        files = request.FILES.getlist('files')
        print(files)

        if not files:
            return Response({
                'message': 'No files provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        valid_files = []
        invalid_files = []
        file_hashes = []

        for file in files:
            file_info = filetype.guess(file.read())
            if not file_info:
                file_info = CustomFileType()
                if file.content_type:
                    file_info.mime = file.content_type

            if file_info is not None and file_info.mime in ALLOWED_FILE_TYPES:
                file_hash = generate_file_hash(file)
                if not CorpusFile.objects.filter(file_hash=file_hash, session_key=session_key).exists():
                    parts = file.name.rsplit('.', 1)
                    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                    stored_file_name = f"{parts[0]}_{timestamp}.{parts[1]}"
                    file_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, stored_file_name)
                    
                    # Create directory if it doesn't exist
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    
                    with open(file_path, 'wb+') as destination:
                        for chunk in file.chunks():
                            destination.write(chunk)
                    
                    file_hashes.append(file_hash)
                    uploaded_file = CorpusFile(
                        uploaded_file_name=file.name,
                        stored_file_name=stored_file_name,
                        file_type=file_info.mime,
                        file_size=file.size,
                        file_hash=file_hash,
                        session_key=session_key
                    )
                    uploaded_file.save()
                    valid_files.append({
                        'name': file.name,
                        'size': file.size,
                        'type': file_info.mime
                    })
                else:
                    invalid_files.append({
                        'name': file.name,
                        'reason': 'duplicate'
                    })
            else:
                invalid_files.append({
                    'name': file.name,
                    'reason': 'invalid type'
                })

        if file_hashes:
            process_documents(file_hashes, session_key)

        return Response({
            'valid_files': valid_files,
            'invalid_files': invalid_files,
            'message': 'Upload process completed'
        })

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clear_uploads(request):
    try:
        session_key = get_request_session_key(request)
        documents = CorpusFile.objects.filter(session_key=session_key)
        deleted_count = documents.count()
        documents.delete()
        clear_session_artifacts(session_key)

        return Response({
            'message': 'Uploaded files cleared successfully',
            'deleted_count': deleted_count,
        })

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fetch_document(request, doc_id):
    document = get_accessible_document(request, doc_id)
    try:
        file_path = os.path.join(settings.BASE_DIR, 'corpus', document.session_key, document.stored_file_name)
        
        return FileResponse(
            open(file_path, 'rb'),
            content_type=document.file_type
        )

    except FileNotFoundError:
        raise Http404('Document file not found')
    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Session Management
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_session(request):
    try:
        session_key = get_request_session_key(request)
        session, created = Session.objects.get_or_create(session_key=session_key)
        
        if not created:
            session.last_used = timezone.now()
            session.save()

        return Response({
            'message': 'Session saved successfully',
            'session_key': session_key
        })

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def load_session(request):
    try:
        if is_shared_portal_request(request):
            return Response({
                'message': 'Session switching is disabled in the unified portal.'
            }, status=status.HTTP_403_FORBIDDEN)

        session_key = request.data.get('session_key')
        if not session_key:
            return Response({
                'message': 'No session key provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        session = get_object_or_404(Session, session_key=session_key)
        session.last_used = timezone.now()
        session.save()

        request.session.session_key = session_key
        request.session.modified = True
        request.session.save()

        return Response({
            'message': 'Session loaded successfully',
            'session_key': session_key
        })

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Utility functions
def ensure_session(request):
    if not request.session.session_key:
        request.session.create()

def process_documents(file_hashes, session_key):
    for file_hash in file_hashes:
        corpus_file = CorpusFile.objects.get(file_hash=file_hash, session_key=session_key)
        file_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, corpus_file.stored_file_name)
        text = extract_text(file_path)
        cleaned_text = clean_and_stem(text)
        update_postings(str(corpus_file.id), cleaned_text, session_key)
        corpus_file.processed = True
        corpus_file.save()



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search(request):
    try:
        queries = request.data.get('q')
        # queries = request.GET.getlist('q')
        
        print('q', queries)

        if not queries:
            return Response({
                'message': 'No search terms provided',
                'search_terms': queries
            }, status=status.HTTP_400_BAD_REQUEST)

        result = {}

        for session_key in get_visible_session_keys(request):
            postings_collection = get_postings_collection(session_key)

            for query in queries:
                if ' ' in query.strip():
                    cleaned_phrase = clean_and_stem(query)
                    if not cleaned_phrase:
                        continue
                    print('Phrase search:', cleaned_phrase)

                    first_term = cleaned_phrase[0]
                    if first_term in postings_collection.distinct("term"):
                        first_term_postings = postings_collection.find_one({"term": first_term})["positions"]

                        for doc_id, positions in first_term_postings.items():
                            doc_key = str(doc_id)

                            for pos in positions:
                                match = True

                                for i, term in enumerate(cleaned_phrase[1:], start=1):
                                    term_postings = postings_collection.find_one({"term": term})
                                    if not term_postings or doc_key not in term_postings["positions"] or pos + i not in term_postings["positions"][doc_key]:
                                        match = False
                                        break

                                if match:
                                    if doc_key not in result:
                                        result[doc_key] = {}
                                    result[doc_key][query] = [pos]
                else:
                    cleaned_terms = clean_and_stem(query)
                    if not cleaned_terms:
                        continue
                    cleaned_term = cleaned_terms[0]
                    term_postings = postings_collection.find_one({"term": cleaned_term})

                    if term_postings:
                        for doc_id, positions in term_postings["positions"].items():
                            doc_key = str(doc_id)
                            if doc_key not in result:
                                result[doc_key] = {}
                            result[doc_key][query] = positions

        # Rest of your code remains the same...
        matching_documents = []
        visible_session_keys = get_visible_session_keys(request)
        for doc_id in result.keys():
            doc = CorpusFile.objects.filter(
                id=int(doc_id),
                session_key__in=visible_session_keys,
            ).first()
            if doc is None:
                continue

            file_path = os.path.join(settings.BASE_DIR, 'corpus', doc.session_key, doc.stored_file_name)
            if not os.path.exists(file_path):
                continue

            file_size_bytes = os.path.getsize(file_path)

            matching_documents.append({
                'id': doc.id,
                'uploaded_file_name': doc.uploaded_file_name,
                'file_type': doc.file_type,
                'file_size_kb': round(file_size_bytes / 1024, 2),
                'file_size_mb': round(file_size_bytes / (1024 * 1024), 2),
                'uploaded_date': localtime(doc.uploaded_at).strftime('%Y-%m-%d %H:%M:%S'),
                'matches': result[str(doc.id)],
                'match_count': sum(len(positions) for positions in result[str(doc.id)].values())
            })

        return Response({
            'message': 'Search completed successfully',
            'total_results': len(matching_documents),
            'search_terms': queries,
            'documents': sorted(matching_documents, key=lambda x: x['match_count'], reverse=True)
        })

    except Exception as e:
        return Response({
            'message': 'Search failed due to an error.',
            'error': str(e),
            'search_terms': queries
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def results(request):
    """Returns list of all documents in current session"""
    try:
        session_keys = get_visible_session_keys(request)
        documents = CorpusFile.objects.filter(session_key__in=session_keys).order_by('-uploaded_at')
        
        documents_list = []
        for doc in documents:
            file_path = os.path.join(settings.BASE_DIR, 'corpus', doc.session_key, doc.stored_file_name)
            file_size_bytes = os.path.getsize(file_path)
            
            documents_list.append({
                'id': doc.id,
                'uploaded_file_name': doc.uploaded_file_name,
                'file_type': doc.file_type,
                'file_size_kb': round(file_size_bytes / 1024, 2),
                'file_size_mb': round(file_size_bytes / (1024 * 1024), 2),
                'uploaded_date': timezone.localtime(doc.uploaded_at).strftime('%Y-%m-%d %H:%M:%S')
            })

        return Response(documents_list)

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def view_document(request, doc_id):
    """View document with optional highlighting."""
    document = get_accessible_document(request, doc_id)
    try:
        session_key = document.session_key
        highlighted_dir = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key)
        os.makedirs(highlighted_dir, exist_ok=True)

        def send_file_response(file_path, filename):
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
                
            response = FileResponse(
                open(file_path, 'rb'),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response

        # Get query and properly split into separate queries
        queries = []
        colors = []
        if request.method == 'POST':
            raw_query = request.data.get('query', '')
            colors = request.data.get('colors', '').split(',')
        else:
            raw_query = request.GET.get('query', '')
            colors = request.GET.get('colors', '').split(',') if request.GET.get('colors') else []

        # Process queries
        if raw_query:
            # Replace URL-encoded separator with normal one
            raw_query = raw_query.replace("%7C%7C%7C", "|||")
            # Split and clean queries
            queries = [q.strip() for q in raw_query.split("|||") if q.strip()]
            print(f"Processing queries: {queries}")

            # Ensure we have enough colors
            if not colors or len(colors) < len(queries):
                colors = ['yellow'] * len(queries)
            elif len(colors) > len(queries):
                colors = colors[:len(queries)]

        original_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, document.stored_file_name)

        # Handle non-text files
        if document.stored_file_name.endswith(('jpg', 'jpeg', 'png', 'gif', 'bmp')):
            return FileResponse(
                open(original_path, 'rb'),
                content_type=document.file_type
            )

        # Convert if needed
        if not document.stored_file_name.endswith('.pdf'):
            base_pdf_path = os.path.join(highlighted_dir, f"{document.stored_file_name}.pdf")
            if document.stored_file_name.endswith(('.doc', '.docx')):
                convert_docx_to_pdf(original_path, base_pdf_path)
            elif document.stored_file_name.endswith('.txt'):
                convert_txt_to_pdf(original_path, base_pdf_path)
            
            corpus_pdf_path = os.path.join(settings.BASE_DIR, 'corpus', session_key, f"{document.stored_file_name}.pdf")
            shutil.copy2(base_pdf_path, corpus_pdf_path)
            document.stored_file_name = f"{document.stored_file_name}.pdf"
            original_path = corpus_pdf_path

        # Handle highlighting if we have queries
        if queries:
            print(f"Highlighting with queries: {queries}")
            print(f"Using colors: {colors}")
            
            query_color_map = dict(zip(queries, colors))
            filename, query_counts, query_colors = load_document(
                doc_id,
                queries,  # Now passing the properly split list
                session_key,
                color_map=query_color_map
            )

            if filename:
                highlighted_pdf_path = os.path.join(highlighted_dir, f'{document.stored_file_name}_highlighted.pdf')
                if os.path.exists(highlighted_pdf_path):
                    return send_file_response(highlighted_pdf_path, document.uploaded_file_name)

        return send_file_response(original_path, document.uploaded_file_name)

    except Exception as e:
        print(f"Error in view_document: {str(e)}")
        traceback.print_exc()
        return Response({
            'message': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def update_document(request, doc_id):
    """Update document highlighting"""
    document = get_accessible_document(request, doc_id)
    try:
        query = request.GET.get('query', '')
        session_key = document.session_key

        if not query:
            pdf_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', 
                                  session_key, f'{document.stored_file_name}.pdf')
            return FileResponse(open(pdf_path, 'rb'))

        queries = query.split('|||')
        colors = request.GET.get('colors', '').split(',')
        query_color_map = dict(zip(queries, colors))

        filename, query_counts, query_colors = load_document(
            doc_id, 
            queries, 
            session_key, 
            color_map=query_color_map
        )

        pdf_path = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', 
                               session_key, f'{filename}_highlighted.pdf')
        return FileResponse(open(pdf_path, 'rb'))

    except Exception as e:
        return Response({
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


from rest_framework.permissions import IsAuthenticated

from django.utils.decorators import method_decorator

from rest_framework.views import APIView

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get session key before logout for cleanup
            session_key = request.session.session_key
            
            # Clear session data
            request.session.flush()
            
            # Django logout
            logout(request)
            
            # Optional: Clean up user's temporary files
            if session_key:
                highlighted_dir = os.path.join(settings.BASE_DIR, 'highlighted_pdfs', session_key)
                corpus_dir = os.path.join(settings.BASE_DIR, 'corpus', session_key)
                
                # Clean up directories
                for dir_path in [highlighted_dir, corpus_dir]:
                    if os.path.exists(dir_path):
                        try:
                            shutil.rmtree(dir_path)
                        except Exception as e:
                            print(f"Error cleaning up directory {dir_path}: {e}")

                try:
                    db.drop_collection(f"Postings_{session_key}")
                except Exception as e:
                    print(f"Error removing postings collection for session {session_key}: {e}")

                # Clean up session from database
                try:
                    Session.objects.filter(session_key=session_key).delete()
                except Exception as e:
                    print(f"Error removing session from database: {e}")

            return Response({
                'message': 'Logged out successfully',
                'status': 'success'
            })

        except Exception as e:
            return Response({
                'message': f'Logout failed: {str(e)}',
                'status': 'error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
