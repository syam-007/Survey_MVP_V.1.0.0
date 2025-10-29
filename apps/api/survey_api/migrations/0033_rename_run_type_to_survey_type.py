# Generated migration for renaming run_type to survey_type and adding new run_type

from django.db import migrations, models


def copy_run_type_to_survey_type(apps, schema_editor):
    """Copy existing run_type values to survey_type"""
    Run = apps.get_model('survey_api', 'Run')
    for run in Run.objects.all():
        run.survey_type = run.run_type
        run.save()


class Migration(migrations.Migration):

    dependencies = [
        ('survey_api', '0032_qualitycheck_delta_gt_percentage_and_more'),
    ]

    operations = [
        # Step 1: Add survey_type as nullable
        migrations.AddField(
            model_name='run',
            name='survey_type',
            field=models.CharField(
                max_length=50,
                null=True,
                blank=True,
                choices=[
                    ('GTL', 'GTL'),
                    ('Gyro', 'Gyro'),
                    ('MWD', 'MWD'),
                    ('Unknown', 'Unknown'),
                ]
            ),
        ),

        # Step 2: Copy data from run_type to survey_type
        migrations.RunPython(copy_run_type_to_survey_type, migrations.RunPython.noop),

        # Step 3: Make survey_type non-nullable
        migrations.AlterField(
            model_name='run',
            name='survey_type',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('GTL', 'GTL'),
                    ('Gyro', 'Gyro'),
                    ('MWD', 'MWD'),
                    ('Unknown', 'Unknown'),
                ]
            ),
        ),

        # Step 4: Change run_type to nullable with new choices
        migrations.AlterField(
            model_name='run',
            name='run_type',
            field=models.CharField(
                max_length=50,
                null=True,
                blank=True,
                choices=[
                    ('Memory', 'Memory'),
                    ('Surface Readout', 'Surface Readout'),
                    ('Dummy', 'Dummy'),
                    ('Test Stand', 'Test Stand'),
                ]
            ),
        ),
    ]
