"""
Tests for Location Service layer.
"""
from django.test import TestCase
from decimal import Decimal
from survey_api.services.location_service import LocationService


class LocationServiceTest(TestCase):
    """Test cases for LocationService"""

    def test_calculate_utm_coordinates(self):
        """Test UTM coordinate calculation from lat/lon"""
        latitude = Decimal('29.7604')
        longitude = Decimal('-95.3698')
        geodetic_system = 'WGS84'
        map_zone = '15N'

        easting, northing = LocationService.calculate_utm_coordinates(
            latitude, longitude, geodetic_system, map_zone
        )

        # Verify types
        self.assertIsInstance(easting, Decimal)
        self.assertIsInstance(northing, Decimal)

        # Verify reasonable UTM values (simplified calculation)
        # Easting should be around 500000 +/- offset
        self.assertGreater(easting, 0)
        self.assertLess(easting, 1000000)

        # Northing should be positive for northern hemisphere
        self.assertGreater(northing, 0)

    def test_calculate_utm_coordinates_southern_hemisphere(self):
        """Test UTM coordinate calculation for southern hemisphere"""
        latitude = Decimal('-33.8688')  # Sydney
        longitude = Decimal('151.2093')
        geodetic_system = 'WGS84'
        map_zone = '56H'

        easting, northing = LocationService.calculate_utm_coordinates(
            latitude, longitude, geodetic_system, map_zone
        )

        # Southern hemisphere northing should be adjusted
        self.assertGreater(northing, 0)
        self.assertIsInstance(easting, Decimal)
        self.assertIsInstance(northing, Decimal)

    def test_calculate_utm_coordinates_edge_cases(self):
        """Test UTM coordinate calculation at edges"""
        # Equator
        easting1, northing1 = LocationService.calculate_utm_coordinates(
            Decimal('0.0'), Decimal('0.0'), 'WGS84', '31N'
        )
        self.assertIsInstance(easting1, Decimal)
        self.assertIsInstance(northing1, Decimal)

        # Prime meridian
        easting2, northing2 = LocationService.calculate_utm_coordinates(
            Decimal('51.5074'), Decimal('0.0'), 'WGS84', '31N'
        )
        self.assertGreater(easting2, 0)
        self.assertGreater(northing2, 0)

    def test_calculate_utm_coordinates_error_handling(self):
        """Test error handling for invalid inputs"""
        with self.assertRaises(ValueError):
            LocationService.calculate_utm_coordinates(
                None, Decimal('-95.0'), 'WGS84', '15N'
            )

    def test_calculate_grid_correction(self):
        """Test grid correction calculation"""
        central_meridian = Decimal('-93.0')
        latitude = Decimal('29.7604')
        longitude = Decimal('-95.3698')

        grid_correction = LocationService.calculate_grid_correction(
            central_meridian, latitude, longitude
        )

        # Verify type
        self.assertIsInstance(grid_correction, Decimal)

        # Grid correction should be reasonable (typically small values)
        self.assertLess(abs(grid_correction), 10)

    def test_calculate_grid_correction_zero(self):
        """Test grid correction when longitude equals central meridian"""
        central_meridian = Decimal('-95.0')
        latitude = Decimal('29.0')
        longitude = Decimal('-95.0')

        grid_correction = LocationService.calculate_grid_correction(
            central_meridian, latitude, longitude
        )

        # Should be zero or very close to zero
        self.assertLess(abs(grid_correction), Decimal('0.01'))

    def test_calculate_grid_correction_positive_negative(self):
        """Test grid correction sign changes"""
        central_meridian = Decimal('-93.0')
        latitude = Decimal('30.0')

        # East of central meridian
        grid_correction_east = LocationService.calculate_grid_correction(
            central_meridian, latitude, Decimal('-90.0')
        )

        # West of central meridian
        grid_correction_west = LocationService.calculate_grid_correction(
            central_meridian, latitude, Decimal('-96.0')
        )

        # Signs should be different
        self.assertNotEqual(
            grid_correction_east > 0,
            grid_correction_west > 0
        )

    def test_calculate_g_t_w_t(self):
        """Test g_t and w_t calculation"""
        latitude = Decimal('29.7604')
        longitude = Decimal('-95.3698')
        easting = Decimal('500000.0')
        northing = Decimal('3200000.0')

        result = LocationService.calculate_g_t_w_t(
            latitude, longitude, easting, northing
        )

        # Verify all required keys present
        self.assertIn('g_t', result)
        self.assertIn('max_g_t', result)
        self.assertIn('w_t', result)
        self.assertIn('max_w_t', result)

        # Verify types
        self.assertIsInstance(result['g_t'], Decimal)
        self.assertIsInstance(result['max_g_t'], Decimal)
        self.assertIsInstance(result['w_t'], Decimal)
        self.assertIsInstance(result['max_w_t'], Decimal)

        # Verify reasonable values
        # g_t should be small
        self.assertLess(result['g_t'], Decimal('1.0'))
        self.assertGreater(result['g_t'], Decimal('0.0'))

        # max_g_t should be greater than g_t
        self.assertGreater(result['max_g_t'], result['g_t'])

        # w_t should be close to 1.0 (UTM scale factor)
        self.assertGreater(result['w_t'], Decimal('0.9'))
        self.assertLess(result['w_t'], Decimal('1.1'))

        # max_w_t should be greater than w_t
        self.assertGreater(result['max_w_t'], result['w_t'])

    def test_calculate_g_t_w_t_equator(self):
        """Test g_t/w_t at equator (latitude = 0)"""
        result = LocationService.calculate_g_t_w_t(
            Decimal('0.0'), Decimal('0.0'),
            Decimal('500000.0'), Decimal('0.0')
        )

        # g_t should be very small at equator
        self.assertLess(result['g_t'], Decimal('0.001'))

    def test_calculate_g_t_w_t_high_latitude(self):
        """Test g_t/w_t at high latitude"""
        result = LocationService.calculate_g_t_w_t(
            Decimal('60.0'), Decimal('0.0'),
            Decimal('500000.0'), Decimal('6000000.0')
        )

        # g_t should be larger at higher latitudes
        self.assertGreater(result['g_t'], Decimal('0.0'))

    def test_create_location_with_calculations(self):
        """Test creating location with all calculated fields"""
        data = {
            'latitude': Decimal('29.7604'),
            'longitude': Decimal('-95.3698'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        result = LocationService.create_location_with_calculations(data)

        # Verify input fields preserved
        self.assertEqual(result['latitude'], Decimal('29.7604'))
        self.assertEqual(result['longitude'], Decimal('-95.3698'))
        self.assertEqual(result['geodetic_system'], 'WGS84')
        self.assertEqual(result['map_zone'], '15N')
        self.assertEqual(result['central_meridian'], Decimal('-93.0'))

        # Verify calculated fields added
        self.assertIn('easting', result)
        self.assertIn('northing', result)
        self.assertIn('grid_correction', result)
        self.assertIn('g_t', result)
        self.assertIn('max_g_t', result)
        self.assertIn('w_t', result)
        self.assertIn('max_w_t', result)

        # Verify calculated field types
        self.assertIsInstance(result['easting'], Decimal)
        self.assertIsInstance(result['northing'], Decimal)
        self.assertIsInstance(result['grid_correction'], Decimal)
        self.assertIsInstance(result['g_t'], Decimal)
        self.assertIsInstance(result['max_g_t'], Decimal)
        self.assertIsInstance(result['w_t'], Decimal)
        self.assertIsInstance(result['max_w_t'], Decimal)

    def test_create_location_with_calculations_minimal(self):
        """Test creating location with minimal required fields"""
        data = {
            'latitude': Decimal('45.0'),
            'longitude': Decimal('-122.0'),
            'geodetic_system': 'WGS84',
            'map_zone': '10N',
            'central_meridian': Decimal('-123.0')
        }

        result = LocationService.create_location_with_calculations(data)

        # All calculated fields should be present
        self.assertIn('easting', result)
        self.assertIn('northing', result)
        self.assertIn('grid_correction', result)
        self.assertIn('g_t', result)
        self.assertIn('max_g_t', result)
        self.assertIn('w_t', result)
        self.assertIn('max_w_t', result)

    def test_create_location_with_calculations_error_handling(self):
        """Test error handling for missing required fields"""
        # Missing latitude
        with self.assertRaises(Exception):
            LocationService.create_location_with_calculations({
                'longitude': Decimal('-95.0')
            })

        # Missing longitude
        with self.assertRaises(Exception):
            LocationService.create_location_with_calculations({
                'latitude': Decimal('29.0')
            })

    def test_update_location_with_calculations_recalc_needed(self):
        """Test update triggers recalculation when coordinates change"""
        location_id = 'test-uuid'
        data = {
            'latitude': Decimal('30.0'),
            'longitude': Decimal('-96.0'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        result = LocationService.update_location_with_calculations(
            location_id, data
        )

        # Should have all calculated fields
        self.assertIn('easting', result)
        self.assertIn('northing', result)
        self.assertIn('grid_correction', result)

    def test_update_location_with_calculations_no_recalc(self):
        """Test update without coordinate changes doesn't recalculate"""
        location_id = 'test-uuid'
        data = {
            'north_reference': 'Grid North'
        }

        result = LocationService.update_location_with_calculations(
            location_id, data
        )

        # Should return data unchanged (no calculated fields)
        self.assertEqual(result, data)

    def test_update_location_with_calculations_partial_coord_change(self):
        """Test update with only latitude change triggers recalculation"""
        location_id = 'test-uuid'
        data = {
            'latitude': Decimal('31.0'),
            'longitude': Decimal('-95.0'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        result = LocationService.update_location_with_calculations(
            location_id, data
        )

        # Should have recalculated
        self.assertIn('easting', result)
        self.assertIn('northing', result)

    def test_coordinate_calculation_consistency(self):
        """Test that same inputs produce same outputs"""
        data1 = {
            'latitude': Decimal('29.5'),
            'longitude': Decimal('-95.5'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        data2 = {
            'latitude': Decimal('29.5'),
            'longitude': Decimal('-95.5'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        result1 = LocationService.create_location_with_calculations(data1)
        result2 = LocationService.create_location_with_calculations(data2)

        # Results should be identical
        self.assertEqual(result1['easting'], result2['easting'])
        self.assertEqual(result1['northing'], result2['northing'])
        self.assertEqual(result1['grid_correction'], result2['grid_correction'])
        self.assertEqual(result1['g_t'], result2['g_t'])
        self.assertEqual(result1['max_g_t'], result2['max_g_t'])
        self.assertEqual(result1['w_t'], result2['w_t'])
        self.assertEqual(result1['max_w_t'], result2['max_w_t'])

    def test_decimal_precision_maintained(self):
        """Test that Decimal precision is maintained throughout calculations"""
        data = {
            'latitude': Decimal('29.12345678'),
            'longitude': Decimal('-95.87654321'),
            'geodetic_system': 'WGS84',
            'map_zone': '15N',
            'central_meridian': Decimal('-93.0')
        }

        result = LocationService.create_location_with_calculations(data)

        # Original precision should be maintained
        self.assertEqual(result['latitude'], Decimal('29.12345678'))
        self.assertEqual(result['longitude'], Decimal('-95.87654321'))

        # Calculated values should be Decimal type
        self.assertIsInstance(result['easting'], Decimal)
        self.assertIsInstance(result['northing'], Decimal)
