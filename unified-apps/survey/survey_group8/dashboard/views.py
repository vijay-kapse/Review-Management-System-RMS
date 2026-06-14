from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from core.models import Surveys, Questions, Answers, Results
from django.contrib.auth.decorators import user_passes_test
from django.http import HttpResponseForbidden,JsonResponse,HttpResponse
import json
import uuid
from django import forms
from .forms  import AnswerForm
from django.db.models import Count, Min
from django.db import transaction

CHOICE_QUESTION_TYPES = ('Radio', 'Checkboxes', 'Dropdown')
TEXT_QUESTION_TYPES = ('Text', 'Textarea')
QUESTION_TYPES = CHOICE_QUESTION_TYPES + TEXT_QUESTION_TYPES
OTHER_ANSWER_VALUE = '__other__'
LEGACY_SUBMISSION_PREFIX = 'legacy-response-'

def in_survey_taker_group(user):
    return user.groups.filter(name='Taker').exists()

def in_survey_creator_group(user):
    return user.groups.filter(name='Creator').exists()


def categorize_surveys(surveys):
    draft_surveys = []
    published_surveys = []
    closed_surveys = []

    for survey in surveys:
        survey_data = {"name": survey.name, "id": survey.id}
        if survey.status == 'd':
            draft_surveys.append(survey_data)
        elif survey.status == 'p':
            published_surveys.append(survey_data)
        elif survey.status == 'c':
            closed_surveys.append(survey_data)

    return draft_surveys, published_surveys, closed_surveys


def _error_response(message, status=400):
    return JsonResponse({'status': 'error', 'message': message}, status=status)


def _survey_payload_from_request(request):
    if request.content_type == 'application/json':
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return None

    if request.POST:
        data = {
            'name': request.POST.get('name', ''),
            'description': request.POST.get('description', ''),
            'questions': {},
        }
        for key, value in request.POST.items():
            if key.startswith(('question_', 'type_', 'answer_')):
                parts = key.split('_')
                if len(parts) < 2:
                    continue
                field = parts[0]
                question_id = parts[1]
                data['questions'].setdefault(question_id, {'answers': {}})
                if field == 'question':
                    data['questions'][question_id]['question'] = value
                elif field == 'type':
                    data['questions'][question_id]['type'] = value
                elif field == 'answer' and len(parts) >= 3:
                    data['questions'][question_id]['answers'][parts[2]] = value
        return data

    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return None


def _validate_survey_payload(data):
    if not isinstance(data, dict):
        return None, 'Invalid JSON data'

    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    if not name:
        return None, 'Survey name is required'

    questions = data.get('questions') or {}
    if not isinstance(questions, dict):
        return None, 'Invalid question format'

    cleaned_questions = []
    for q_data in questions.values():
        if not isinstance(q_data, dict):
            return None, 'Invalid question format'

        question_text = (q_data.get('question') or '').strip()
        answers = q_data.get('answers') or {}
        if not isinstance(answers, dict):
            return None, 'Invalid answer format'

        cleaned_answers = [answer.strip() for answer in answers.values() if answer and answer.strip()]
        if not question_text and not cleaned_answers:
            continue
        if not question_text:
            return None, 'Question text is required when answers are provided'

        question_type = q_data.get('type') or 'Radio'
        if question_type not in QUESTION_TYPES:
            return None, 'Invalid question type'

        cleaned_questions.append({
            'question': question_text,
            'type': question_type,
            'answers': cleaned_answers if question_type in CHOICE_QUESTION_TYPES else [],
        })

    return {'name': name, 'description': description, 'questions': cleaned_questions}, None


def _create_questions(survey, questions):
    for q_data in questions:
        question = Questions.objects.create(
            survey_id=survey,
            question=q_data['question'],
            type=q_data['type'],
        )
        for answer_text in q_data['answers']:
            Answers.objects.create(question_id=question, answer=answer_text)


