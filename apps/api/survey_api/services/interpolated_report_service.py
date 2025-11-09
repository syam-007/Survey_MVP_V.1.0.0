"""
Service for generating Interpolated Survey Calculation Reports.
Uses the same template as calculated surveys but with interpolated data.
"""
from io import BytesIO
import logging

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from survey_api.models import InterpolatedSurvey, CalculatedSurvey
from survey_api.services.survey_calculation_report_service import SurveyCalculationReportService

logger = logging.getLogger(__name__)


def generate_interpolated_survey_report(calculated_survey_id: str, resolution: int = 5) -> bytes:
    """
    Generate an Interpolated Survey Calculation Report PDF.

    Args:
        calculated_survey_id: UUID of CalculatedSurvey
        resolution: Resolution of interpolation (default: 5m)

    Returns:
        bytes: PDF file as bytes

    Raises:
        Exception: If report generation fails
    """
    try:
        from survey_api.services.interpolation_service import InterpolationService

        logger.info(f"Generating interpolated report for CalculatedSurvey {calculated_survey_id} at resolution {resolution}m")

        # Get calculated survey
        calc_survey = CalculatedSurvey.objects.select_related('survey_data__survey_file__run__well__location').get(
            id=calculated_survey_id
        )

        # Try to get existing interpolated survey from database
        interp_survey = InterpolatedSurvey.objects.filter(
            calculated_survey_id=calculated_survey_id,
            resolution=resolution
        ).first()

        # If no saved interpolation exists or it's not completed, calculate on-demand
        if not interp_survey or interp_survey.interpolation_status != 'completed':
            logger.info(f"No saved interpolation found, calculating on-demand for resolution {resolution}m")

            # Calculate interpolation on-demand (without saving to database)
            interp_data = InterpolationService.calculate_interpolation_data(
                calculated_survey_id=calculated_survey_id,
                resolution=resolution
            )

            # Create a temporary object-like structure to pass to the report generator
            class TempInterpolatedData:
                def __init__(self, data):
                    self.md_interpolated = data['md']
                    self.inc_interpolated = data['inc']
                    self.azi_interpolated = data['azi']
                    self.tvd_interpolated = data['tvd']
                    self.northing_interpolated = data['northing']
                    self.easting_interpolated = data['easting']
                    self.dls_interpolated = data['dls']
                    self.vertical_section_interpolated = data.get('vertical_section', [])

            interp_survey = TempInterpolatedData(interp_data)

        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=0.4*inch,
            bottomMargin=0.4*inch
        )
        elements = []

        # Get related data
        survey_data = calc_survey.survey_data
        survey_file = survey_data.survey_file
        run = survey_file.run
        well = run.well
        job = run.job if hasattr(run, 'job') else None
        location = well.location if hasattr(well, 'location') else None

        # Page 1: Cover Page (using calculated survey metadata but indicating interpolation)
        # Note: Date is now automatically pulled from survey_file.created_at in _create_cover_page
        elements.extend(SurveyCalculationReportService._create_cover_page(
            survey_data, calc_survey, run, well, job, location, is_interpolated=True, resolution=resolution
        ))
        elements.append(PageBreak())

        # Pages 2+: Interpolated Data Tables (using same template as calculated)
        # Create a temporary object that mimics survey_data structure for data pages
        class TempSurveyData:
            def __init__(self, interp_data):
                self.md_data = interp_data.md_interpolated
                self.inc_data = interp_data.inc_interpolated
                self.azi_data = interp_data.azi_interpolated

        class TempCalculatedData:
            def __init__(self, interp_data):
                self.tvd = interp_data.tvd_interpolated
                self.vertical_section = interp_data.vertical_section_interpolated
                self.northing = interp_data.northing_interpolated
                self.easting = interp_data.easting_interpolated
                self.dls = interp_data.dls_interpolated

        temp_survey = TempSurveyData(interp_survey)
        temp_calc = TempCalculatedData(interp_survey)

        # Reuse the exact same data pages generation from calculated report
        # Pass the actual survey_file for date purposes
        elements.extend(SurveyCalculationReportService._create_data_pages_for_interpolated(
            temp_survey, temp_calc, run, resolution, survey_file=survey_file
        ))

        # Build PDF
        doc.build(elements)
        pdf = buffer.getvalue()
        buffer.close()

        logger.info(f"Interpolated report generated successfully: {len(pdf)} bytes")
        return pdf

    except CalculatedSurvey.DoesNotExist:
        logger.error(f"CalculatedSurvey not found: {calculated_survey_id}")
        raise Exception(f"Calculated survey not found: {calculated_survey_id}")
    except Exception as e:
        logger.error(f"Error generating interpolated report: {str(e)}")
        raise
