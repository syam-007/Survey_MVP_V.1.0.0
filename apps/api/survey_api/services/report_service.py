"""
Report generation service for survey calculations.
Generates PDF reports with template first page and calculated data.
"""
import os
from io import BytesIO
from datetime import datetime
from django.conf import settings
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from PyPDF2 import PdfReader, PdfWriter
import logging

logger = logging.getLogger(__name__)


class SurveyReportGenerator:
    """Generate PDF reports for survey calculations."""

    def __init__(self):
        # Template is in the survey root directory (parent of apps/api)
        self.template_path = os.path.join(
            settings.BASE_DIR.parent.parent,
            'survey-calculation-report (7).pdf'
        )
        self.styles = getSampleStyleSheet()

    def generate_report(self, survey_data):
        """
        Generate a complete PDF report with template and calculated data.

        Args:
            survey_data: SurveyData model instance with calculated results

        Returns:
            BytesIO: PDF file content
        """
        try:
            # Create temporary PDF with calculated data
            calc_buffer = BytesIO()
            self._create_calculation_pages(calc_buffer, survey_data)
            calc_buffer.seek(0)

            # Merge with template
            final_buffer = self._merge_with_template(calc_buffer)

            return final_buffer

        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise

    def _create_calculation_pages(self, buffer, survey_data):
        """Create pages with calculated survey data."""
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.3*inch,
            leftMargin=0.3*inch,
            topMargin=0.3*inch,
            bottomMargin=0.3*inch
        )

        story = []

        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1976D2'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )

        title = Paragraph("Survey Calculation Report", title_style)
        story.append(title)
        story.append(Spacer(1, 0.2*inch))

        # Survey Information
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6
        )

        survey_file = survey_data.survey_file
        run = survey_file.run

        info_data = [
            ['Run Number:', run.run_number],
            ['Run Name:', run.run_name],
            ['Survey File:', survey_file.file_name],
            ['Survey Type:', survey_file.survey_type],
            ['Upload Date:', survey_file.created_at.strftime('%Y-%m-%d %H:%M')],
            ['Well Name:', run.well.well_name if run.well else 'N/A'],
            ['Data Points:', str(survey_data.row_count)],
            ['Report Date:', datetime.now().strftime('%Y-%m-%d %H:%M')],
        ]

        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#E3F2FD')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))

        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))

        # Calculated Survey Data
        section_style = ParagraphStyle(
            'SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1976D2'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        )

        section_title = Paragraph("Calculated Survey Data", section_style)
        story.append(section_title)
        story.append(Spacer(1, 0.1*inch))

        # Get calculated survey data
        try:
            from survey_api.models import CalculatedSurvey
            calculated = CalculatedSurvey.objects.get(survey_data=survey_data)
        except:
            calculated = None

        # Prepare survey data table
        survey_table_data = [
            ['MD (m)', 'INC (°)', 'AZI (°)', 'North (m)', 'East (m)', 'TVD (m)']
        ]

        # Add data rows (limit to reasonable number for PDF)
        md_data = survey_data.md_data
        inc_data = survey_data.inc_data
        azi_data = survey_data.azi_data
        north_data = calculated.northing if calculated else []
        east_data = calculated.easting if calculated else []
        tvd_data = calculated.tvd if calculated else []

        max_rows = min(len(md_data), 100)  # Limit to 100 rows

        for i in range(max_rows):
            row = [
                f"{md_data[i]:.2f}",
                f"{inc_data[i]:.2f}",
                f"{azi_data[i]:.2f}",
                f"{north_data[i]:.3f}" if i < len(north_data) else "N/A",
                f"{east_data[i]:.3f}" if i < len(east_data) else "N/A",
                f"{tvd_data[i]:.3f}" if i < len(tvd_data) else "N/A",
            ]
            survey_table_data.append(row)

        # Create table with data
        col_widths = [0.9*inch, 0.9*inch, 0.9*inch, 1.1*inch, 1.1*inch, 1.1*inch]
        survey_table = Table(survey_table_data, colWidths=col_widths, repeatRows=1)

        # Table styling
        table_style = TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),

            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),

            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
        ])

        survey_table.setStyle(table_style)
        story.append(survey_table)

        # Note if data was truncated
        if len(md_data) > max_rows:
            story.append(Spacer(1, 0.1*inch))
            note = Paragraph(
                f"<i>Note: Showing first {max_rows} of {len(md_data)} data points. "
                f"Download full data as CSV for complete dataset.</i>",
                self.styles['Normal']
            )
            story.append(note)

        # Build PDF
        doc.build(story)

    def _merge_with_template(self, calc_buffer):
        """Merge calculated pages with template."""
        try:
            output = PdfWriter()

            # Add template page(s) if exists
            if os.path.exists(self.template_path):
                template_pdf = PdfReader(self.template_path)
                for page in template_pdf.pages:
                    output.add_page(page)
            else:
                logger.warning(f"Template not found at {self.template_path}")

            # Add calculated data pages
            calc_pdf = PdfReader(calc_buffer)
            for page in calc_pdf.pages:
                output.add_page(page)

            # Write to buffer
            final_buffer = BytesIO()
            output.write(final_buffer)
            final_buffer.seek(0)

            return final_buffer

        except Exception as e:
            logger.error(f"Error merging PDFs: {str(e)}")
            # If merge fails, return just the calculated pages
            return calc_buffer


def generate_survey_report(survey_data):
    """
    Helper function to generate survey report.

    Args:
        survey_data: SurveyData instance

    Returns:
        BytesIO: PDF report
    """
    generator = SurveyReportGenerator()
    return generator.generate_report(survey_data)
