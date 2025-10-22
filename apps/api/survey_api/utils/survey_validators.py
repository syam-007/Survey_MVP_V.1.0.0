"""
Survey file validation utilities.
"""
from typing import Tuple, List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class SurveyFileValidator:
    """
    Validator for survey file data.
    Validates column presence, data types, ranges, and sequences.
    """

    # Required columns by survey type
    REQUIRED_COLUMNS = {
        'Type 1 - GTL': ['MD', 'Inc', 'Azi', 'w(t)', 'g(t)'],
        'Type 2 - Gyro': ['MD', 'Inc', 'Azi'],
        'Type 3 - MWD': ['MD', 'Inc', 'Azi'],
        'Type 4 - Unknown': ['MD', 'Inc', 'Azi'],
    }

    @classmethod
    def validate_file(
        cls,
        parsed_data: Dict[str, Any],
        survey_type: str
    ) -> Tuple[bool, List[str]]:
        """
        Validate parsed survey file data.

        Args:
            parsed_data: Dictionary containing parsed arrays (md_data, inc_data, etc.)
            survey_type: Survey type string

        Returns:
            Tuple of (is_valid, error_messages)
                - is_valid: True if all validations pass
                - error_messages: List of validation error strings
        """
        errors = []

        # Get required columns for this survey type
        required_cols = cls.REQUIRED_COLUMNS.get(survey_type, [])

        # Validate required columns present
        errors.extend(cls._validate_required_columns(parsed_data, required_cols))

        # Validate no missing values in critical columns
        errors.extend(cls._validate_no_missing_values(parsed_data))

        # Validate data types (numeric)
        errors.extend(cls._validate_numeric_data(parsed_data))

        # Validate ranges
        errors.extend(cls._validate_ranges(parsed_data))

        # Validate MD sequence (strictly increasing)
        errors.extend(cls._validate_md_sequence(parsed_data))

        is_valid = len(errors) == 0

        if is_valid:
            logger.info(f"Validation passed for {survey_type}")
        else:
            logger.warning(f"Validation failed with {len(errors)} errors")

        return is_valid, errors

    @staticmethod
    def _validate_required_columns(
        parsed_data: Dict[str, Any],
        required_cols: List[str]
    ) -> List[str]:
        """Validate that all required columns are present and not None."""
        errors = []

        # Map column names to data keys
        column_map = {
            'MD': 'md_data',
            'Inc': 'inc_data',
            'Azi': 'azi_data',
            'w(t)': 'wt_data',
            'g(t)': 'gt_data',
        }

        for col in required_cols:
            data_key = column_map.get(col)
            if data_key and (parsed_data.get(data_key) is None or not parsed_data.get(data_key)):
                errors.append(f"Missing required column: {col}")

        return errors

    @staticmethod
    def _validate_no_missing_values(parsed_data: Dict[str, Any]) -> List[str]:
        """Validate no null/empty values in MD, Inc, Azi."""
        errors = []

        critical_columns = {
            'MD': parsed_data.get('md_data', []),
            'Inc': parsed_data.get('inc_data', []),
            'Azi': parsed_data.get('azi_data', []),
        }

        for col_name, data in critical_columns.items():
            if data is None:
                continue

            for idx, value in enumerate(data):
                if value is None or (isinstance(value, float) and pd.isna(value)):
                    errors.append(
                        f"Missing value in {col_name} at row {idx + 1}"
                    )

        return errors

    @staticmethod
    def _validate_numeric_data(parsed_data: Dict[str, Any]) -> List[str]:
        """Validate that MD, Inc, Azi contain numeric values."""
        errors = []

        numeric_columns = {
            'MD': parsed_data.get('md_data', []),
            'Inc': parsed_data.get('inc_data', []),
            'Azi': parsed_data.get('azi_data', []),
        }

        for col_name, data in numeric_columns.items():
            if data is None:
                continue

            for idx, value in enumerate(data):
                if value is not None:
                    try:
                        float(value)
                    except (ValueError, TypeError):
                        errors.append(
                            f"Non-numeric value '{value}' in {col_name} at row {idx + 1}"
                        )

        return errors

    @staticmethod
    def _validate_ranges(parsed_data: Dict[str, Any]) -> List[str]:
        """
        Validate value ranges:
        - Inclination: 0-180 degrees
        - Azimuth: 0-360 degrees
        - MD: Must be non-negative (>= 0)
        """
        errors = []

        # Validate Inclination (0-180)
        inc_data = parsed_data.get('inc_data', [])
        if inc_data:
            for idx, value in enumerate(inc_data):
                if value is not None:
                    try:
                        inc_val = float(value)
                        if inc_val < 0 or inc_val > 180:
                            errors.append(
                                f"Inclination value {inc_val} at row {idx + 1} "
                                f"is outside valid range (0-180 degrees)"
                            )
                    except (ValueError, TypeError):
                        pass  # Already caught in numeric validation

        # Validate Azimuth (0-360)
        azi_data = parsed_data.get('azi_data', [])
        if azi_data:
            for idx, value in enumerate(azi_data):
                if value is not None:
                    try:
                        azi_val = float(value)
                        if azi_val < 0 or azi_val > 360:
                            errors.append(
                                f"Azimuth value {azi_val} at row {idx + 1} "
                                f"is outside valid range (0-360 degrees)"
                            )
                    except (ValueError, TypeError):
                        pass

        # Validate MD (non-negative, can start at 0)
        md_data = parsed_data.get('md_data', [])
        if md_data:
            for idx, value in enumerate(md_data):
                if value is not None:
                    try:
                        md_val = float(value)
                        if md_val < 0:
                            errors.append(
                                f"MD value {md_val} at row {idx + 1} "
                                f"must be non-negative (>= 0)"
                            )
                    except (ValueError, TypeError):
                        pass

        return errors

    @staticmethod
    def _validate_md_sequence(parsed_data: Dict[str, Any]) -> List[str]:
        """Validate that MD values are strictly increasing."""
        errors = []

        md_data = parsed_data.get('md_data', [])
        if not md_data or len(md_data) < 2:
            return errors

        for idx in range(1, len(md_data)):
            try:
                current_md = float(md_data[idx])
                previous_md = float(md_data[idx - 1])

                if current_md <= previous_md:
                    errors.append(
                        f"MD values are not strictly increasing at row {idx + 1} "
                        f"(previous: {previous_md}, current: {current_md})"
                    )
            except (ValueError, TypeError):
                pass  # Already caught in numeric validation

        return errors


# Import pandas for isna check
try:
    import pandas as pd
except ImportError:
    # Fallback if pandas not available
    class pd:
        @staticmethod
        def isna(value):
            return value is None