def _survey_publish_error(survey):
    questions = Questions.objects.filter(survey_id=survey).prefetch_related('answers')
    if not questions.exists():
        return 'Add at least one question before publishing this survey.'

    for question in questions:
        if not question.question.strip():
            return 'Every question needs text before publishing this survey.'
        if question.type in CHOICE_QUESTION_TYPES and not question.answers.exists():
            return 'Every question needs at least one answer before publishing this survey.'

    return None

def home(request):
    if request.GET.get('role') == 'taker' and request.user.groups.filter(name='Taker').exists():
        surveytake=survey_take(request)
        return render(request, 'taker_dashboard.html', surveytake)

    if request.user.groups.filter(name='Creator').exists():
        survey_all = Surveys.objects.filter(user_id=request.user.id).order_by('id')
        draft_surveys, published_surveys, closed_surveys = categorize_surveys(survey_all)
    
        survey_context = {
            'draft_surveys': draft_surveys,
            'published_surveys': published_surveys,
            'closed_surveys': closed_surveys,
        }
        return render(request, 'creator_dashboard.html', survey_context)
    
    elif request.user.groups.filter(name='Taker').exists():
        #---MZ---
        surveytake=survey_take(request)
        return render(request, 'taker_dashboard.html',surveytake)
    
    return render(request, 'home.html')


@user_passes_test(in_survey_creator_group)
def survey_create(request):
    if request.method == 'POST':
        data = _survey_payload_from_request(request)
        payload, error = _validate_survey_payload(data)
        if error:
            return _error_response(error)

        with transaction.atomic():
            new_survey = Surveys.objects.create(
                name=payload['name'],
                description=payload['description'],
                user_id=request.user,
                republished=1,
                status='d'
            )
            _create_questions(new_survey, payload['questions'])

        return JsonResponse({'status': 'success', 'message': 'Survey created successfully', 'id': new_survey.id})

    return render(request, 'new_survey.html')

@login_required
def survey_delete(request, id):
    delete_survey = get_object_or_404(Surveys, id=id)
    if delete_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to delete this survey.")
    delete_survey.delete()
    return redirect('home')

@login_required
def survey_publish(request, id):
    publish_survey = get_object_or_404(Surveys, id=id)

    if publish_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to publish this survey.")
    publish_error = _survey_publish_error(publish_survey)
    if publish_error:
        return HttpResponse(publish_error, status=400)
    publish_survey.status = 'p' 
    publish_survey.save()  
    return redirect('home')  

@login_required
def survey_close(request, id):
    close_survey = get_object_or_404(Surveys, id=id)

    if close_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to close this survey.")
    
    close_survey.status = 'c' 
    close_survey.save()  
    return redirect('home') 

@login_required
def survey_draft(request, id):
    draft_survey = get_object_or_404(Surveys, id=id)

    if draft_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to draft this survey.")
    
    draft_survey.status = 'd' 
    draft_survey.save()  
    return redirect('home') 

@login_required
def survey_republish(request, id):
    repubish_survey = get_object_or_404(Surveys, id=id)

    if repubish_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to republish this survey.")
    publish_error = _survey_publish_error(repubish_survey)
    if publish_error:
        return HttpResponse(publish_error, status=400)
    
    repubish_survey.status = 'p' 
    repubish_survey.republished += 1
    repubish_survey.save()  
    return redirect('home')

@login_required
def survey_edit(request, id):
    old_survey = get_object_or_404(Surveys, id=id)
    if old_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to edit this survey.")

    if request.method == 'POST':
        data = _survey_payload_from_request(request)
        payload, error = _validate_survey_payload(data)
        if error:
            return _error_response(error)

        with transaction.atomic():
            old_survey.name = payload['name']
            old_survey.description = payload['description']
            old_survey.save()
            Questions.objects.filter(survey_id=old_survey).delete()
            _create_questions(old_survey, payload['questions'])

        return JsonResponse({'status': 'success', 'message': 'Survey updated successfully'})

    questions = Questions.objects.filter(survey_id=old_survey)

    questions_data = []
    for question in questions:
        answers = Answers.objects.filter(question_id=question)
        answers_data = {answer.id: answer.answer for answer in answers}
        questions_data.append({
            'question': question,
            'answers': answers_data 
        })

    context = {
        'survey': old_survey,
        'questions_data': questions_data
    }
    return render(request, 'survey_edit.html', context)

