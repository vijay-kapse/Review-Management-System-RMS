from django.apps import AppConfig

class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    #def ready(self):
    #    from django.contrib.auth.models import Group
    #    groups = ['Taker', 'Creator']
    #    for group_name in groups:
    #        Group.objects.get_or_create(name=group_name)