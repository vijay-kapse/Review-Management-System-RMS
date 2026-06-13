import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='questions',
            name='type',
            field=models.CharField(max_length=20),
        ),
        migrations.AlterField(
            model_name='results',
            name='answer_id',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='answer_results',
                to='core.answers',
            ),
        ),
        migrations.AddField(
            model_name='results',
            name='text_answer',
            field=models.TextField(blank=True),
        ),
    ]
