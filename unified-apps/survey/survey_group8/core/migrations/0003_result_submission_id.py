from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_text_results_and_question_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='results',
            name='submission_id',
            field=models.CharField(blank=True, db_index=True, max_length=36),
        ),
    ]
