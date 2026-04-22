from . import views
from django.urls import path, include

urlpatterns = [
    path('published/<int:id>/', views.survey_results_published, name='survey_delete'),
    path('closed/<int:id>/', views.survey_results_closed, name='survey_delete'),
    
    ]