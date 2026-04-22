"""
URL configuration for survey_group8 project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import TemplateView
from dashboard import views
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    path('admin/', admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/", include("accounts.urls")),
    path("dashboard/", include("dashboard.urls")),
    path('', views.home,name='home'),
    path('create/', views.survey_create,name='survey_create'),
    path('deletesurvey/<int:id>', views.survey_delete, name='survey_delete'),
    path('publishsurvey/<int:id>', views.survey_publish, name='survey_publish'),
    path('closesurvey/<int:id>', views.survey_close, name='survey_close'),
    path('draftsurvey/<int:id>', views.survey_draft, name='survey_draft'),
    path('republishsurvey/<int:id>', views.survey_republish, name='survey_republish'),
    path('edit/<int:id>', views.survey_edit, name='survey_edit'),
    path("results/", include("results.urls")),
    path('survey_take/', views.survey_take, name='survey_take'),
    path('qa/<int:id>/', views.qa_view, name='qa_view'),
    path('qa_submit/', views.qa_submit, name='qa_submit'),
    path('thankyou/<int:id>/', views.thankyou, name='thankyou'),
    path('complete/',views.complete,name='complete'),
    ] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
