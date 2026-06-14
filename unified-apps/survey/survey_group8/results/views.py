from django.shortcuts import render, redirect, get_object_or_404
from django.http import HttpResponse
from core.models import Surveys, Questions, Answers, Results
from django.db.models import Count, Max
from django.http import Http404, JsonResponse
from django.contrib.auth.decorators import login_required
import csv

TEXT_QUESTION_TYPES = ('Text', 'Textarea')


def _text_response_rows(results, question):
    return (
        results.filter(question_id=question)
        .exclude(text_answer='')
        .values('text_answer')
        .annotate(count=Count('id'))
    )


def _submission_count(results):
    submission_count = results.exclude(submission_id='').values('submission_id').distinct().count()
    legacy_count = results.filter(submission_id='').values('user_id').distinct().count()
    return submission_count + legacy_count


def _csv_filename(survey, scope):
    clean_name = ''.join(char if char.isalnum() else '-' for char in survey.name.lower()).strip('-')
    return f"{clean_name or 'survey'}-{scope}-results.csv"


def _clean_csv_text(value):
    return ' '.join(str(value or '').split())


def _question_headers(questions):
    seen = {}
    headers = {}
    for question in questions:
        header = _clean_csv_text(question.question)
        if not header:
            header = f'Question {question.id}'
        seen[header] = seen.get(header, 0) + 1
        headers[question.id] = header if seen[header] == 1 else f'{header} ({seen[header]})'
    return headers


def _submission_key(result):
    if result.submission_id:
        return ('submission', result.republished_version, result.submission_id)
    return ('legacy', result.republished_version, result.user_id_id)


def _results_csv_response(survey, results, scope):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{_csv_filename(survey, scope)}"'
    response.write('\ufeff')

    writer = csv.writer(response)
    questions = list(survey.questions.all().order_by('id'))
    question_headers = _question_headers(questions)
    question_ids = [question.id for question in questions]
    rows = {}

    for result in results.select_related('question_id', 'answer_id', 'user_id').order_by('id'):
        key = _submission_key(result)
        if key not in rows:
            respondent = result.user_id.email or result.user_id.username
            rows[key] = {
                'first_result_id': result.id,
                'version': result.republished_version,
                'respondent': respondent,
                'answers': {question_id: [] for question_id in question_ids},
            }

        if result.question_id_id not in rows[key]['answers']:
            rows[key]['answers'][result.question_id_id] = []

        answer_text = result.answer_id.answer if result.answer_id_id else result.text_answer
        answer_text = _clean_csv_text(answer_text)
        if answer_text:
            rows[key]['answers'][result.question_id_id].append(answer_text)

    writer.writerow(['Response', 'Respondent', 'Version'] + [
        question_headers[question_id] for question_id in question_ids
    ])

    for response_number, row in enumerate(sorted(rows.values(), key=lambda item: item['first_result_id']), start=1):
        writer.writerow([
            f'Response {response_number}',
            row['respondent'],
            row['version'],
            *['; '.join(row['answers'].get(question_id, [])) for question_id in question_ids],
        ])

    return response

@login_required
def survey_results_closed(request, id):
    survey = get_object_or_404(Surveys, pk=id)

    if survey.status != 'c':
        raise Http404("Survey not available.")

    if survey.user_id != request.user:
        raise Http404("You do not have permission to view these results.")

    all_results = Results.objects.filter(survey_id=survey)
    if request.GET.get('export') == 'csv':
        return _results_csv_response(survey, all_results, 'closed')

    republished_versions = list(Results.objects.filter(survey_id=survey).values_list('republished_version', flat=True).distinct())
    
    total_respondents_data = []
    organized_question_data = {}

    for version in republished_versions:
        version_results = Results.objects.filter(survey_id=survey, republished_version=version)
        total_respondents = _submission_count(version_results)
        total_respondents_data.append((version, total_respondents))
        
        results = version_results
        questions = survey.questions.all()

        for question in questions:
            answers = question.answers.all()
            total_respondents_question = _submission_count(results.filter(question_id=question))
            
            if question.question not in organized_question_data:
                organized_question_data[question.question] = {
                    'answers': {},
                    'total_respondents': {}
                }

            if question.type in TEXT_QUESTION_TYPES:
                text_responses = _text_response_rows(results, question)
                for response in text_responses:
                    answer_text = response['text_answer']
                    response_count = response['count']
                    percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0
                    if answer_text not in organized_question_data[question.question]['answers']:
                        organized_question_data[question.question]['answers'][answer_text] = {'versions': {}}
                    organized_question_data[question.question]['answers'][answer_text]['versions'][version] = {
                        'count': response_count,
                        'percentage': percentage
                    }
            else:
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

                for response in _text_response_rows(results, question):
                    answer_text = response['text_answer']
                    response_count = response['count']
                    percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0
                    if answer_text not in organized_question_data[question.question]['answers']:
                        organized_question_data[question.question]['answers'][answer_text] = {'versions': {}}
                    organized_question_data[question.question]['answers'][answer_text]['versions'][version] = {
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


@login_required
def survey_results_published(request, id):
    survey = get_object_or_404(Surveys, pk=id)

    if survey.status != 'p':
        raise Http404("Survey not available.")

    if survey.user_id != request.user:
        raise Http404("You do not have permission to view these results.")

    max_republished = Surveys.objects.filter(pk=id).aggregate(Max('republished'))['republished__max']
    current_results = Results.objects.filter(survey_id=survey, republished_version=max_republished)
    if request.GET.get('export') == 'csv':
        return _results_csv_response(survey, current_results, 'published')

    total_respondents = _submission_count(current_results)

    question_data = []
    questions = survey.questions.all()

    if total_respondents > 0:
        results = current_results

        for question in questions:
            answers = question.answers.all()
            total_respondents_question = _submission_count(results.filter(question_id=question))

            answer_data = []
            if question.type in TEXT_QUESTION_TYPES:
                text_responses = _text_response_rows(results, question)
                for response in text_responses:
                    response_count = response['count']
                    percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0
                    answer_data.append({
                        'answer_text': response['text_answer'],
                        'count': response_count,
                        'percentage': percentage,
                    })
            else:
                for answer in answers:
                    response_count = results.filter(question_id=question, answer_id=answer).count()
                    percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0

                    answer_data.append({
                        'answer_text': answer.answer,
                        'count': response_count,
                        'percentage': percentage,
                    })

                for response in _text_response_rows(results, question):
                    response_count = response['count']
                    percentage = (response_count / total_respondents_question * 100) if total_respondents_question > 0 else 0
                    answer_data.append({
                        'answer_text': response['text_answer'],
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