#--- MZ ---
def survey_take(request):
    surveys = []
    for survey in Surveys.objects.filter(status='p').order_by('id'):
        user_results = Results.objects.filter(
            survey_id=survey,
            user_id=request.user,
            republished_version=survey.republished,
        )
        has_current_response = user_results.filter(republished_version=survey.republished).exists()
        submissions = []
        for index, submission in enumerate(
            user_results.exclude(submission_id='')
            .values('submission_id')
            .annotate(first_result_id=Min('id'))
            .order_by('first_result_id'),
            start=1,
        ):
            submissions.append({
                'id': submission['submission_id'],
                'label': f'Response {index}',
            })
        legacy_results = user_results.filter(submission_id='')
        if legacy_results.exists():
            submissions.append({
                'id': f'{LEGACY_SUBMISSION_PREFIX}{request.user.id}',
                'label': f'Response {len(submissions) + 1}',
                'legacy': True,
            })

        surveys.append({
            'id': survey.id,
            'name': survey.name,
            'description': survey.description,
            'republished': survey.republished,
            'action_label': 'Submit Another Response' if has_current_response else 'Click to Start',
            'submissions': submissions,
        })

    return {'surveys': surveys}

# def survey_take(request):
#     surveys = Surveys.objects.filter(status='p')
#     surveys = {
#         "surveys":surveys
#     }
#     print (surveys)
#     return surveys

@login_required
def qa_view(request, id):
    survey = get_object_or_404(Surveys.objects.prefetch_related('questions__answers'), id=id, status='p')
    # republished_ver=survey.republished #Directly referenced on the front end
    user=request.user
    question_items = _question_items_for_submission(survey)
    return render(request, 'qa.html', {'survey': survey, 'question_items': question_items,'user':user})


def _results_for_submission(survey, submission_id, user):
    filters = {
        'survey_id': survey,
        'user_id': user,
        'republished_version': survey.republished,
    }
    if submission_id and submission_id.startswith(LEGACY_SUBMISSION_PREFIX):
        return Results.objects.filter(**filters, submission_id='')
    return Results.objects.filter(**filters, submission_id=submission_id)


def _question_items_for_submission(survey, submission_id=None, user=None):
    results = Results.objects.none()
    if submission_id and user:
        results = _results_for_submission(survey, submission_id, user)

    question_items = []
    for question in survey.questions.prefetch_related('answers').all():
        question_results = list(results.filter(question_id=question))
        selected_answer_ids = [
            result.answer_id_id
            for result in question_results
            if result.answer_id_id
        ]
        text_answer = ''
        other_text = ''
        for result in question_results:
            if result.text_answer:
                if result.text_answer.startswith('Other: '):
                    other_text = result.text_answer.removeprefix('Other: ')
                else:
                    text_answer = result.text_answer

        question_items.append({
            'question': question,
            'selected_answer_ids': selected_answer_ids,
            'text_answer': text_answer,
            'other_text': other_text,
        })

    return question_items


@login_required
def qa_edit_response(request, id, submission_id):
    survey = get_object_or_404(Surveys.objects.prefetch_related('questions__answers'), id=id, status='p')
    if not _results_for_submission(survey, submission_id, request.user).exists():
        return HttpResponseForbidden("You do not have permission to edit this response.")

    question_items = _question_items_for_submission(survey, submission_id=submission_id, user=request.user)
    return render(request, 'qa.html', {
        'survey': survey,
        'question_items': question_items,
        'user': request.user,
        'editing_submission_id': submission_id,
    })

