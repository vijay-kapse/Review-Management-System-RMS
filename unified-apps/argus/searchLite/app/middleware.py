from django.contrib.auth import get_user_model, login, logout


class PortalCsrfBypassMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.META.get('HTTP_X_PORTAL_AUTH_MODE') == 'shared-session':
            request._dont_enforce_csrf_checks = True
        return self.get_response(request)


def sync_portal_user(email, first_name='', last_name=''):
    User = get_user_model()
    user = User.objects.filter(email=email).first()
    if user is None:
        user = User.objects.create_user(
            email=email,
            password=None,
            first_name=first_name or email.split('@')[0],
            last_name=last_name or '',
        )
        return user

    changed = False
    if first_name and user.first_name != first_name:
        user.first_name = first_name
        changed = True
    if last_name != user.last_name:
        user.last_name = last_name
        changed = True
    if changed:
        user.save(update_fields=['first_name', 'last_name'])
    return user


class PortalSessionBridgeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_mode = request.META.get('HTTP_X_PORTAL_AUTH_MODE', '')
        if auth_mode == 'shared-session':
            email = (request.META.get('HTTP_X_PORTAL_USER_EMAIL') or '').strip()
            first_name = (request.META.get('HTTP_X_PORTAL_USER_FIRST_NAME') or '').strip()
            last_name = (request.META.get('HTTP_X_PORTAL_USER_LAST_NAME') or '').strip()

            if email:
                user = sync_portal_user(email=email, first_name=first_name, last_name=last_name)
                current_email = getattr(request.user, 'email', '') if request.user.is_authenticated else ''
                if (not request.user.is_authenticated) or current_email.lower() != email.lower():
                    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
                    if not request.session.session_key:
                        request.session.save()
            elif request.user.is_authenticated:
                logout(request)

        return self.get_response(request)
