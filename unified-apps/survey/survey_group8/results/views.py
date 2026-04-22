from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from core.models import Surveys, Questions, Answers, Results
from django.db.models import Max
from django.http import Http404, JsonResponse

def survey_results_closed(request, id):
    survey = get_object_or_404(Surveys, pk=id)

    if survey.status != 'c':
        raise Http404("Survey not available.")

    if survey.user_id != request.user:
        raise Http404("You do not have permission to view these results.")

    republished_versions = list(Results.objects.filter(survey_id=survey).values_list('republished_version', flat=True).distinct())
    
    total_respondents_data = []
    organized_question_data = {}

    for version in republished_versions:
        total_respondents = Results.objects.filter(survey_id=survey, republished_version=version).values('user_id').distinct().count()
        total_respondents_data.append((version, total_respondents))
        
        results = Results.objects.filter(survey_id=survey, republished_version=version)
        questions = survey.questions.all()

        for question in questions:
            answers = question.answers.all()
            total_respondents_question = results.filter(question_id=question).values('user_id').distinct().count()
            
            if question.question not in organized_question_data:
                organized_question_data[question.question] = {
                    'answers': {},
                    'total_respondents': {}
                }

            for answer in answers:
                response_count = results.filter(question_id=question, answer_id=answer).count()
                percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0

                if answer.answer not in organized_question_data[question.question]['answers']:
                    organized_question_data[question.question]['answers'][answer.answer] = {
                        'versions': {}
                    }
                
                organized_question_data[question.question]['answers'][answer.answer]['versions'][version] = {
                    'count': response_count,
                    'percentage': percentage
                }

            organized_question_data[question.question]['total_respondents'][version] = total_respondents

    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'survey_name': survey.name,
            'survey_description': survey.description,
            'total_respondents_data': total_respondents_data,
            'organized_question_data': organized_question_data,
        })

    context = {
        'survey': survey,
        'total_respondents_data': total_respondents_data,  
        'organized_question_data': organized_question_data,  
    }

    return render(request, 'multiple_results.html', context)



def survey_results_published(request, id):
    survey = get_object_or_404(Surveys, pk=id)

    if survey.status != 'p':
        raise Http404("Survey not available.")

    if survey.user_id != request.user:
        raise Http404("You do not have permission to view these results.")

    max_republished = Surveys.objects.filter(pk=id).aggregate(Max('republished'))['republished__max']
    total_respondents = Results.objects.filter(survey_id=survey, republished_version=max_republished).values('user_id').distinct().count()

    question_data = []
    questions = survey.questions.all()

    if total_respondents > 0:
        results = Results.objects.filter(survey_id=survey, republished_version=max_republished)

        for question in questions:
            answers = question.answers.all()
            total_respondents_question = results.filter(question_id=question).values('user_id').distinct().count()

            answer_data = []
            for answer in answers:
                response_count = results.filter(question_id=question, answer_id=answer).count()
                percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0

                answer_data.append({
                    'answer_text': answer.answer,
                    'count': response_count,
                    'percentage': percentage,
                })

            question_data.append({
                'question_text': question.question,
                'answers': answer_data,
                'total_respondents_question': total_respondents_question
            })
    else:
        question_data = [{
            'question_text': "No responses yet",
            'answers': []
        }]

    context = {
        'survey': survey,
        'question_data': question_data,
        'total_respondents': total_respondents,
    }

    return render(request, 'single_result.html', context)
