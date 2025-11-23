"""
File parsing service for survey data files.
"""
import pandas as pd
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class FileParsingError(Exception):
    """Raised when file cannot be parsed."""
    pass


class FileParserService:
    """
    Service for parsing survey data files (Excel and CSV).
    """

    @staticmethod
    def parse_survey_file(file_path: str, survey_type: str) -> Dict[str, Any]:
        """
        Parse survey file and extract column data.

        Args:
            file_path: Path to the uploaded file
            survey_type: Type of survey ('Type 1 - GTL', 'Type 2 - Gyro', etc.)

        Returns:
            Dictionary containing:
                - md_data: List of measured depth values
                - inc_data: List of inclination values
                - azi_data: List of azimuth values
                - wt_data: List of w(t) values (GTL only, optional)
                - gt_data: List of g(t) values (GTL only, optional)
                - row_count: Number of data rows

        Raises:
            FileParsingError: If file cannot be parsed
        """
        try:
            # Determine file type and read accordingly
            if file_path.lower().endswith('.xlsx'):
                df = pd.read_excel(file_path)
            elif file_path.lower().endswith('.csv'):
                df = pd.read_csv(file_path)
            else:
                raise FileParsingError(f"Unsupported file type: {file_path}")

            logger.info(f"Successfully read file: {file_path}")
            logger.info(f"Columns found: {df.columns.tolist()}")
            logger.info(f"Row count: {len(df)}")

            # Create a case-insensitive column mapping
            column_mapping = {col.upper(): col for col in df.columns}

            logger.info(f"Column mapping (case-insensitive): {column_mapping}")

            # Extract required columns
            result = {
                'md_data': None,
                'inc_data': None,
                'azi_data': None,
                'wt_data': None,
                'gt_data': None,
                'row_count': len(df)
            }

            # Check for required columns (case-insensitive with alternate names)
            # MD column: Accept "MD" or "Depth"
            md_column = None
            if 'MD' in column_mapping:
                md_column = column_mapping['MD']
            elif 'DEPTH' in column_mapping:
                md_column = column_mapping['DEPTH']
            else:
                raise FileParsingError(
                    f"Missing required column: MD/Depth (case-insensitive). Found columns: {df.columns.tolist()}"
                )

            # INC column: Accept "INC"
            if 'INC' not in column_mapping:
                raise FileParsingError(
                    f"Missing required column: INC (case-insensitive). Found columns: {df.columns.tolist()}"
                )

            # AZI column: Accept "AZI" or "AZG" (azimuth gyroscopic)
            azi_column = None
            if 'AZI' in column_mapping:
                azi_column = column_mapping['AZI']
            elif 'AZG' in column_mapping:
                azi_column = column_mapping['AZG']
            else:
                raise FileParsingError(
                    f"Missing required column: AZI/AZG (case-insensitive). Found columns: {df.columns.tolist()}"
                )

            # Extract MD, Inc, Azi using case-insensitive mapping with alternate names
            result['md_data'] = df[md_column].tolist()
            result['inc_data'] = df[column_mapping['INC']].tolist()
            result['azi_data'] = df[azi_column].tolist()

            logger.info(f"Detected columns - MD: '{md_column}', INC: '{column_mapping['INC']}', AZI: '{azi_column}'")

            # Extract GTL-specific columns if survey type is GTL
            # For GTL, G(T) and W(T) are REQUIRED with case-insensitive matching
            if survey_type == 'Type 1 - GTL':
                # Check for G(T) column (case-insensitive)
                if 'G(T)' not in column_mapping:
                    raise FileParsingError(
                        f"Missing required column for GTL: G(T) or G(t) or g(t). Found columns: {df.columns.tolist()}"
                    )
                # Check for W(T) column (case-insensitive)
                if 'W(T)' not in column_mapping:
                    raise FileParsingError(
                        f"Missing required column for GTL: W(T) or W(t) or w(t). Found columns: {df.columns.tolist()}"
                    )

                # Extract G(T) and W(T) data using case-insensitive mapping
                result['gt_data'] = df[column_mapping['G(T)']].tolist()
                result['wt_data'] = df[column_mapping['W(T)']].tolist()

                logger.info(f"GTL-specific columns extracted: G(T) and W(T)")

            logger.info(f"Successfully parsed {result['row_count']} survey stations")

            return result

        except pd.errors.EmptyDataError:
            raise FileParsingError("File is empty or contains no data")
        except pd.errors.ParserError as e:
            raise FileParsingError(f"Error parsing file: {str(e)}")
        except FileNotFoundError:
            raise FileParsingError(f"File not found: {file_path}")
        except Exception as e:
            logger.exception(f"Unexpected error parsing file: {e}")
            raise FileParsingError(f"Failed to parse file: {str(e)}")
