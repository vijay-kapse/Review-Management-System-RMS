from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.translation import gettext_lazy as _

class CorpusFile(models.Model):
    uploaded_file_name = models.CharField(max_length=255)
    stored_file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.PositiveIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_hash = models.CharField(max_length=64)
    session_key = models.CharField(max_length=40, db_index=True)  # Add session_key field
    processed = models.BooleanField(default=False)

    def __str__(self):
        return self.uploaded_file_name

    class Meta:
        unique_together = ('file_hash', 'session_key')  # Ensure uniqueness per session
    
class Session(models.Model):
    session_key = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the session is saved
    last_used = models.DateTimeField(auto_now=True)  # Timestamp for when the session was last used

    def __str__(self):
        return f"Session: {self.session_key}"

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        print(email, password, extra_fields)
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, max_length=255)
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    def __str__(self):
        return self.email