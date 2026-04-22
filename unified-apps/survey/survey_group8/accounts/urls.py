from django.urls import path

from .views import SignUpView, sso_login, sso_callback


urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("sso/login/", sso_login, name="sso_login"),
    path("sso/callback/", sso_callback, name="sso_callback"),
]
