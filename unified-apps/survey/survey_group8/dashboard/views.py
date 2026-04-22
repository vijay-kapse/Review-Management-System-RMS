from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import Group
from core.models import Surveys, Questions, Answers, Results
from django.contrib.auth.decorators import user_passes_test
from django.http import HttpResponseForbidden,JsonResponse,HttpResponse
import json
from django import forms
from .forms  import AnswerForm
from django.db.models import Count
from django.db.models import F

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

def home(request):
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
        print(request.body)
        try:
            data = json.loads(request.body) 
            name = data.get('name')
            description = data.get('description')
            user = request.user
            new_survey = Surveys.objects.create(
                name=name,
                description=description,
                user_id=user,
                republished=1,
                status='d'
            )

            questions = data.get('questions', {})
            for q_number, q_data in questions.items():
                question_text = q_data.get('question')
                question_type = q_data.get('type', 'Radio')

                question = Questions.objects.create(
                    survey_id=new_survey,
                    question=question_text,
                    type=question_type
                )

                answers = q_data.get('answers', {})
                for a_text in answers.values():
                    if a_text:
                        Answers.objects.create(
                            question_id=question,
                            answer=a_text
                        )

            return JsonResponse({'status': 'success', 'message': 'Survey created successfully'})
        
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON data'}, status=400)

    return render(request, 'new_survey.html')

@login_required
def survey_delete(request, id):
    delete_survey = Surveys.objects.get(id=id)
    delete_survey.delete()
    return redirect('home')

@login_required
def survey_publish(request, id):
    publish_survey = get_object_or_404(Surveys, id=id)

    if publish_survey.user_id != request.user:
        return HttpResponseForbidden("You do not have permission to publish this survey.")
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
    
    repubish_survey.status = 'p' 
    repubish_survey.republished += 1
    repubish_survey.save()  
    return redirect('home')

@login_required
@login_required
def survey_edit(request, id):
    old_survey = get_object_or_404(Surveys, id=id)

    if request.method == 'POST':

        try:
            data = json.loads(request.body)
            name = data.get('name')
            description = data.get('description')

        
            old_survey.name = name
            old_survey.description = description
            old_survey.save()  


            Questions.objects.filter(survey_id=old_survey).delete()
            Answers.objects.filter(question_id__survey_id=old_survey).delete()

            questions = data.get('questions', {})
            for q_number, q_data in questions.items():
                if isinstance(q_data, dict): 
                    question_text = q_data.get('question')
                    question_type = q_data.get('type', 'Radio')

                    question = Questions.objects.create(
                        survey_id=old_survey,
                        question=question_text,
                        type=question_type
                    )

                    answers = q_data.get('answers', {})
                    for a_text in answers.values():
                        if a_text:
                            Answers.objects.create(
                                question_id=question,
                                answer=a_text
                            )
                else:
                    print(f"Unexpected format for question: {q_data}")
                    return JsonResponse({'status': 'error', 'message': 'Invalid question format'}, status=400)

            return JsonResponse({'status': 'success', 'message': 'Survey updated successfully'})
        
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON data'}, status=400)

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
    # surveys = Surveys.objects.filter(status='p')
    ids_with_status_p = Surveys.objects.filter(status="p").values_list('id', flat=True)
    # print(list(ids_with_status_p))
    mydict = {'surveys': [],'not_exist':None}
    for j in list(ids_with_status_p):
        if not Results.objects.filter(survey_id=j,user_id=request.user).exists(): #If it is determined that the survey does not contain a survey_id of p in the result, the survey will be initiated.
            surveys = Surveys.objects.filter(id=j).values('id', 'name', 'description','republished')
            mydict['surveys'].extend(surveys)
            mydict['not_exist'] = 'not_exist'
        elif Results.objects.filter(survey_id=j).exists() and Surveys.objects.filter(republished__gt=1): #If it exists in result and republish>1, then change mind,
            surveys = Surveys.objects.filter(id=j,republished__gt=1).exclude(id__in=Results.objects.filter(republished_version=F('survey_id__republished')).values('survey_id'))
            # surveys = Surveys.objects.filter(id=j,republished__gt=1).values('id', 'name', 'description','republished')
            mydict['surveys'].extend(surveys)
        # elif Results.objects.filter(survey_id=j,republished__gt=1).exists():
    
    # print(mydict)
    return mydict

# def survey_take(request):
#     surveys = Surveys.objects.filter(status='p')
#     surveys = {
#         "surveys":surveys
#     }
#     print (surveys)
#     return surveys

def qa_view(request, id):
    survey = Surveys.objects.prefetch_related('questions__answers').get(id=id, status='p')
    # republished_ver=survey.republished #Directly referenced on the front end
    user=request.user
    questions = survey.questions.all()
    return render(request, 'qa.html', {'survey': survey, 'questions': questions,'user':user})

@login_required
def qa_submit(request):
    if request.method == 'POST':
        survey_id = request.POST.get('survey_id')
        user = request.user
        survey = get_object_or_404(Surveys, id=survey_id)
        republished_ver=survey.republished
        # Obtain the questions and responses, then store them in the Result table.
        for question in survey.questions.all():
            selected_answers = request.POST.getlist(f'question_{question.id}')  # Retrieve selected answer
            
            for answer_id in selected_answers:
                answer = get_object_or_404(Answers, id=answer_id)
                
                Results.objects.create(
                    survey_id=survey,
                    question_id=question,
                    answer_id=answer,
                    user_id=user,
                    republished_version=republished_ver
                )
        return render(request,'complete.html')
        # return redirect('complete')
        # return redirect('thankyou',id=survey_id) #Pass the ID as survey_id to the thank you function
    return HttpResponse('Invalid request method.', status=405)

# render thankyou to qa.html iframe as the wisdom crowed
def thankyou(request,id):
    # print(id)
    results = Results.objects.filter(survey_id=id)
    # print(results)
    stats = (
        results.values('question_id', 'answer_id')
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
        answer=Answers.objects.filter(question_id=stat['question_id']).values_list('answer', flat=True).first() #find the answer corresponding to question_id
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


    
