from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),

    # Document endpoints
    path('upload/', views.upload, name='upload'),
    path('clear_uploads/', views.clear_uploads, name='clear_uploads'),
    path('results/', views.results, name='results'),
    path('search/', views.search, name='search'),
    path('view/<int:doc_id>/', views.view_document, name='view_document'),
    path('fetch_document/<int:doc_id>/', views.fetch_document, name='fetch_document'),
    path('update_document/<int:doc_id>/', views.update_document, name='update_document'),

    # Session endpoints
    path('save_session/', views.save_session, name='save_session'),
    path('load_session/', views.load_session, name='load_session'),
]