@login_required
def qa_submit(request):
    if request.method == 'POST':
        survey_id = request.POST.get('survey_id')
        user = request.user
        survey = get_object_or_404(Surveys, id=survey_id, status='p')
        republished_ver=survey.republished
        submitted_submission_id = (request.POST.get('submission_id') or '').strip()
        submission_id = submitted_submission_id or str(uuid.uuid4())

        with transaction.atomic():
            if submitted_submission_id:
                existing_results = _results_for_submission(survey, submitted_submission_id, user)
                if not existing_results.exists():
                    return HttpResponseForbidden("You do not have permission to edit this response.")
                existing_results.delete()
                if submitted_submission_id.startswith(LEGACY_SUBMISSION_PREFIX):
                    submission_id = str(uuid.uuid4())

            # Obtain the questions and responses, then store them in the Result table.
            for question in survey.questions.all():
                if question.type in TEXT_QUESTION_TYPES:
                    text_answer = (request.POST.get(f'text_question_{question.id}') or '').strip()
                    if text_answer:
                        Results.objects.create(
                            survey_id=survey,
                            question_id=question,
                            answer_id=None,
                            text_answer=text_answer,
                            user_id=user,
                            republished_version=republished_ver,
                            submission_id=submission_id
                        )
                    continue

                selected_answers = request.POST.getlist(f'question_{question.id}')
                if question.type in ('Radio', 'Dropdown'):
                    selected_answers = selected_answers[:1]

                for answer_id in selected_answers:
                    if not answer_id:
                        continue
                    if answer_id == OTHER_ANSWER_VALUE and question.type in ('Radio', 'Checkboxes'):
                        other_answer = (request.POST.get(f'other_question_{question.id}') or '').strip()
                        if other_answer:
                            Results.objects.create(
                                survey_id=survey,
                                question_id=question,
                                answer_id=None,
                                text_answer=f'Other: {other_answer}',
                                user_id=user,
                                republished_version=republished_ver,
                                submission_id=submission_id
                            )
                        continue
                    answer = get_object_or_404(Answers, id=answer_id, question_id=question)

                    Results.objects.create(
                        survey_id=survey,
                        question_id=question,
                        answer_id=answer,
                        text_answer='',
                        user_id=user,
                        republished_version=republished_ver,
                        submission_id=submission_id
                    )
        return render(request,'complete.html')
        # return redirect('complete')
        # return redirect('thankyou',id=survey_id) #Pass the ID as survey_id to the thank you function
    return HttpResponse('Invalid request method.', status=405)

# render thankyou to qa.html iframe as the wisdom crowed
def thankyou(request,id):
    survey = get_object_or_404(Surveys, id=id)
    results = Results.objects.filter(survey_id=survey, republished_version=survey.republished)
    # print(results)
    stats = (
        results.exclude(answer_id__isnull=True).values('question_id', 'answer_id')
        .annotate(count=Count('id')) # The number of answers for each response
    )
    # print(stats)
    question_totals = (
        results.values('question_id')
        .annotate(total=Count('id'))  # Total count of responses for each question
    )
    # print(question_totals)
    question_totals_dict = {item['question_id']: item['total'] for item in question_totals}
    # print(question_totals_dict)
    for stat in stats:
        question_id = stat['question_id']
        total = question_totals_dict.get(question_id, 0)
        stat['percentage'] = (stat['count'] / total * 100) if total > 0 else 0
    
    from collections import defaultdict
    grouped_stats = defaultdict(list)
    for stat in stats:
        question=Questions.objects.filter(id=stat['question_id']).values_list('question', flat=True).first() #find question corresponding to id
        answer=Answers.objects.filter(id=stat['answer_id']).values_list('answer', flat=True).first() #find the selected answer
        grouped_stats[question].append({
            'answer_id': answer,
            # 'answer_id': stat['answer_id'],
            'count': stat['count'],
            'percentage': stat['percentage'],
        })
    # print(grouped_stats)
    grouped_stats = dict(grouped_stats) #If defaultdict is not converted to dict, it will not be displayed.
    # print(grouped_stats)
    context = {
        'survey_id': id,
        'grouped_stats': grouped_stats,  # {question_id: [{answer_id, count, percentage}, ...]}
    }
    return render(request, 'thankyou.html',context)

def complete(request):
    context={
        "data":"Survey Complete, Thank You For Your cooperation!"
    }
    return render(request, 'complete.html',context)


    
