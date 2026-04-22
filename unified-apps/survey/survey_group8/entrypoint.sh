#!/bin/bash

# Wait for PostgreSQL to be ready
/scripts/wait-for-it.sh db:5432 -- python manage.py makemigrations && python manage.py migrate && python manage.py create_groups

python manage.py collectstatic --noinput
# Start Gunicorn
exec gunicorn --bind 0.0.0.0:8000 survey_group8.wsgi:application
