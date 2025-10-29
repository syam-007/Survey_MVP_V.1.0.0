"""
Location service for coordinate conversions and calculations.
"""
from decimal import Decimal
from typing import Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


class LocationService:
    """
    Service class for location-related calculations and coordinate conversions.

    This service handles:
    - UTM coordinate conversion from lat/lon
    - Grid correction calculations
    - Grid convergence (g_t) and scale factor (w_t) calculations
    """

    @staticmethod
    def calculate_utm_coordinates(
        latitude: Decimal,
        longitude: Decimal,
        geodetic_system: str,
        map_zone: str
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate UTM coordinates (easting, northing) from latitude/longitude.

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees
            geodetic_system: Geodetic datum system (e.g., WGS84)
            map_zone: UTM zone identifier

        Returns:
            Tuple of (easting, northing) as Decimals

        Note:
            This is a simplified implementation. Full implementation would use
            welleng library or pyproj for accurate coordinate transformations.
        """
        try:
            # Simplified UTM conversion (placeholder for welleng integration)
            # Real implementation would use welleng.survey.transform_coordinates()
            # or pyproj for accurate conversion

            # For now, use simplified zone-based estimation
            # UTM zone = (longitude + 180) / 6 + 1
            zone_number = int((float(longitude) + 180) / 6) + 1

            # Simplified calculation (replace with welleng in production)
            # These are approximate values for demonstration
            central_meridian = (zone_number - 1) * 6 - 180 + 3

            # Simplified easting calculation
            longitude_diff = float(longitude) - central_meridian
            easting_value = 500000 + longitude_diff * 111320 * 0.9996
            # Quantize to 3 decimal places (max_digits=12, decimal_places=3)
            easting = Decimal(str(easting_value)).quantize(Decimal('0.001'))

            # Simplified northing calculation
            northing_value = float(latitude) * 110574 * 0.9996
            if latitude < 0:
                northing_value += 10000000  # Southern hemisphere
            # Quantize to 3 decimal places (max_digits=12, decimal_places=3)
            northing = Decimal(str(abs(northing_value))).quantize(Decimal('0.001'))

            logger.info(
                f"Calculated UTM coordinates: E={easting}, N={northing} "
                f"for lat={latitude}, lon={longitude}"
            )

            return (easting, northing)

        except Exception as e:
            logger.error(f"Error calculating UTM coordinates: {str(e)}")
            raise ValueError(f"Failed to calculate UTM coordinates: {str(e)}")

    @staticmethod
    def calculate_grid_correction(
        central_meridian: Decimal,
        latitude: Decimal,
        longitude: Decimal
    ) -> Decimal:
        """
        Calculate grid correction based on central meridian and coordinates.

        Formula: grid_correction = (central_meridian - longitude) × sin(latitude)

        Args:
            central_meridian: Central meridian for the zone
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees

        Returns:
            Grid correction as Decimal (rounded to 7 decimal places)
        """
        try:
            import math

            central_meridian_val = float(central_meridian)
            latitude_val = float(latitude)
            longitude_val = float(longitude)

            # grid_correction = (central_meridian - longitude) × sin(latitude)
            lat_rad = math.radians(latitude_val)
            grid_correction_value = (central_meridian_val - longitude_val) * math.sin(lat_rad)

            # Round to 6 decimal places to match model field precision
            grid_correction = Decimal(str(round(grid_correction_value, 6)))

            logger.info(
                f"Calculated grid correction: {grid_correction} "
                f"for CM={central_meridian}, lat={latitude}, lon={longitude}"
            )

            return grid_correction

        except Exception as e:
            logger.error(f"Error calculating grid correction: {str(e)}")
            raise ValueError(f"Failed to calculate grid correction: {str(e)}")

    @staticmethod
    def calculate_g_t_w_t(
        latitude: Decimal,
        longitude: Decimal,
        easting: Decimal,
        northing: Decimal,
        ground_level_elevation: Decimal = None
    ) -> Dict[str, Decimal]:
        """
        Calculate grid convergence (g_t) and scale factor (w_t) values.

        W_t Formula: 15.041 × cos(latitude_rad)
        G_t Formula: [9.780327 × (1 + (0.0053024 × sin²(lat)) - (0.0000058 × sin²(2×lat)))]
                     - ((3.086 × 10⁻⁶) × elevation) × 102

        Args:
            latitude: Latitude in decimal degrees
            longitude: Longitude in decimal degrees
            easting: UTM easting coordinate
            northing: UTM northing coordinate
            ground_level_elevation: Ground level elevation (optional)

        Returns:
            Dictionary with g_t, min_g_t, max_g_t, w_t, min_w_t, max_w_t values
        """
        try:
            import math

            latitude_val = float(latitude)
            lat_rad = math.radians(latitude_val)

            # Calculate W_t: 15.041 × cos(latitude_rad)
            # Round to 1 decimal place for storage
            w_t_value = 15.041 * math.cos(lat_rad)
            w_t = Decimal(str(round(w_t_value, 1)))

            # min_w_t = w_t - 3
            min_w_t = Decimal(str(round(w_t_value - 3, 1)))

            # max_w_t = w_t + 3
            max_w_t = Decimal(str(round(w_t_value + 3, 1)))

            # Calculate G_t if ground_level_elevation is provided
            if ground_level_elevation is not None:
                two_lat_rad = math.radians(2 * latitude_val)
                elevation = float(ground_level_elevation)

                g_t_value = (
                    (9.780327 * (1 + (0.0053024 * (math.sin(lat_rad) ** 2)) -
                    (0.0000058 * (math.sin(two_lat_rad) ** 2)))) -
                    ((3.086 * 10 ** -6) * elevation)
                ) * 102

                # Round to 1 decimal place for storage
                g_t = Decimal(str(round(g_t_value, 1)))
                min_g_t = Decimal(str(round(g_t_value - 10, 1)))
                max_g_t = Decimal(str(round(g_t_value + 10, 1)))
            else:
                # If no elevation provided, use simplified calculation
                g_t_value = 9.780327 * (1 + (0.0053024 * (math.sin(lat_rad) ** 2)) -
                                       (0.0000058 * (math.sin(math.radians(2 * latitude_val)) ** 2))) * 102
                # Round to 1 decimal place for storage
                g_t = Decimal(str(round(g_t_value, 1)))
                min_g_t = Decimal(str(round(g_t_value - 10, 1)))
                max_g_t = Decimal(str(round(g_t_value + 10, 1)))

            result = {
                'g_t': g_t,
                'min_g_t': min_g_t,
                'max_g_t': max_g_t,
                'w_t': w_t,
                'min_w_t': min_w_t,
                'max_w_t': max_w_t
            }

            logger.info(f"Calculated g_t/w_t values: {result}")

            return result

        except Exception as e:
            logger.error(f"Error calculating g_t/w_t: {str(e)}")
            raise ValueError(f"Failed to calculate g_t/w_t: {str(e)}")

    @classmethod
    def create_location_with_calculations(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create location data with automatic calculations.

        Args:
            data: Dictionary with location input data

        Returns:
            Dictionary with all calculated fields added
        """
        try:
            logger.info(f"create_location_with_calculations called with data keys: {data.keys()}")

            # Extract required fields
            latitude = data.get('latitude')
            longitude = data.get('longitude')

            logger.info(f"Initial latitude: {latitude}, longitude: {longitude}")

            # If latitude/longitude not provided, calculate from DMS
            # Formula: degrees + minutes/60 + seconds/3600
            if latitude is None and data.get('latitude_degrees') is not None:
                lat_deg = data.get('latitude_degrees')
                lat_min = data.get('latitude_minutes', 0) if data.get('latitude_minutes') is not None else 0
                lat_sec = data.get('latitude_seconds', 0) if data.get('latitude_seconds') is not None else 0
                lat_sec = float(lat_sec)
                # Calculate: degrees + minutes/60 + seconds/3600
                latitude_value = lat_deg + lat_min / 60 + lat_sec / 3600
                # Round to 8 decimal places
                latitude = Decimal(str(round(latitude_value, 8)))
                data['latitude'] = latitude
                logger.info(f"Converted DMS to decimal latitude: {lat_deg}° {lat_min}' {lat_sec}\" = {latitude}")

            if longitude is None and data.get('longitude_degrees') is not None:
                lon_deg = data.get('longitude_degrees')
                lon_min = data.get('longitude_minutes', 0) if data.get('longitude_minutes') is not None else 0
                lon_sec = data.get('longitude_seconds', 0) if data.get('longitude_seconds') is not None else 0
                lon_sec = float(lon_sec)
                # Calculate: degrees + minutes/60 + seconds/3600
                longitude_value = lon_deg + lon_min / 60 + lon_sec / 3600
                # Round to 8 decimal places
                longitude = Decimal(str(round(longitude_value, 8)))
                data['longitude'] = longitude
                logger.info(f"Converted DMS to decimal longitude: {lon_deg}° {lon_min}' {lon_sec}\" = {longitude}")

            # Validate that we have latitude and longitude
            if latitude is None:
                raise ValueError("Latitude is required (provide either 'latitude' or 'latitude_degrees')")
            if longitude is None:
                raise ValueError("Longitude is required (provide either 'longitude' or 'longitude_degrees')")

            geodetic_system = data.get('geodetic_system')
            map_zone = data.get('map_zone')
            central_meridian = data.get('central_meridian', Decimal('0.0'))  # Default to 0.0

            # Use user-provided easting and northing (required fields)
            easting = data.get('easting')
            northing = data.get('northing')

            logger.info(f"Using user-provided UTM coordinates: E={easting}, N={northing}")

            # Calculate grid correction
            grid_correction = cls.calculate_grid_correction(
                central_meridian, latitude, longitude
            )

            # Calculate g_t and w_t values
            g_t_w_t = cls.calculate_g_t_w_t(
                latitude, longitude, easting, northing
            )

            # Add calculated values to data
            data['easting'] = easting
            data['northing'] = northing
            data['grid_correction'] = grid_correction
            data['g_t'] = g_t_w_t['g_t']
            data['min_g_t'] = g_t_w_t['min_g_t']
            data['max_g_t'] = g_t_w_t['max_g_t']
            data['w_t'] = g_t_w_t['w_t']
            data['min_w_t'] = g_t_w_t['min_w_t']
            data['max_w_t'] = g_t_w_t['max_w_t']

            logger.info("Successfully calculated all location fields")

            return data

        except Exception as e:
            logger.error(f"Error in create_location_with_calculations: {str(e)}")
            raise

    @classmethod
    def update_location_with_calculations(
        cls,
        location_id: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update location data with re-calculations if coordinates changed.

        Args:
            location_id: UUID of the location to update
            data: Dictionary with update data

        Returns:
            Dictionary with recalculated fields if applicable
        """
        try:
            # Check if coordinates changed (require recalculation)
            needs_recalc = any(
                field in data
                for field in ['latitude', 'longitude', 'central_meridian',
                              'geodetic_system', 'map_zone']
            )

            if needs_recalc:
                logger.info(f"Recalculating location {location_id} due to coordinate changes")
                # Perform same calculations as create
                return cls.create_location_with_calculations(data)

            return data

        except Exception as e:
            logger.error(f"Error in update_location_with_calculations: {str(e)}")
            raise
