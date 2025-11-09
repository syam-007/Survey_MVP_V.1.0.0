# Generated manually
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('survey_api', '0037_remove_client_customer_relationship'),
    ]

    operations = [
        # Remove old rig_name index
        migrations.RemoveIndex(
            model_name='rig',
            name='idx_rigs_name',
        ),
        # Add rig_id field
        migrations.AddField(
            model_name='rig',
            name='rig_id',
            field=models.CharField(default='', help_text='Rig identifier', max_length=100),
            preserve_default=False,
        ),
        # Remove rig_name field
        migrations.RemoveField(
            model_name='rig',
            name='rig_name',
        ),
        # Add new rig_id index
        migrations.AddIndex(
            model_name='rig',
            index=models.Index(fields=['rig_id'], name='idx_rigs_id'),
        ),
        # Update ordering in Meta
        migrations.AlterModelOptions(
            name='rig',
            options={'ordering': ['rig_id']},
        ),
    ]
