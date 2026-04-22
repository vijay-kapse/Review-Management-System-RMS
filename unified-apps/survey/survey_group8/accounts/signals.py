# accounts/signals.py
from django.contrib.auth.models import Group
from django.db.models.signals import post_migrate
from django.dispatch import receiver

@receiver(post_migrate)
def create_groups(sender, **kwargs):
    if sender.name == 'accounts':  # Ensure it runs only for  'accounts' in the app
        Group.objects.get_or_create(name='Taker')
        Group.objects.get_or_create(name='Creator')
