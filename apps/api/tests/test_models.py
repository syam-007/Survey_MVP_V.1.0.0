from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from decimal import Decimal
from survey_api.models import Well, Run, Location, Depth, SurveyFile, SurveyCalculation, SurveyData, CalculatedSurvey, TieOn

User = get_user_model()


class WellModelTest(TestCase):
    """Test cases for Well model"""

    def setUp(self):
        self.well = Well.objects.create(
            well_name='Test Well 1',
            well_type='Oil'
        )

    def test_well_creation(self):
        """Test successful well creation"""
        self.assertEqual(self.well.well_name, 'Test Well 1')
        self.assertEqual(self.well.well_type, 'Oil')
        self.assertIsNotNone(self.well.id)
        self.assertIsNotNone(self.well.created_at)
        self.assertIsNotNone(self.well.updated_at)

    def test_well_str(self):
        """Test well string representation"""
        self.assertEqual(str(self.well), 'Test Well 1 (Oil)')

    def test_well_unique_name(self):
        """Test well_name unique constraint"""
        with self.assertRaises(IntegrityError):
            Well.objects.create(
                well_name='Test Well 1',
                well_type='Gas'
            )


class RunModelTest(TestCase):
    """Test cases for Run model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.well = Well.objects.create(
            well_name='Test Well',
            well_type='Gas'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run 1',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

    def test_run_creation(self):
        """Test successful run creation"""
        self.assertEqual(self.run.run_number, 'RUN001')
        self.assertEqual(self.run.run_name, 'Test Run 1')
        self.assertEqual(self.run.run_type, 'GTL')
        self.assertEqual(self.run.bhc_enabled, False)  # default
        self.assertEqual(self.run.grid_correction, 0)  # default
        self.assertIsNotNone(self.run.id)
        self.assertIsNotNone(self.run.created_at)
        self.assertIsNotNone(self.run.updated_at)

    def test_run_str(self):
        """Test run string representation"""
        self.assertEqual(str(self.run), 'RUN001 - Test Run 1')

    def test_run_well_relationship(self):
        """Test Run-Well relationship"""
        self.assertEqual(self.run.well, self.well)
        self.assertEqual(self.well.runs.count(), 1)
        self.assertEqual(self.well.runs.first(), self.run)

    def test_run_user_relationship(self):
        """Test Run-User relationship"""
        self.assertEqual(self.run.user, self.user)
        self.assertEqual(self.user.runs.count(), 1)
        self.assertEqual(self.user.runs.first(), self.run)

    def test_run_well_set_null_on_delete(self):
        """Test Run.well is set to NULL when Well is deleted"""
        well_id = self.well.id
        self.well.delete()
        self.run.refresh_from_db()
        self.assertIsNone(self.run.well)

    def test_run_cascade_on_user_delete(self):
        """Test Run is deleted when User is deleted (CASCADE)"""
        run_id = self.run.id
        self.user.delete()
        self.assertFalse(Run.objects.filter(id=run_id).exists())

    def test_run_unique_run_number(self):
        """Test run_number unique constraint"""
        with self.assertRaises(IntegrityError):
            Run.objects.create(
                run_number='RUN001',
                run_name='Different Name',
                run_type='Gyro',
                user=self.user
            )

    def test_run_unique_run_name(self):
        """Test run_name unique constraint"""
        with self.assertRaises(IntegrityError):
            Run.objects.create(
                run_number='RUN002',
                run_name='Test Run 1',
                run_type='Gyro',
                user=self.user
            )

    def test_run_jsonb_vertical_section(self):
        """Test JSONField storage for vertical_section"""
        vertical_section_data = {
            'azimuth': 45.5,
            'inclination': 12.3,
            'direction': 'North'
        }
        run = Run.objects.create(
            run_number='RUN002',
            run_name='Test Run 2',
            run_type='MWD',
            vertical_section=vertical_section_data,
            user=self.user
        )
        run.refresh_from_db()
        self.assertEqual(run.vertical_section, vertical_section_data)
        self.assertEqual(run.vertical_section['azimuth'], 45.5)


class LocationModelTest(TestCase):
    """Test cases for Location model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.well = Well.objects.create(
            well_name='Test Well',
            well_type='Oil'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.location = Location.objects.create(
            run=self.run,
            latitude=Decimal('29.12345678'),
            longitude=Decimal('-95.12345678'),
            easting=Decimal('500000.123'),
            northing=Decimal('3200000.456'),
            geodetic_system='WGS84',
            map_zone='15N',
            north_reference='True North',
            central_meridian=Decimal('-93.0'),
            grid_correction=Decimal('0.123456'),
            g_t=Decimal('0.00012345'),
            max_g_t=Decimal('0.00014815'),
            w_t=Decimal('0.9996'),
            max_w_t=Decimal('1.0004')
        )

    def test_location_creation(self):
        """Test successful location creation with all fields"""
        self.assertEqual(self.location.latitude, Decimal('29.12345678'))
        self.assertEqual(self.location.longitude, Decimal('-95.12345678'))
        self.assertEqual(self.location.easting, Decimal('500000.123'))
        self.assertEqual(self.location.northing, Decimal('3200000.456'))
        self.assertEqual(self.location.geodetic_system, 'WGS84')
        self.assertEqual(self.location.map_zone, '15N')
        self.assertEqual(self.location.north_reference, 'True North')
        self.assertEqual(self.location.central_meridian, Decimal('-93.0'))
        self.assertEqual(self.location.grid_correction, Decimal('0.123456'))
        self.assertEqual(self.location.g_t, Decimal('0.00012345'))
        self.assertEqual(self.location.max_g_t, Decimal('0.00014815'))
        self.assertEqual(self.location.w_t, Decimal('0.9996'))
        self.assertEqual(self.location.max_w_t, Decimal('1.0004'))
        self.assertIsNotNone(self.location.id)
        self.assertIsNotNone(self.location.created_at)
        self.assertIsNotNone(self.location.updated_at)

    def test_location_str_with_run(self):
        """Test location string representation for run"""
        self.assertEqual(str(self.location), 'Location for Run RUN001')

    def test_location_str_with_well(self):
        """Test location string representation for well"""
        location_well = Location.objects.create(
            well=self.well,
            latitude=30.0,
            longitude=-96.0
        )
        self.assertEqual(str(location_well), 'Location for Well Test Well')

    def test_location_run_relationship(self):
        """Test Location-Run OneToOne relationship"""
        self.assertEqual(self.location.run, self.run)
        self.assertEqual(self.run.location, self.location)

    def test_location_well_relationship(self):
        """Test Location-Well OneToOne relationship"""
        location_well = Location.objects.create(
            well=self.well,
            latitude=30.0,
            longitude=-96.0
        )
        self.assertEqual(location_well.well, self.well)
        self.assertEqual(self.well.location, location_well)

    def test_location_cascade_on_run_delete(self):
        """Test Location is deleted when Run is deleted (CASCADE)"""
        location_id = self.location.id
        self.run.delete()
        self.assertFalse(Location.objects.filter(id=location_id).exists())

    def test_location_cascade_on_well_delete(self):
        """Test Location is deleted when Well is deleted (CASCADE)"""
        location_well = Location.objects.create(
            well=self.well,
            latitude=30.0,
            longitude=-96.0
        )
        location_id = location_well.id
        self.well.delete()
        self.assertFalse(Location.objects.filter(id=location_id).exists())

    def test_location_default_values(self):
        """Test location default values for optional fields"""
        # Create a new run for this test since self.run already has a location
        run2 = Run.objects.create(
            run_number='RUN_DEFAULTS',
            run_name='Test Defaults',
            run_type='GTL',
            user=self.user
        )
        location = Location.objects.create(
            run=run2,
            latitude=45.0,
            longitude=-122.0
        )
        self.assertEqual(location.geodetic_system, 'WGS84')
        self.assertEqual(location.map_zone, '15N')
        self.assertEqual(location.north_reference, 'True North')
        self.assertEqual(location.central_meridian, Decimal('0.0'))

    def test_location_north_reference_choices(self):
        """Test north_reference choices are valid"""
        valid_choices = ['True North', 'Grid North', 'Magnetic North']
        for choice in valid_choices:
            location = Location.objects.create(
                run=Run.objects.create(
                    run_number=f'RUN_{choice}',
                    run_name=f'Test Run {choice}',
                    run_type='GTL',
                    user=self.user
                ),
                latitude=30.0,
                longitude=-96.0,
                north_reference=choice
            )
            self.assertEqual(location.north_reference, choice)

    def test_location_cannot_have_both_run_and_well(self):
        """Test Location validation fails when both run and well are set"""
        from django.core.exceptions import ValidationError
        location = Location(
            run=self.run,
            well=self.well,
            latitude=30.0,
            longitude=-96.0
        )
        with self.assertRaises(ValidationError) as context:
            location.save()
        self.assertIn('run or a well, not both', str(context.exception))

    def test_location_must_have_run_or_well(self):
        """Test Location validation fails when neither run nor well is set"""
        from django.core.exceptions import ValidationError
        location = Location(
            latitude=30.0,
            longitude=-96.0
        )
        with self.assertRaises(ValidationError) as context:
            location.save()
        self.assertIn('either a run or a well', str(context.exception))

    def test_location_latitude_validation_range(self):
        """Test latitude validators ensure range -90 to 90"""
        from django.core.exceptions import ValidationError
        from decimal import Decimal

        # Test valid extremes
        location_north = Location.objects.create(
            run=Run.objects.create(
                run_number='RUN_NORTH',
                run_name='North Test',
                run_type='GTL',
                user=self.user
            ),
            latitude=Decimal('90.0'),
            longitude=0.0
        )
        self.assertEqual(location_north.latitude, 90.0)

        location_south = Location.objects.create(
            run=Run.objects.create(
                run_number='RUN_SOUTH',
                run_name='South Test',
                run_type='GTL',
                user=self.user
            ),
            latitude=Decimal('-90.0'),
            longitude=0.0
        )
        self.assertEqual(location_south.latitude, -90.0)

    def test_location_longitude_validation_range(self):
        """Test longitude validators ensure range -180 to 180"""
        from decimal import Decimal

        # Test valid extremes
        location_east = Location.objects.create(
            run=Run.objects.create(
                run_number='RUN_EAST',
                run_name='East Test',
                run_type='GTL',
                user=self.user
            ),
            latitude=0.0,
            longitude=Decimal('180.0')
        )
        self.assertEqual(location_east.longitude, 180.0)

        location_west = Location.objects.create(
            run=Run.objects.create(
                run_number='RUN_WEST',
                run_name='West Test',
                run_type='GTL',
                user=self.user
            ),
            latitude=0.0,
            longitude=Decimal('-180.0')
        )
        self.assertEqual(location_west.longitude, -180.0)

    def test_location_calculated_fields_nullable(self):
        """Test calculated fields can be null"""
        location = Location.objects.create(
            run=Run.objects.create(
                run_number='RUN_MINIMAL',
                run_name='Minimal Test',
                run_type='GTL',
                user=self.user
            ),
            latitude=45.0,
            longitude=-122.0
        )
        # These fields should be nullable
        self.assertIsNone(location.easting)
        self.assertIsNone(location.northing)
        self.assertIsNone(location.grid_correction)
        self.assertIsNone(location.g_t)
        self.assertIsNone(location.max_g_t)
        self.assertIsNone(location.w_t)
        self.assertIsNone(location.max_w_t)

    def test_location_onetoone_constraint(self):
        """Test OneToOne constraint prevents duplicate locations for same run"""
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            Location.objects.create(
                run=self.run,
                latitude=30.0,
                longitude=-96.0
            )


class DepthModelTest(TestCase):
    """Test cases for Depth model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.depth = Depth.objects.create(
            run=self.run,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.500'),
            reference_elevation=Decimal('985.250')
        )

    def test_depth_creation(self):
        """Test successful depth creation"""
        self.assertEqual(self.depth.elevation_reference, 'KB')
        self.assertEqual(self.depth.reference_datum, 'WGS84')
        self.assertEqual(self.depth.reference_height, Decimal('1500.500'))
        self.assertEqual(self.depth.reference_elevation, Decimal('985.250'))
        self.assertIsNotNone(self.depth.id)
        self.assertIsNotNone(self.depth.created_at)
        self.assertIsNotNone(self.depth.updated_at)

    def test_depth_str_with_run(self):
        """Test depth string representation for run"""
        self.assertEqual(str(self.depth), 'Depth for Run RUN001')

    def test_depth_str_with_well(self):
        """Test depth string representation for well"""
        well = Well.objects.create(well_name='Test Well', well_type='Oil')
        depth_well = Depth.objects.create(
            well=well,
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('1500.0'),
            reference_elevation=Decimal('985.0')
        )
        self.assertEqual(str(depth_well), 'Depth for Well Test Well')

    def test_depth_run_relationship(self):
        """Test Depth-Run OneToOne relationship"""
        self.assertEqual(self.depth.run, self.run)
        self.assertEqual(self.run.depth, self.depth)

    def test_depth_well_relationship(self):
        """Test Depth-Well OneToOne relationship"""
        well = Well.objects.create(well_name='Test Well 2', well_type='Gas')
        depth_well = Depth.objects.create(
            well=well,
            elevation_reference='RT',
            reference_datum='WGS84',
            reference_height=Decimal('2000.0'),
            reference_elevation=Decimal('1200.0')
        )
        self.assertEqual(depth_well.well, well)
        self.assertEqual(well.depth, depth_well)

    def test_depth_cascade_on_run_delete(self):
        """Test Depth is deleted when Run is deleted (CASCADE)"""
        depth_id = self.depth.id
        self.run.delete()
        self.assertFalse(Depth.objects.filter(id=depth_id).exists())

    def test_depth_cascade_on_well_delete(self):
        """Test Depth is deleted when Well is deleted (CASCADE)"""
        well = Well.objects.create(well_name='Cascade Well', well_type='Oil')
        depth_well = Depth.objects.create(
            well=well,
            elevation_reference='GL',
            reference_datum='NAD83',
            reference_height=Decimal('1000.0'),
            reference_elevation=Decimal('500.0')
        )
        depth_id = depth_well.id
        well.delete()
        self.assertFalse(Depth.objects.filter(id=depth_id).exists())

    def test_depth_elevation_reference_choices(self):
        """Test elevation_reference valid choices"""
        valid_choices = ['KB', 'RT', 'GL', 'MSL', 'DF', 'RKB']
        for choice in valid_choices:
            depth = Depth.objects.create(
                run=Run.objects.create(
                    run_number=f'RUN_{choice}',
                    run_name=f'Test {choice}',
                    run_type='GTL',
                    user=self.user
                ),
                elevation_reference=choice,
                reference_datum='WGS84',
                reference_height=Decimal('1500.0'),
                reference_elevation=Decimal('1000.0')
            )
            self.assertEqual(depth.elevation_reference, choice)

    def test_depth_default_values(self):
        """Test depth default values"""
        run2 = Run.objects.create(
            run_number='RUN_DEFAULTS',
            run_name='Defaults Test',
            run_type='MWD',
            user=self.user
        )
        depth = Depth.objects.create(run=run2)
        self.assertEqual(depth.elevation_reference, 'KB')
        self.assertEqual(depth.reference_datum, 'WGS84')
        self.assertEqual(depth.reference_height, Decimal('0.000'))
        self.assertEqual(depth.reference_elevation, Decimal('0.000'))

    def test_depth_cannot_have_both_run_and_well(self):
        """Test Depth validation fails when both run and well are set"""
        from django.core.exceptions import ValidationError
        well = Well.objects.create(well_name='Both Test', well_type='Water')
        depth = Depth(
            run=self.run,
            well=well,
            elevation_reference='MSL',
            reference_datum='WGS84',
            reference_height=Decimal('100.0'),
            reference_elevation=Decimal('50.0')
        )
        with self.assertRaises(ValidationError) as context:
            depth.save()
        self.assertIn('run or a well, not both', str(context.exception))

    def test_depth_must_have_run_or_well(self):
        """Test Depth validation fails when neither run nor well is set"""
        from django.core.exceptions import ValidationError
        depth = Depth(
            elevation_reference='KB',
            reference_datum='WGS84',
            reference_height=Decimal('100.0'),
            reference_elevation=Decimal('50.0')
        )
        with self.assertRaises(ValidationError) as context:
            depth.save()
        self.assertIn('either a run or a well', str(context.exception))

    def test_depth_onetoone_constraint(self):
        """Test OneToOne constraint prevents duplicate depths for same run"""
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            Depth.objects.create(
                run=self.run,
                elevation_reference='RT',
                reference_datum='NAD83',
                reference_height=Decimal('200.0'),
                reference_elevation=Decimal('100.0')
            )


class SurveyFileModelTest(TestCase):
    """Test cases for SurveyFile model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.survey_file = SurveyFile.objects.create(
            run=self.run,
            file_name='survey_data.xlsx',
            file_path='/uploads/survey_data.xlsx',
            file_size=102400,
            survey_type='GTL'
        )

    def test_survey_file_creation(self):
        """Test successful survey file creation"""
        self.assertEqual(self.survey_file.file_name, 'survey_data.xlsx')
        self.assertEqual(self.survey_file.file_path, '/uploads/survey_data.xlsx')
        self.assertEqual(self.survey_file.file_size, 102400)
        self.assertEqual(self.survey_file.survey_type, 'GTL')
        self.assertEqual(self.survey_file.processing_status, 'uploaded')  # default
        self.assertIsNotNone(self.survey_file.id)
        self.assertIsNotNone(self.survey_file.created_at)

    def test_survey_file_str(self):
        """Test survey file string representation"""
        self.assertEqual(str(self.survey_file), 'survey_data.xlsx (uploaded)')

    def test_survey_file_run_relationship(self):
        """Test SurveyFile-Run relationship"""
        self.assertEqual(self.survey_file.run, self.run)
        self.assertEqual(self.run.survey_files.count(), 1)
        self.assertEqual(self.run.survey_files.first(), self.survey_file)

    def test_survey_file_cascade_on_run_delete(self):
        """Test SurveyFile is deleted when Run is deleted (CASCADE)"""
        file_id = self.survey_file.id
        self.run.delete()
        self.assertFalse(SurveyFile.objects.filter(id=file_id).exists())

    def test_survey_file_processing_status_default(self):
        """Test processing_status default value"""
        file = SurveyFile.objects.create(
            run=self.run,
            file_name='test.xlsx',
            file_path='/uploads/test.xlsx',
            file_size=1024,
            survey_type='Gyro'
        )
        self.assertEqual(file.processing_status, 'uploaded')

    def test_survey_file_jsonb_calculated_data(self):
        """Test JSONField storage for calculated_data"""
        calculated_data = {
            'total_stations': 150,
            'max_inclination': 45.2,
            'max_tvd': 5000.5,
            'calculations': [
                {'station': 1, 'md': 100, 'inc': 0.5},
                {'station': 2, 'md': 200, 'inc': 1.2}
            ]
        }
        self.survey_file.calculated_data = calculated_data
        self.survey_file.save()
        self.survey_file.refresh_from_db()
        self.assertEqual(self.survey_file.calculated_data, calculated_data)
        self.assertEqual(self.survey_file.calculated_data['total_stations'], 150)


class SurveyCalculationModelTest(TestCase):
    """Test cases for SurveyCalculation model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.survey_file = SurveyFile.objects.create(
            run=self.run,
            file_name='survey_data.xlsx',
            file_path='/uploads/survey_data.xlsx',
            file_size=102400,
            survey_type='GTL'
        )
        self.calculation = SurveyCalculation.objects.create(
            survey_file=self.survey_file,
            calculation_type='Minimum Curvature',
            parameters={'tolerance': 0.01},
            results={'tvd': 5000, 'stations': 100}
        )

    def test_calculation_creation(self):
        """Test successful calculation creation"""
        self.assertEqual(self.calculation.calculation_type, 'Minimum Curvature')
        self.assertEqual(self.calculation.parameters, {'tolerance': 0.01})
        self.assertEqual(self.calculation.results, {'tvd': 5000, 'stations': 100})
        self.assertEqual(self.calculation.status, 'processing')  # default
        self.assertIsNotNone(self.calculation.id)
        self.assertIsNotNone(self.calculation.created_at)

    def test_calculation_str(self):
        """Test calculation string representation"""
        self.assertEqual(str(self.calculation), 'Minimum Curvature (processing)')

    def test_calculation_survey_file_relationship(self):
        """Test SurveyCalculation-SurveyFile relationship"""
        self.assertEqual(self.calculation.survey_file, self.survey_file)
        self.assertEqual(self.survey_file.calculations.count(), 1)
        self.assertEqual(self.survey_file.calculations.first(), self.calculation)

    def test_calculation_cascade_on_file_delete(self):
        """Test SurveyCalculation is deleted when SurveyFile is deleted (CASCADE)"""
        calc_id = self.calculation.id
        self.survey_file.delete()
        self.assertFalse(SurveyCalculation.objects.filter(id=calc_id).exists())

    def test_calculation_status_default(self):
        """Test status default value"""
        calc = SurveyCalculation.objects.create(
            survey_file=self.survey_file,
            calculation_type='Average Angle',
            results={'result': 'test'}
        )
        self.assertEqual(calc.status, 'processing')

    def test_calculation_jsonb_parameters(self):
        """Test JSONField storage for parameters"""
        params = {
            'method': 'minimum_curvature',
            'tolerance': 0.001,
            'max_iterations': 1000,
            'convergence_criteria': {
                'absolute': 0.01,
                'relative': 0.001
            }
        }
        calc = SurveyCalculation.objects.create(
            survey_file=self.survey_file,
            calculation_type='Iterative',
            parameters=params,
            results={'completed': True}
        )
        calc.refresh_from_db()
        self.assertEqual(calc.parameters, params)
        self.assertEqual(calc.parameters['max_iterations'], 1000)

    def test_calculation_jsonb_results(self):
        """Test JSONField storage for results"""
        results = {
            'tvd': 5000.25,
            'md': 5100.50,
            'inclination': 45.2,
            'azimuth': 180.5,
            'stations': [
                {'md': 0, 'inc': 0, 'az': 0},
                {'md': 100, 'inc': 1.5, 'az': 45.2}
            ],
            'summary': {
                'max_dog_leg': 2.5,
                'avg_dog_leg': 1.2
            }
        }
        calc = SurveyCalculation.objects.create(
            survey_file=self.survey_file,
            calculation_type='Full Analysis',
            results=results
        )
        calc.refresh_from_db()
        self.assertEqual(calc.results, results)
        self.assertEqual(calc.results['tvd'], 5000.25)
        self.assertEqual(len(calc.results['stations']), 2)


class ModelRelationshipIntegrationTest(TestCase):
    """Test complex relationships and cascade behaviors"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_complete_data_hierarchy_creation(self):
        """Test creating complete data hierarchy: Well -> Run -> Location/Depth/SurveyFile -> SurveyCalculation"""
        # Create Well
        well = Well.objects.create(well_name='Complex Well', well_type='Oil')

        # Create Run
        run = Run.objects.create(
            run_number='RUN_COMPLEX',
            run_name='Complex Run',
            run_type='MWD',
            well=well,
            user=self.user,
            bhc_enabled=True,
            grid_correction=2.5
        )

        # Create Location
        location = Location.objects.create(
            run=run,
            latitude=30.5,
            longitude=-96.5
        )

        # Create Depth
        depth = Depth.objects.create(
            run=run,
            reference_height=50.0
        )

        # Create SurveyFile
        survey_file = SurveyFile.objects.create(
            run=run,
            file_name='complex.xlsx',
            file_path='/uploads/complex.xlsx',
            file_size=204800,
            survey_type='MWD',
            processing_status='completed'
        )

        # Create SurveyCalculation
        calculation = SurveyCalculation.objects.create(
            survey_file=survey_file,
            calculation_type='Test Calc',
            results={'test': True},
            status='completed'
        )

        # Verify all relationships
        self.assertEqual(well.runs.count(), 1)
        self.assertEqual(run.location, location)
        self.assertEqual(run.depth, depth)
        self.assertEqual(run.survey_files.count(), 1)
        self.assertEqual(survey_file.calculations.count(), 1)

    def test_cascade_delete_from_run(self):
        """Test that deleting Run cascades to Location, Depth, SurveyFile, and SurveyCalculation"""
        # Create hierarchy
        run = Run.objects.create(
            run_number='RUN_CASCADE',
            run_name='Cascade Test',
            run_type='GTL',
            user=self.user
        )
        location = Location.objects.create(run=run, latitude=30.0, longitude=-95.0)
        depth = Depth.objects.create(run=run, reference_height=25.0)
        survey_file = SurveyFile.objects.create(
            run=run,
            file_name='test.xlsx',
            file_path='/test.xlsx',
            file_size=1024,
            survey_type='GTL'
        )
        calculation = SurveyCalculation.objects.create(
            survey_file=survey_file,
            calculation_type='Test',
            results={'test': True}
        )

        # Store IDs
        location_id = location.id
        depth_id = depth.id
        file_id = survey_file.id
        calc_id = calculation.id

        # Delete run
        run.delete()

        # Verify cascade
        self.assertFalse(Location.objects.filter(id=location_id).exists())
        self.assertFalse(Depth.objects.filter(id=depth_id).exists())
        self.assertFalse(SurveyFile.objects.filter(id=file_id).exists())
        self.assertFalse(SurveyCalculation.objects.filter(id=calc_id).exists())

    def test_cascade_delete_from_survey_file(self):
        """Test that deleting SurveyFile cascades to SurveyCalculation"""
        run = Run.objects.create(
            run_number='RUN_FILE_CASCADE',
            run_name='File Cascade Test',
            run_type='Gyro',
            user=self.user
        )
        survey_file = SurveyFile.objects.create(
            run=run,
            file_name='cascade.xlsx',
            file_path='/cascade.xlsx',
            file_size=2048,
            survey_type='Gyro'
        )
        calc1 = SurveyCalculation.objects.create(
            survey_file=survey_file,
            calculation_type='Calc 1',
            results={'test': 1}
        )
        calc2 = SurveyCalculation.objects.create(
            survey_file=survey_file,
            calculation_type='Calc 2',
            results={'test': 2}
        )

        calc1_id = calc1.id
        calc2_id = calc2.id

        # Delete file
        survey_file.delete()

        # Verify both calculations deleted
        self.assertFalse(SurveyCalculation.objects.filter(id=calc1_id).exists())
        self.assertFalse(SurveyCalculation.objects.filter(id=calc2_id).exists())


class SurveyDataModelTest(TestCase):
    """Test cases for SurveyData model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.run = Run.objects.create(
            run_number='RUN001',
            run_name='Test Run',
            run_type='GTL',
            user=self.user
        )
        self.survey_file = SurveyFile.objects.create(
            run=self.run,
            file_name='survey_data.xlsx',
            file_path='/uploads/survey_data.xlsx',
            file_size=102400,
            survey_type='GTL'
        )

    def test_survey_data_creation(self):
        """Test successful survey data creation"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0, 100, 200, 300],
            inc_data=[0, 5, 10, 15],
            azi_data=[0, 45, 90, 135],
            wt_data=[0.1, 0.2, 0.3, 0.4],
            gt_data=[0.2, 0.3, 0.4, 0.5],
            row_count=4,
            validation_status='valid'
        )
        self.assertEqual(survey_data.md_data, [0, 100, 200, 300])
        self.assertEqual(survey_data.inc_data, [0, 5, 10, 15])
        self.assertEqual(survey_data.azi_data, [0, 45, 90, 135])
        self.assertEqual(survey_data.row_count, 4)
        self.assertEqual(survey_data.validation_status, 'valid')
        self.assertIsNotNone(survey_data.id)
        self.assertIsNotNone(survey_data.created_at)
        self.assertIsNotNone(survey_data.updated_at)

    def test_survey_data_gtl_columns(self):
        """Test GTL-specific columns (wt_data, gt_data)"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0, 100],
            inc_data=[0, 5],
            azi_data=[0, 45],
            wt_data=[0.1, 0.2],
            gt_data=[0.2, 0.3],
            row_count=2
        )
        self.assertEqual(survey_data.wt_data, [0.1, 0.2])
        self.assertEqual(survey_data.gt_data, [0.2, 0.3])

    def test_survey_data_optional_gtl_columns(self):
        """Test that GTL columns are optional"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0, 100],
            inc_data=[0, 5],
            azi_data=[0, 45],
            row_count=2
        )
        self.assertIsNone(survey_data.wt_data)
        self.assertIsNone(survey_data.gt_data)

    def test_survey_data_default_validation_status(self):
        """Test validation_status default value"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0],
            inc_data=[0],
            azi_data=[0],
            row_count=1
        )
        self.assertEqual(survey_data.validation_status, 'pending')

    def test_survey_data_validation_errors(self):
        """Test validation_errors JSONField storage"""
        from survey_api.models import SurveyData
        errors = [
            "Missing required column: w(t)",
            "Inclination value 185 exceeds maximum (180)"
        ]
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0, 100],
            inc_data=[0, 185],
            azi_data=[0, 45],
            row_count=2,
            validation_status='invalid',
            validation_errors=errors
        )
        survey_data.refresh_from_db()
        self.assertEqual(survey_data.validation_errors, errors)
        self.assertEqual(len(survey_data.validation_errors), 2)

    def test_survey_data_str(self):
        """Test survey data string representation"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0],
            inc_data=[0],
            azi_data=[0],
            row_count=1,
            validation_status='valid'
        )
        self.assertEqual(
            str(survey_data),
            'SurveyData for survey_data.xlsx (valid)'
        )

    def test_survey_data_survey_file_relationship(self):
        """Test SurveyData-SurveyFile OneToOne relationship"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0],
            inc_data=[0],
            azi_data=[0],
            row_count=1
        )
        self.assertEqual(survey_data.survey_file, self.survey_file)
        self.assertEqual(self.survey_file.survey_data, survey_data)

    def test_survey_data_cascade_on_file_delete(self):
        """Test SurveyData is deleted when SurveyFile is deleted (CASCADE)"""
        from survey_api.models import SurveyData
        survey_data = SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0],
            inc_data=[0],
            azi_data=[0],
            row_count=1
        )
        data_id = survey_data.id
        self.survey_file.delete()
        self.assertFalse(SurveyData.objects.filter(id=data_id).exists())

    def test_survey_data_onetoone_constraint(self):
        """Test OneToOne constraint prevents duplicate survey_data for same file"""
        from survey_api.models import SurveyData
        from django.db import IntegrityError
        SurveyData.objects.create(
            survey_file=self.survey_file,
            md_data=[0],
            inc_data=[0],
            azi_data=[0],
            row_count=1
        )
        with self.assertRaises(IntegrityError):
            SurveyData.objects.create(
                survey_file=self.survey_file,
                md_data=[0],
                inc_data=[0],
                azi_data=[0],
                row_count=1
            )
