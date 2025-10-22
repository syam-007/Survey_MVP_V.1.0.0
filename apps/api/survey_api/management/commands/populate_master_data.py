"""
Management command to populate master data tables with initial values
"""
from django.core.management.base import BaseCommand
from survey_api.models import HoleSectionMaster, SurveyRunInMaster, MinimumIdMaster


class Command(BaseCommand):
    help = 'Populate master data tables with initial values'

    def handle(self, *args, **kwargs):
        self.stdout.write('Populating master data tables...')

        # Clear existing data
        self.stdout.write('Clearing existing data...')
        HoleSectionMaster.objects.all().delete()
        SurveyRunInMaster.objects.all().delete()
        MinimumIdMaster.objects.all().delete()

        # Populate Hole Sections
        self.stdout.write('Creating Hole Sections...')
        hole_sections_data = [
            ('4 1/2 "', 'casing', 4.5),
            ('7 "', 'casing', 7.0),
            ('8 1/2 "', 'casing', 8.5),
            ('9 5/8 "', 'casing', 9.625),
            ('12 1/4 "', 'casing', 12.25),
            ('13 3/8 "', 'casing', 13.375),
            ('16 "', 'casing', 16.0),
            ('18 "', 'casing', 18.0),
            ('24 "', 'casing', 24.0),
            ('32 "', 'casing', 32.0),
            ('36 "', 'casing', 36.0),
            ('40 "', 'casing', 40.0),
            ('17 1/2"', 'casing', 17.5),
        ]

        hole_sections = []
        for name, section_type, size in hole_sections_data:
            hs = HoleSectionMaster.objects.create(
                hole_section_name=name,
                section_type=section_type,
                size_numeric=size
            )
            hole_sections.append(hs)
            self.stdout.write(f'  Created: {name} ({section_type}) - {size}')

        # Populate Survey Run-Ins
        self.stdout.write('\nCreating Survey Run-Ins...')
        survey_run_ins_data = [
            ('7" Casing', 'casing', 7.0),
            (' 9 5/8" Casing ', 'casing', 9.625),
            ('13 3/8" Casing ', 'casing', 13.375),
            ('18 5/8" Casing', 'casing', 18.625),
            ('20" Casing', 'casing', 20.0),
            ('4" Drillpipe', 'drill_pipe', 4.0),
            ('4 1/2" Drillpipe', 'drill_pipe', 4.5),
            ('5" Drillpipe', 'drill_pipe', 5.0),
            ('4" Tubing', 'tubing', 4.0),
        ]

        survey_run_ins = {}
        for name, run_in_type, size in survey_run_ins_data:
            sri = SurveyRunInMaster.objects.create(
                run_in_name=name,
                run_in_type=run_in_type,
                size_numeric=size
            )
            survey_run_ins[name] = sri
            self.stdout.write(f'  Created: {name} ({run_in_type}) - {size}')

        # Populate Minimum IDs (not linked to specific survey run-ins based on your reference)
        self.stdout.write('\nCreating Minimum IDs...')
        minimum_ids_data = [
            ('2"', 2.0, '7" Casing'),  # Using first survey run-in as default
            ('5 1/4"', 5.25, '7" Casing'),
            ('8"', 8.0, ' 9 5/8" Casing '),
            ('12 1/8"', 12.125, '13 3/8" Casing '),
            ('17 1/2"', 17.5, '18 5/8" Casing'),
            ('18 1/4"', 18.25, '20" Casing'),
        ]

        for name, size, run_in_name in minimum_ids_data:
            if run_in_name in survey_run_ins:
                MinimumIdMaster.objects.create(
                    minimum_id_name=name,
                    size_numeric=size,
                    survey_run_in=survey_run_ins[run_in_name]
                )
                self.stdout.write(f'  Created: {name} (for {run_in_name}) - {size}')

        self.stdout.write(self.style.SUCCESS('\nMaster data populated successfully!'))
        self.stdout.write(f'  - Hole Sections: {HoleSectionMaster.objects.count()}')
        self.stdout.write(f'  - Survey Run-Ins: {SurveyRunInMaster.objects.count()}')
        self.stdout.write(f'  - Minimum IDs: {MinimumIdMaster.objects.count()}')
