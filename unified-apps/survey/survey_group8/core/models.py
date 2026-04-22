from django.db import models
from django.contrib.auth.models import User

# For users and roles, utilizing the built-in auth_user table, User
class Surveys(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()
    user_id = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name='surveys')
    republished = models.IntegerField()
    status = models.CharField(max_length=10)
    def __str__(self):
        return self.name

class Questions(models.Model):
    question = models.CharField(max_length=2000)
    survey_id = models.ForeignKey(Surveys, on_delete=models.CASCADE, related_name='questions')
    type = models.CharField(max_length=10)
    def __str__(self):
        return self.question

class Answers(models.Model):
    question_id = models.ForeignKey(Questions, on_delete=models.CASCADE, related_name='answers')
    answer = models.TextField()
    def __str__(self):
        return self.answer

class Results(models.Model):
    survey_id = models.ForeignKey(Surveys, on_delete=models.CASCADE, related_name='results')
    question_id = models.ForeignKey(Questions, on_delete=models.CASCADE, related_name='question_results')
    answer_id = models.ForeignKey(Answers, on_delete=models.CASCADE, related_name='answer_results')  
    user_id = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_results')
    republished_version = models.IntegerField()
    def as_int(self):
        return self.survey_id
