"""
Tests for TieOn API endpoints.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from survey_api.models import Well, Run, TieOn
from decimal import Decimal

User = get_user_model()


class TieOnAPITest(TestCase):
    """Test suite for TieOn API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )

        # Authenticate client
        self.client.force_authenticate(user=self.user)

        # Create test well
        self.well = Well.objects.create(
            well_name='TEST-WELL-001',
            well_type='Oil'
        )

        # Create test runs
        self.run1 = Run.objects.create(
            run_number='RUN-001',
            run_name='Test Run 1',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

        self.run2 = Run.objects.create(
            run_number='RUN-002',
            run_name='Test Run 2',
            run_type='MWD',
            well=self.well,
            user=self.user
        )

        # Create test tieon
        self.tieon = TieOn.objects.create(
            run=self.run1,
            md=Decimal('1000.500'),
            inc=Decimal('45.25'),
            azi=Decimal('180.75'),
            tvd=Decimal('950.300'),
            latitude=Decimal('29.760427'),
            departure=Decimal('-95.369803'),
            well_type='Deviated',
            hole_section='Production Casing',
            casing_selected=True,
            drillpipe_selected=False,
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

    def test_create_tieon(self):
        """Test POST /api/v1/tieons/ - create tieon."""
        data = {
            'run': str(self.run2.id),
            'md': '2000.500',
            'inc': '30.00',
            'azi': '90.00',
            'tvd': '1950.000',
            'latitude': '30.000000',
            'departure': '-96.000000',
            'well_type': 'Horizontal',
            'hole_section': 'Open Hole',
            'casing_selected': False,
            'drillpipe_selected': True,
            'survey_tool_type': 'LWD',
            'survey_interval_from': '2000.000',
            'survey_interval_to': '6000.000'
        }

        response = self.client.post('/api/v1/tieons/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['md'], '2000.500')
        self.assertEqual(response.data['inc'], '30.00')
        self.assertEqual(response.data['azi'], '90.00')

        # Verify the tieon was created in the database
        tieon = TieOn.objects.get(run=self.run2)
        self.assertEqual(tieon.md, Decimal('2000.500'))
        self.assertEqual(tieon.survey_interval_length, Decimal('4000.000'))

    def test_list_tieons(self):
        """Test GET /api/v1/tieons/ - list tieons."""
        response = self.client.get('/api/v1/tieons/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check paginated response structure
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertGreaterEqual(len(response.data['results']), 1)

    def test_filter_tieons_by_run(self):
        """Test GET /api/v1/tieons/?run={run_id} - filter by run."""
        # Create another tieon for run2
        TieOn.objects.create(
            run=self.run2,
            md=Decimal('3000.000'),
            inc=Decimal('60.00'),
            azi=Decimal('270.00'),
            tvd=Decimal('2500.000'),
            latitude=Decimal('31.000000'),
            departure=Decimal('-97.000000'),
            well_type='Deviated',
            hole_section='Liner',
            survey_tool_type='Wireline Gyro',
            survey_interval_from=Decimal('3000.000'),
            survey_interval_to=Decimal('7000.000')
        )

        response = self.client.get(f'/api/v1/tieons/?run={str(self.run1.id)}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(str(response.data['results'][0]['run']), str(self.run1.id))

    def test_retrieve_tieon(self):
        """Test GET /api/v1/tieons/{id}/ - retrieve tieon."""
        response = self.client.get(f'/api/v1/tieons/{str(self.tieon.id)}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.tieon.id))
        self.assertEqual(response.data['md'], '1000.500')
        self.assertEqual(response.data['inc'], '45.25')

    def test_update_tieon(self):
        """Test PUT /api/v1/tieons/{id}/ - update tieon."""
        data = {
            'md': '1100.000',
            'inc': '50.00',
            'azi': '200.00',
            'tvd': '1000.000',
            'latitude': '29.800000',
            'departure': '-95.400000',
            'well_type': 'Deviated',
            'hole_section': 'Intermediate Casing',
            'casing_selected': False,
            'drillpipe_selected': True,
            'survey_tool_type': 'LWD',
            'survey_interval_from': '1100.000',
            'survey_interval_to': '5500.000'
        }

        response = self.client.put(
            f'/api/v1/tieons/{str(self.tieon.id)}/',
            data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['md'], '1100.000')
        self.assertEqual(response.data['inc'], '50.00')
        self.assertEqual(response.data['survey_tool_type'], 'LWD')

    def test_partial_update_tieon(self):
        """Test PATCH /api/v1/tieons/{id}/ - partial update."""
        data = {
            'casing_selected': False,
            'drillpipe_selected': True
        }

        response = self.client.patch(
            f'/api/v1/tieons/{str(self.tieon.id)}/',
            data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['casing_selected'])
        self.assertTrue(response.data['drillpipe_selected'])
        # Other fields remain unchanged
        self.assertEqual(response.data['md'], '1000.500')

    def test_delete_tieon(self):
        """Test DELETE /api/v1/tieons/{id}/ - delete tieon."""
        response = self.client.delete(f'/api/v1/tieons/{str(self.tieon.id)}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify deletion
        self.assertFalse(TieOn.objects.filter(id=self.tieon.id).exists())

    def test_authentication_required(self):
        """Test authentication required for all endpoints."""
        # Create unauthenticated client
        unauth_client = APIClient()

        # Test LIST
        response = unauth_client.get('/api/v1/tieons/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test RETRIEVE
        response = unauth_client.get(f'/api/v1/tieons/{str(self.tieon.id)}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test CREATE
        response = unauth_client.post('/api/v1/tieons/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test UPDATE
        response = unauth_client.put(f'/api/v1/tieons/{str(self.tieon.id)}/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test DELETE
        response = unauth_client.delete(f'/api/v1/tieons/{str(self.tieon.id)}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_nonexistent_tieon_returns_404(self):
        """Test 404 for non-existent tieon."""
        from uuid import uuid4
        fake_id = str(uuid4())

        response = self.client.get(f'/api/v1/tieons/{fake_id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_validation_errors_return_400(self):
        """Test validation errors return 400 with error details."""
        data = {
            'run': str(self.run2.id),
            'md': '1000.000',
            'inc': '200.00',  # Invalid: > 180
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        response = self.client.post('/api/v1/tieons/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check error details structure
        if 'details' in response.data:
            self.assertIn('inc', response.data['details'])
        else:
            self.assertIn('inc', response.data)

    def test_numeric_range_violations(self):
        """Test numeric range violations (Inc, Azi)."""
        # Test inclination < 0
        data = {
            'run': str(self.run2.id),
            'md': '1000.000',
            'inc': '-1.00',  # Invalid
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1000.000',
            'survey_interval_to': '5000.000'
        }

        response = self.client.post('/api/v1/tieons/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check error details structure
        if 'details' in response.data:
            self.assertIn('inc', response.data['details'])
        else:
            self.assertIn('inc', response.data)

        # Test azimuth >= 360
        data['inc'] = '45.00'
        data['azi'] = '361.00'  # Invalid

        response = self.client.post('/api/v1/tieons/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check error details structure
        if 'details' in response.data:
            self.assertIn('azi', response.data['details'])
        else:
            self.assertIn('azi', response.data)

    def test_survey_interval_validation(self):
        """Test survey interval validation."""
        data = {
            'run': str(self.run2.id),
            'md': '1000.000',
            'inc': '0.00',
            'azi': '0.00',
            'tvd': '1000.000',
            'latitude': '0.000000',
            'departure': '0.000000',
            'well_type': 'Vertical',
            'hole_section': 'Surface Casing',
            'survey_tool_type': 'MWD',
            'survey_interval_from': '5000.000',  # Greater than 'to'
            'survey_interval_to': '1000.000'
        }

        response = self.client.post('/api/v1/tieons/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check error details structure
        if 'details' in response.data:
            self.assertIn('survey_interval_from', response.data['details'])
        else:
            self.assertIn('survey_interval_from', response.data)


class TieOnIntegrationTest(TestCase):
    """Integration tests for TieOn functionality."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()

        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )

        # Authenticate client
        self.client.force_authenticate(user=self.user)

        # Create test well
        self.well = Well.objects.create(
            well_name='TEST-WELL-001',
            well_type='Oil'
        )

    def test_complete_flow_create_run_then_tieon(self):
        """Test complete flow: Create Run → Create TieOn."""
        # Step 1: Create a run
        run = Run.objects.create(
            run_number='INT-RUN-001',
            run_name='Integration Test Run',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

        # Step 2: Create a tieon for that run
        tieon_data = {
            'run': str(run.id),
            'md': '1500.000',
            'inc': '25.00',
            'azi': '120.00',
            'tvd': '1450.000',
            'latitude': '28.500000',
            'departure': '-94.500000',
            'well_type': 'Deviated',
            'hole_section': 'Intermediate Casing',
            'casing_selected': True,
            'drillpipe_selected': False,
            'survey_tool_type': 'MWD',
            'survey_interval_from': '1500.000',
            'survey_interval_to': '5500.000'
        }

        response = self.client.post('/api/v1/tieons/', tieon_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify tieon was created and linked to run
        tieon = TieOn.objects.get(run=run)
        self.assertEqual(tieon.md, Decimal('1500.000'))
        self.assertEqual(tieon.survey_interval_length, Decimal('4000.000'))

    def test_cascade_delete_run_deletes_tieon(self):
        """Test deleting run deletes associated tieon (cascade)."""
        # Create run and tieon
        run = Run.objects.create(
            run_number='CASCADE-RUN-001',
            run_name='Cascade Test Run',
            run_type='MWD',
            well=self.well,
            user=self.user
        )

        tieon = TieOn.objects.create(
            run=run,
            md=Decimal('2000.000'),
            inc=Decimal('30.00'),
            azi=Decimal('90.00'),
            tvd=Decimal('1900.000'),
            latitude=Decimal('29.000000'),
            departure=Decimal('-95.000000'),
            well_type='Horizontal',
            hole_section='Production Casing',
            survey_tool_type='LWD',
            survey_interval_from=Decimal('2000.000'),
            survey_interval_to=Decimal('6000.000')
        )

        tieon_id = tieon.id

        # Delete the run
        run.delete()

        # Verify tieon was also deleted
        self.assertFalse(TieOn.objects.filter(id=tieon_id).exists())

    def test_duplicate_tieon_per_run_fails(self):
        """Test duplicate tieon per run fails (OneToOne)."""
        # Create run and tieon
        run = Run.objects.create(
            run_number='DUP-RUN-001',
            run_name='Duplicate Test Run',
            run_type='Gyro',
            well=self.well,
            user=self.user
        )

        TieOn.objects.create(
            run=run,
            md=Decimal('1000.000'),
            inc=Decimal('0.00'),
            azi=Decimal('0.00'),
            tvd=Decimal('1000.000'),
            latitude=Decimal('0.000000'),
            departure=Decimal('0.000000'),
            well_type='Vertical',
            hole_section='Surface Casing',
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        # Try to create a second tieon for the same run via API
        tieon_data = {
            'run': str(run.id),
            'md': '2000.000',
            'inc': '10.00',
            'azi': '45.00',
            'tvd': '1950.000',
            'latitude': '1.000000',
            'departure': '1.000000',
            'well_type': 'Deviated',
            'hole_section': 'Production Casing',
            'survey_tool_type': 'LWD',
            'survey_interval_from': '2000.000',
            'survey_interval_to': '6000.000'
        }

        response = self.client.post('/api/v1/tieons/', tieon_data, format='json')

        # Should fail with 400 due to unique constraint
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_casing_drillpipe_selections(self):
        """Test updating casing/drillpipe selections."""
        # Create run and tieon
        run = Run.objects.create(
            run_number='UPDATE-RUN-001',
            run_name='Update Test Run',
            run_type='GTL',
            well=self.well,
            user=self.user
        )

        tieon = TieOn.objects.create(
            run=run,
            md=Decimal('1000.000'),
            inc=Decimal('20.00'),
            azi=Decimal('60.00'),
            tvd=Decimal('980.000'),
            latitude=Decimal('28.000000'),
            departure=Decimal('-94.000000'),
            well_type='Deviated',
            hole_section='Surface Casing',
            casing_selected=True,
            drillpipe_selected=False,
            survey_tool_type='MWD',
            survey_interval_from=Decimal('1000.000'),
            survey_interval_to=Decimal('5000.000')
        )

        # Update selections via API
        update_data = {
            'casing_selected': False,
            'drillpipe_selected': True
        }

        response = self.client.patch(
            f'/api/v1/tieons/{str(tieon.id)}/',
            update_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify database was updated
        tieon.refresh_from_db()
        self.assertFalse(tieon.casing_selected)
        self.assertTrue(tieon.drillpipe_selected)

    def test_survey_interval_length_auto_calculation(self):
        """Test survey interval length auto-calculation."""
        # Create run
        run = Run.objects.create(
            run_number='CALC-RUN-001',
            run_name='Calculation Test Run',
            run_type='MWD',
            well=self.well,
            user=self.user
        )

        # Create tieon via API
        tieon_data = {
            'run': str(run.id),
            'md': '3000.000',
            'inc': '60.00',
            'azi': '270.00',
            'tvd': '2500.000',
            'latitude': '30.500000',
            'departure': '-96.500000',
            'well_type': 'Horizontal',
            'hole_section': 'Open Hole',
            'survey_tool_type': 'Wireline Gyro',
            'survey_interval_from': '3000.000',
            'survey_interval_to': '8500.000'  # Length should be 5500.000
        }

        response = self.client.post('/api/v1/tieons/', tieon_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify auto-calculation
        tieon = TieOn.objects.get(run=run)
        self.assertEqual(tieon.survey_interval_length, Decimal('5500.000'))

        # Update interval and verify recalculation
        update_data = {
            'survey_interval_from': '3500.000',
            'survey_interval_to': '9000.000'  # New length should be 5500.000
        }

        response = self.client.patch(
            f'/api/v1/tieons/{str(tieon.id)}/',
            update_data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify recalculation
        tieon.refresh_from_db()
        self.assertEqual(tieon.survey_interval_length, Decimal('5500.000'))
