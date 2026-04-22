from django.contrib.auth import login, logout

from .views import sync_portal_user


class PortalSessionBridgeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_mode = request.META.get('HTTP_X_PORTAL_AUTH_MODE', '')
        if auth_mode == 'shared-session':
            email = (request.META.get('HTTP_X_PORTAL_USER_EMAIL') or '').strip()
            name = (request.META.get('HTTP_X_PORTAL_USER_NAME') or '').strip()
            first_name = (request.META.get('HTTP_X_PORTAL_USER_FIRST_NAME') or '').strip()
            last_name = (request.META.get('HTTP_X_PORTAL_USER_LAST_NAME') or '').strip()

            if email:
                user = sync_portal_user(
                    email=email,
                    first_name=first_name or name,
                    last_name=last_name,
                )
                current_email = getattr(request.user, 'email', '') if request.user.is_authenticated else ''
                if (not request.user.is_authenticated) or current_email.lower() != email.lower():
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            elif request.user.is_authenticated:
                logout(request)

        return self.get_response(request)
