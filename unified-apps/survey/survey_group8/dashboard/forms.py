# forms.py
from django import forms
from core.models import Answers

class AnswerForm(forms.ModelForm):
    class Meta:
        model = Answers
        fields = ['answer']
        widgets = {
            'answer': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Your answer'}),
        }

#
#AnswerFormSet = forms.modelformset_factory(Answers, form=AnswerForm, extra=0)
