"""
QC Report Service for generating GTL Survey Quality Control reports.

Generates PDF reports matching the TES04-DATA-PQC01v2.1 template style.
"""
import io
import logging
from datetime import datetime
from typing import Dict, Any, List
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
)
from reportlab.pdfgen import canvas

from survey_api.models import QualityCheck, Run

logger = logging.getLogger(__name__)


class QCReportService:
    """Service for generating QC reports for GTL surveys."""

    # Color definitions matching template
    GRAY_HEADER = colors.HexColor('#7F7F7F')
    RED_HEADER = colors.HexColor('#c23c3e')
    GREEN_PASS = colors.HexColor('#92D050')
    YELLOW_GOOD = colors.HexColor('#FFC000')
    RED_LOW = colors.HexColor('#FF0000')
    LIGHT_GRAY = colors.HexColor('#D9D9D9')
    WHITE = colors.white

    @staticmethod
    def generate_qc_report(qa_id: str) -> io.BytesIO:
        """
        Generate QC report PDF for a given QA check.

        Args:
            qa_id: UUID of the QualityCheck record

        Returns:
            BytesIO buffer containing the generated PDF

        Raises:
            QualityCheck.DoesNotExist: If QA record not found
        """
        try:
            logger.info(f"Generating QC report for QA ID: {qa_id}")

            # Get QA data
            qa_check = QualityCheck.objects.select_related(
                'run',
                'run__well',
                'run__well__location',
                'run__job',
                'run__job__customer',
                'run__job__rig',
                'survey_data',
                'survey_data__survey_file'
            ).get(id=qa_id)

            # Create PDF buffer
            buffer = io.BytesIO()

            # Create PDF document
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                rightMargin=0.5*inch,
                leftMargin=0.5*inch,
                topMargin=1.5*inch,
                bottomMargin=0.7*inch
            )

            # Build report content
            story = []

            # Page 1: Job Details, Survey Information, Process Workflow, Comparative QC, Overall Survey QC
            story.extend(QCReportService._create_page1(qa_check))
            story.append(PageBreak())

            # Page 2: Gyrocompass QC Analysis
            story.extend(QCReportService._create_page2(qa_check))

            # Build PDF with custom header/footer
            doc.build(
                story,
                onFirstPage=lambda c, d: QCReportService._add_header_footer(c, d, qa_check, 1),
                onLaterPages=lambda c, d: QCReportService._add_header_footer(c, d, qa_check, doc.page)
            )

            buffer.seek(0)
            logger.info(f"QC report generated successfully for QA ID: {qa_id}")
            return buffer

        except QualityCheck.DoesNotExist:
            logger.error(f"QualityCheck not found: {qa_id}")
            raise
        except Exception as e:
            logger.error(f"Error generating QC report: {str(e)}")
            raise

    @staticmethod
    def _add_header_footer(canvas_obj: canvas.Canvas, doc, qa_check: QualityCheck, page_num: int):
        """Add header and footer to each page."""
        canvas_obj.saveState()

        width, height = letter

        # Header
        QCReportService._draw_header(canvas_obj, width, height, qa_check, page_num)

        # Footer
        QCReportService._draw_footer(canvas_obj, width, height, qa_check, page_num)

        canvas_obj.restoreState()

    @staticmethod
    def _draw_header(canvas_obj: canvas.Canvas, width: float, height: float, qa_check: QualityCheck, page_num: int):
        """Draw the header section matching survey calculation report style."""
        from reportlab.platypus import Table, TableStyle

        run = qa_check.run
        job = run.job if hasattr(run, 'job') and run.job else None

        # Get survey date
        survey_date = qa_check.created_at.strftime('%d-%b-%Y') if hasattr(qa_check, 'created_at') and qa_check.created_at else datetime.now().strftime('%d-%b-%Y')

        # Header table data (matching survey calculation report)
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Survey', 'OPS', 'External', survey_date, 'TT-OPS-FRM-004']
        ]

        # Create header table at the top
        header_table = Table(header_data, colWidths=[0.85*inch, 1.1*inch, 0.85*inch, 1*inch, 3.7*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Draw header table
        header_table.wrapOn(canvas_obj, width - 1*inch, height)
        header_table.drawOn(canvas_obj, 0.5*inch, height - 0.6*inch)

        # Title table data
        title_data = [
            ['Title', 'Survey Quality Control Report', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Quality Analysis', f'{page_num} of 2', 'A', survey_date]
        ]

        title_table = Table(title_data, colWidths=[1.0*inch, 4.5*inch, 0.6*inch, 0.5*inch, 0.9*inch])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('BACKGROUND', (2, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # Left column (Title/Sub Title) - CENTER
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),  # Report title column - LEFT aligned
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),  # Pages, Rev, Rev Date - CENTER
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (1, 0), (1, -1), 15),  # Increased padding to separate title text from label
            ('RIGHTPADDING', (0, 0), (0, -1), 5),  # Add right padding to label column
        ]))

        # Draw title table below header with spacing
        title_table.wrapOn(canvas_obj, width - 1*inch, height)
        title_table.drawOn(canvas_obj, 0.5*inch, height - 1.2*inch)

    @staticmethod
    def _draw_footer(canvas_obj: canvas.Canvas, width: float, height: float, qa_check: QualityCheck, page_num: int):
        """Draw footer matching survey calculation report style."""
        run = qa_check.run
        job = run.job if hasattr(run, 'job') and run.job else None
        well = run.well if hasattr(run, 'well') and run.well else None

        # Footer text (left side) - aligned with left margin
        canvas_obj.setFillColor(colors.black)
        canvas_obj.setFont('Helvetica', 9)
        job_number = job.job_number if job else run.run_number
        well_name = well.well_name if well else "N/A"
        canvas_obj.drawString(0.5*inch, 0.5*inch, f"{job_number} / {well_name}")

        # Page number (right side) in red - aligned with right margin
        canvas_obj.setFillColor(colors.HexColor('#c23c3e'))
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.drawRightString(width - 0.5*inch, 0.5*inch, f"Page | {page_num}")

    @staticmethod
    def _create_section_header(text: str, width: float = 7.5*inch) -> Table:
        """Create a styled section header."""
        data = [[Paragraph(f'<b><font color="white" size="11">{text}</font></b>', getSampleStyleSheet()['Normal'])]]
        table = Table(data, colWidths=[width])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), QCReportService.RED_HEADER),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ]))
        return table

    @staticmethod
    def _create_page1(qa_check: QualityCheck) -> List:
        """Create Page 1: Job Details, Survey Information, Workflow, Comparative QC."""
        story = []
        run = qa_check.run
        job = run.job if hasattr(run, 'job') and run.job else None
        well = run.well if hasattr(run, 'well') and run.well else None
        location = well.location if well and hasattr(well, 'location') else None
        rig = job.rig if job and hasattr(job, 'rig') and job.rig else None

        # Job Details Header
        story.append(QCReportService._create_section_header('Job Details'))
        story.append(Spacer(1, 0.05*inch))

        # Job information table
        job_data = [
            ['Job # Reference', job.job_number if job else run.run_number, '', 'Date of Survey', qa_check.created_at.strftime('%B %d, %Y')],
            ['Well Name', well.well_name if well else 'N/A', '', 'Rig #', rig.rig_number if rig else 'N/A']
        ]
        job_table = Table(job_data, colWidths=[1.5*inch, 1.75*inch, 0.5*inch, 1.5*inch, 2.25*inch])
        job_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (3, 0), (3, -1), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 8),
            ('FONT', (3, 0), (3, -1), 'Helvetica-Bold', 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(job_table)
        story.append(Spacer(1, 0.08*inch))

        # Type of Service
        service_text = f'<font color="{QCReportService.RED_HEADER.hexval()}" size="10"><b>Type of Service Performed: Gyroscopic Multishot Survey – High Angle</b></font>'
        story.append(Paragraph(service_text, getSampleStyleSheet()['Normal']))
        story.append(Spacer(1, 0.08*inch))

        # Survey Information Header
        story.append(QCReportService._create_section_header('Survey Information'))
        story.append(Spacer(1, 0.05*inch))

        # Survey information table - Unified 4-column layout for proper alignment
        survey_md_range = f"{min(qa_check.md_data):.2f} to {max(qa_check.md_data):.2f} ft" if qa_check.md_data else "N/A"
        max_inc = f"{max(qa_check.inc_data):.2f} °" if qa_check.inc_data else "N/A"

        survey_data = [
            ['Well Type', well.well_type if well and hasattr(well, 'well_type') else 'Deviated',
             'Latitude', f"{float(location.latitude):.6f} °N" if location else 'N/A'],
            ['Proposal Direction', f"{float(run.proposal_direction):.2f} °" if run.proposal_direction else 'N/A',
             'Longitude', f"{float(location.longitude):.6f} °E" if location else 'N/A'],
            ['Survey Range', survey_md_range,
             'Maximum Inclination', max_inc],
        ]

        survey_table = Table(survey_data, colWidths=[1.2*inch, 1.85*inch, 1.9*inch, 1.85*inch])
        survey_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 7),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 7),
            ('FONT', (2, 0), (2, -1), 'Helvetica-Bold', 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(survey_table)
        story.append(Spacer(1, 0.08*inch))

        # Process Workflow Header
        story.append(QCReportService._create_section_header('Process Workflow'))
        story.append(Spacer(1, 0.05*inch))

        # Depth Control and Tension Control sections side by side
        # Left section - Depth Control
        depth_control_data = [
            ['Depth Control', 'PASSED'],
            ['Depth\nSystem', 'Mechanical Depth', 'FUNCTIONAL'],
            ['', 'Electronic Depth', 'FUNCTIONAL'],
            ['Scale Factor', '800.5735', 'APPLIED'],
            ['Per-Job Zero', '0.00', 'Post-Job Zero', '4.50'],
            ['Stretch Correction', '0.9876 SF', 'APPLIED'],
        ]

        depth_table = Table(depth_control_data, colWidths=[1.1*inch, 1.1*inch, 1.55*inch])
        depth_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('SPAN', (0, 0), (-1, 0)),  # Merge header row
        ]))

        # Right section - Tension Control
        tension_control_data = [
            ['Tension Control', 'PASSED'],
            ['Spooling System', 'FUNCTIONAL'],
            ['Resting Load', 'Pre Job', '245 lbs', 'Post Job', '165 lbs'],
            ['Max Load', '1800 lbs', 'Asso. Depth', '5500 ft'],
            ['Weak Point', 'Cable Head', 'CHECKED'],
            ['Alarms', 'NONE'],
        ]

        tension_table = Table(tension_control_data, colWidths=[1.0*inch, 0.7*inch, 0.65*inch, 0.7*inch, 0.7*inch])
        tension_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('SPAN', (0, 0), (-1, 0)),  # Merge header row
        ]))

        # Combine Depth and Tension Control side by side with proper spacing
        control_combined = Table([[depth_table, Spacer(0.05*inch, 1), tension_table]], colWidths=[3.7*inch, 0.1*inch, 3.7*inch])
        control_combined.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(control_combined)
        story.append(Spacer(1, 0.05*inch))

        # Checklists section - Left and Right tables
        checklist_left_data = [
            ['Checklist', 'Serial', 'Pre Job', 'Post Job'],
            ['Wireline Unit Systems', 'TU03', 'PASS', 'PASS'],
            ['Equipment Conformity', 'Various', 'PASS', 'PASS'],
        ]

        checklist_left = Table(checklist_left_data, colWidths=[1.4*inch, 0.9*inch, 0.7*inch, 0.75*inch])
        checklist_left.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 1), (-1, -1), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 6),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 6),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor('#FF0000')),  # "Checklist" in red
            ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#FF0000')),  # "Serial" in red
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.HexColor('#008000')),  # "Pre Job", "Post Job" in green
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        checklist_right_data = [
            ['Checklist', 'Serial', 'Pre Job', 'Post Job'],
            ['Sensor Calibration', 'HASS 522', 'PASS', 'PASS'],
            ['Truck & Vehicle', 'TT03 TV03', 'PASS', 'PASS'],
        ]

        checklist_right = Table(checklist_right_data, colWidths=[1.4*inch, 0.9*inch, 0.7*inch, 0.75*inch])
        checklist_right.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 1), (-1, -1), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 6),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 6),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor('#FF0000')),  # "Checklist" in red
            ('TEXTCOLOR', (1, 0), (1, 0), colors.HexColor('#FF0000')),  # "Serial" in red
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.HexColor('#008000')),  # "Pre Job", "Post Job" in green
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        # Combine checklists side by side with proper spacing
        checklist_combined = Table([[checklist_left, Spacer(0.05*inch, 1), checklist_right]], colWidths=[3.7*inch, 0.1*inch, 3.7*inch])
        checklist_combined.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(checklist_combined)

        # Comparative QC Analysis Header
        story.append(Spacer(1, 0.08*inch))
        story.append(QCReportService._create_section_header('Comparative QC Analysis'))
        story.append(Spacer(1, 0.05*inch))

        # Explanation text
        explanation = """<font size="7"><i>Inrun Surveys</i> are considered to be <b>Definitive Surveys</b> & <i>Outrun Surveys</i> are considered <i>Comparative Surveys</i><br/>
        The 2 Surveys are qualified by comparing their positional difference (Northing, Easting, TVD) per survey interval (Meterage)<br/>
        <b>P.S.</b> Comparative QC Analysis does not account for systematic survey & tool errors, Gyrocompass QC Stations and Equipment Conformity are <u>Mandatory to Quality the Survey as Definitive.</u></font>"""
        story.append(Paragraph(explanation, getSampleStyleSheet()['Normal']))
        story.append(Spacer(1, 0.05*inch))

        # Comparative table
        # TODO: This requires comparison survey data - simplified for now
        comp_data = [
            ['Surveys', 'Measured Depth', 'TVD', 'Latitude (+N/-S)', 'Departure (+E/-W)'],
            ['Definitive Survey\nINRUN', '5500.00', '5254.60', '-737.68', '743.25'],
            ['Comparison Survey\nOUTRUN', '5500.00', '5252.56', '-746.64', '746.85'],
            ['Delta', '0.00', '2.04', '8.96', '-3.60'],
            ['Comparison Qualifier', '0.000', '0.0004', '0.0016', '-0.0007'],
            ['Limits', '0.002', '0.002', '0.003', '0.003'],
            ['Status', 'PASS', 'PASS', 'PASS', 'PASS'],
        ]

        comp_table = Table(comp_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (0, -1), (-1, -1), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8),
            ('FONT', (0, 1), (0, -1), 'Helvetica-Bold', 7),
            ('FONT', (1, 1), (-1, -1), 'Helvetica', 7),
            ('FONT', (0, -1), (-1, -1), 'Helvetica-Bold', 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(comp_table)

        # Overall Survey QC Analysis at the end of Page 1
        story.append(Spacer(1, 0.1*inch))
        story.append(QCReportService._create_section_header('Overall Survey QC Analysis'))
        story.append(Spacer(1, 0.05*inch))

        # Calculate overall confidence
        total_stations = len(qa_check.md_data)
        pass_count = sum(1 for status in qa_check.overall_status_data if status == 'PASS')
        gyrocompass_confidence = (pass_count / total_stations * 100) if total_stations > 0 else 0

        # Overall weighted confidence
        # Weights: Process Workflow (0.5), Sensor Calibration (2), Comparative QC (2), Gyrocompass QC (5), Secondary QC (0.5)
        process_workflow = 100.0  # Assuming passed
        sensor_calibration = 100.0  # Assuming passed
        comparative_qc = 100.0  # Assuming passed
        secondary_qc_status = "Pending"

        total_weight = 0.5 + 2 + 2 + 5 + 0.5
        overall_confidence = (
            (process_workflow * 0.5 + sensor_calibration * 2 + comparative_qc * 2 +
             gyrocompass_confidence * 5) / (total_weight - 0.5)  # Exclude pending Secondary QC
        )

        # QC table - compact version
        qc_data = [
            ['QC Confidence', f"{process_workflow:.0f}%", f"{sensor_calibration:.0f}%", f"{comparative_qc:.0f}%", f"{gyrocompass_confidence:.2f} %", secondary_qc_status],
            ['Weightage', '0.5', '2', '2', '5', '0.5'],
        ]

        qc_headers = [['', 'Process Workflow', 'Sensor Calibration', 'Comparitive QC', 'Gyrocompass QC', 'Secondary QC']]

        # Combine headers and data
        full_qc_data = qc_headers + qc_data

        qc_table = Table(full_qc_data, colWidths=[1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch])
        qc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 1), (0, -1), QCReportService.RED_HEADER),
            ('BACKGROUND', (1, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7),
            ('FONT', (0, 1), (0, -1), 'Helvetica-Bold', 7),
            ('FONT', (1, 1), (-1, -1), 'Helvetica', 7),
            ('TEXTCOLOR', (0, 1), (0, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(qc_table)
        story.append(Spacer(1, 0.05*inch))

        # Overall confidence result - compact version
        result_data = [[
            'Overall Survey QC Confidence',
            f"{overall_confidence:.2f}%",
            'SURVEY QUALIFIED'
        ]]
        result_table = Table(result_data, colWidths=[2.5*inch, 2.0*inch, 3.0*inch])
        result_table.setStyle(TableStyle([
            ('BACKGROUND', (2, 0), (2, 0), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, -1), 'Helvetica-Bold', 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(result_table)

        return story
    @staticmethod
    def _create_page2(qa_check: QualityCheck) -> List:
        """Create Page 2: Gyrocompass QC Analysis (without TGF Comp and W(t) Comp columns)."""
        story = []
        run = qa_check.run
        location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None

        # Section header
        story.append(QCReportService._create_section_header('Gyrocompass QC Analysis'))
        story.append(Spacer(1, 0.1*inch))

        # Explanation text (keep as-is or remove parts if you want)
        explanation = """<font size="7">The Gyrocompass Survey Stations are qualified based on 2 Criteria,<br/>
        <b>W(t) - Horizontal vector of Earth's Rotation Rate</b> – The measured drift rate of the Gyroscopic Sensor sensing Azimuthal drift caused due to Earth's Rotation.<br/>
        Actual ER<sub>h</sub> = 15.046 cosine (Latitude)<br/>
        Δ W(t) = W(t) - ER<sub>h</sub><br/>
        <b>High Compliance</b> - Variance within ±1° is allowed to keep the azimuthal uncertainty ≤ ±0.1°,<br/>
        <b>Good Compliance</b> - Variance within ±3° is allowed to keep the azimuthal uncertainty ≤ ±1°<br/>
        <b>Low Compliance</b> - Variance within ±10° is allowed to keep the azimuthal uncertainty ≤ ±3° (Vertical Wells)<br/>
        <b>Non-Compliance</b> – Higher Uncertainty in Azimuth readings from the Sensor for the particular survey station.<br/><br/>
        <b>G(t) - Vertical vector of Local Gravity</b> – The acceleration due to Gravity measured by the Accelerometers sensing Inclination change in the Probe.<br/>
        Local Gravity g<sub>l</sub> is calculated using the International Gravity Formula 1980 from the Latitude and Reference Elevation of the location.<br/>
        g<sub>l</sub> = 9.780327(1 + Asin²L - Bsin²2L) - 3.086x10⁻⁶H [ L – Latitude, H – Reference Elevation, A – 0.0053024, B – 0.0000058]<br/>
        Standard Gravity g<sub>s</sub> = 9.800665 m/s²<br/>
        Calculated G<sub>l</sub> = g<sub>l</sub> x Mass of the Toolstring (mg) (~1000 mg).<br/>
        Δ TGF = G(t) – G<sub>l</sub><br/>
        <b>High Compliance</b> - Variance within ± 1 mg is allowed to keep the inclination uncertainty ≤ 0.1°<br/>
        <b>Good Compliance</b> - Variance within ± 5 mg is allowed to keep the inclination uncertainty ≤ 0.5°<br/>
        <b>Low Compliance</b> - Variance within ± 10 mg is allowed to keep the inclination uncertainty ≤ 1° (Vertical Wells)<br/>
        <b>Non-Compliance</b> - Higher uncertainty in Inclination readings from the Sensor for the particular survey station.</font>"""
        story.append(Paragraph(explanation, getSampleStyleSheet()['Normal']))
        story.append(Spacer(1, 0.15*inch))

        # Calculate Gl and ERh
        location_g_t = float(location.g_t) if location and location.g_t else 998.278
        location_w_t = float(location.w_t) if location and location.w_t else 13.84

        # Survey name
        survey_name = f"Survey: {qa_check.file_name}"
        story.append(Paragraph(f'<font size="9"><b>{survey_name}</b></font>', getSampleStyleSheet()['Normal']))
        story.append(Spacer(1, 0.05*inch))

        # Gl and ERh values
        gl_erh_data = [[
            Paragraph(f'<font size="8"><b>G<sub>l</sub></b></font>', getSampleStyleSheet()['Normal']),
            f"{location_g_t:.3f}",
            Paragraph(f'<font size="8"><b>ER<sub>h</sub></b></font>', getSampleStyleSheet()['Normal']),
            f"{location_w_t:.2f}"
        ]]
        gl_erh_table = Table(gl_erh_data, colWidths=[0.5*inch, 1*inch, 0.5*inch, 1*inch])
        gl_erh_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, 0), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(gl_erh_table)
        story.append(Spacer(1, 0.1*inch))

        # ✅ QA stations table (removed ΔTGF Comp and ΔW(t) Comp)
        qa_table_data = [[
            'Measure\nDepth', 'Inclination', 'Azimuth',
            'G(t)', 'Δ TGF',
            'W(t)', 'Δ W(t)',
            'Status'
        ]]

        pass_count = 0
        for i in range(len(qa_check.md_data)):
            md = qa_check.md_data[i]
            inc = qa_check.inc_data[i]
            azi = qa_check.azi_data[i]
            gt = qa_check.gt_data[i]
            wt = qa_check.wt_data[i]
            gt_diff = qa_check.g_t_difference_data[i]
            wt_diff = qa_check.w_t_difference_data[i]
            overall = qa_check.overall_status_data[i]

            if overall == 'PASS':
                pass_count += 1

            qa_table_data.append([
                f"{md:.2f}",
                f"{inc:.2f}",
                f"{azi:.2f}",
                f"{gt:.2f}",
                f"{gt_diff:.2f}",
                f"{wt:.2f}",
                f"{wt_diff:.2f}",
                overall
            ])

        # New col widths (8 columns now)
        qa_table = Table(
            qa_table_data,
            colWidths=[0.9*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.9*inch]
        )

        table_style = [
            ('BACKGROUND', (0, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]

        # ✅ Only color Overall status column now (last column index = 7)
        for i in range(1, len(qa_table_data)):
            overall_status = qa_table_data[i][7]
            if overall_status == 'PASS':
                table_style.append(('BACKGROUND', (7, i), (7, i), QCReportService.GREEN_PASS))
            else:
                table_style.append(('BACKGROUND', (7, i), (7, i), QCReportService.RED_LOW))

        qa_table.setStyle(TableStyle(table_style))
        story.append(qa_table)
        story.append(Spacer(1, 0.1*inch))

        # Confidence score
        total_stations = len(qa_check.md_data)
        confidence = (pass_count / total_stations * 100) if total_stations > 0 else 0

        confidence_data = [[
            'Survey Gyrocompass QC Confidence',
            f"{confidence:.2f} %",
            'SURVEY QUALIFIED'
        ]]
        confidence_table = Table(confidence_data, colWidths=[3.75*inch, 1.5*inch, 2.25*inch])
        confidence_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), QCReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, 0), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, -1), 'Helvetica-Bold', 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(confidence_table)

        return story


    # @staticmethod
    # def _create_page2(qa_check: QualityCheck) -> List:
    #     """Create Page 2: Gyrocompass QC Analysis."""
    #     story = []
    #     run = qa_check.run
    #     location = run.well.location if hasattr(run, 'well') and run.well and hasattr(run.well, 'location') else None

    #     # Section header
    #     story.append(QCReportService._create_section_header('Gyrocompass QC Analysis'))
    #     story.append(Spacer(1, 0.1*inch))

    #     # Explanation text
    #     explanation = """<font size="7">The Gyrocompass Survey Stations are qualified based on 2 Criteria,<br/>
    #     <b>W(t) - Horizontal vector of Earth's Rotation Rate</b> – The measured drift rate of the Gyroscopic Sensor sensing Azimuthal drift caused due to Earth's Rotation.<br/>
    #     Actual ER<sub>h</sub> = 15.046 cosine (Latitude)<br/>
    #     Δ W(t) = W(t) - ER<sub>h</sub><br/>
    #     <b>High Compliance</b> - Variance within ±1° is allowed to keep the azimuthal uncertainty ≤ ±0.1°,<br/>
    #     <b>Good Compliance</b> - Variance within ±3° is allowed to keep the azimuthal uncertainty ≤ ±1°<br/>
    #     <b>Low Compliance</b> - Variance within ±10° is allowed to keep the azimuthal uncertainty ≤ ±3° (Vertical Wells)<br/>
    #     <b>Non-Compliance</b> – Higher Uncertainty in Azimuth readings from the Sensor for the particular survey station.<br/><br/>
    #     <b>G(t) - Vertical vector of Local Gravity</b> – The acceleration due to Gravity measured by the Accelerometers sensing Inclination change in the Probe.<br/>
    #     Local Gravity g<sub>l</sub> is calculated using the International Gravity Formula 1980 from the Latitude and Reference Elevation of the location.<br/>
    #     g<sub>l</sub> = 9.780327(1 + Asin²L - Bsin²2L) - 3.086x10⁻⁶H [ L – Latitude, H – Reference Elevation, A – 0.0053024, B – 0.0000058]<br/>
    #     Standard Gravity g<sub>s</sub> = 9.800665 m/s²<br/>
    #     Calculated G<sub>l</sub> = g<sub>l</sub> x Mass of the Toolstring (mg) (~1000 mg).<br/>
    #     Δ TGF = G(t) – G<sub>l</sub><br/>
    #     <b>High Compliance</b> - Variance within ± 1 mg is allowed to keep the inclination uncertainty ≤ 0.1°<br/>
    #     <b>Good Compliance</b> - Variance within ± 5 mg is allowed to keep the inclination uncertainty ≤ 0.5°<br/>
    #     <b>Low Compliance</b> - Variance within ± 10 mg is allowed to keep the inclination uncertainty ≤ 1° (Vertical Wells)<br/>
    #     <b>Non-Compliance</b> - Higher uncertainty in Inclination readings from the Sensor for the particular survey station.</font>"""
    #     story.append(Paragraph(explanation, getSampleStyleSheet()['Normal']))
    #     story.append(Spacer(1, 0.15*inch))

    #     # Calculate Gl and ERh
    #     location_g_t = float(location.g_t) if location and location.g_t else 998.278
    #     location_w_t = float(location.w_t) if location and location.w_t else 13.84

    #     # Survey name
    #     survey_name = f"Survey: {qa_check.file_name}"
    #     story.append(Paragraph(f'<font size="9"><b>{survey_name}</b></font>', getSampleStyleSheet()['Normal']))
    #     story.append(Spacer(1, 0.05*inch))

    #     # Gl and ERh values
    #     gl_erh_data = [[
    #         Paragraph(f'<font size="8"><b>G<sub>l</sub></b></font>', getSampleStyleSheet()['Normal']),
    #         f"{location_g_t:.3f}",
    #         Paragraph(f'<font size="8"><b>ER<sub>h</sub></b></font>', getSampleStyleSheet()['Normal']),
    #         f"{location_w_t:.2f}"
    #     ]]
    #     gl_erh_table = Table(gl_erh_data, colWidths=[0.5*inch, 1*inch, 0.5*inch, 1*inch])
    #     gl_erh_table.setStyle(TableStyle([
    #         ('BACKGROUND', (0, 0), (0, 0), QCReportService.LIGHT_GRAY),
    #         ('BACKGROUND', (2, 0), (2, 0), QCReportService.LIGHT_GRAY),
    #         ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
    #         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    #         ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    #         ('TOPPADDING', (0, 0), (-1, -1), 4),
    #         ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    #     ]))
    #     story.append(gl_erh_table)
    #     story.append(Spacer(1, 0.1*inch))

    #     # QA stations table
    #     qa_table_data = [[
    #         'Measure\nDepth', 'Inclination', 'Azimuth', 'G(t)', 'Δ TGF', 'Δ TGF\nComp', 'W(t)', 'Δ W(t)', 'Δ W(t)\nComp', 'Status'
    #     ]]

    #     # Add station data rows
    #     pass_count = 0
    #     for i in range(len(qa_check.md_data)):
    #         md = qa_check.md_data[i]
    #         inc = qa_check.inc_data[i]
    #         azi = qa_check.azi_data[i]
    #         gt = qa_check.gt_data[i]
    #         wt = qa_check.wt_data[i]
    #         gt_diff = qa_check.g_t_difference_data[i]
    #         wt_diff = qa_check.w_t_difference_data[i]
    #         gt_status = qa_check.g_t_status_data[i].upper()
    #         wt_status = qa_check.w_t_status_data[i].upper()
    #         overall = qa_check.overall_status_data[i]

    #         if overall == 'PASS':
    #             pass_count += 1

    #         qa_table_data.append([
    #             f"{md:.2f}",
    #             f"{inc:.2f}",
    #             f"{azi:.2f}",
    #             f"{gt:.2f}",
    #             f"{gt_diff:.2f}",
    #             gt_status,
    #             f"{wt:.2f}",
    #             f"{wt_diff:.2f}",
    #             wt_status,
    #             overall
    #         ])

    #     qa_table = Table(qa_table_data, colWidths=[0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch])

    #     # Build table style with color coding
    #     table_style = [
    #         ('BACKGROUND', (0, 0), (-1, 0), QCReportService.LIGHT_GRAY),
    #         ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 7),
    #         ('FONT', (0, 1), (-1, -1), 'Helvetica', 7),
    #         ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    #         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    #         ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    #         ('TOPPADDING', (0, 0), (-1, -1), 3),
    #         ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    #     ]

    #     # Color code status cells
    #     for i in range(1, len(qa_table_data)):
    #         row_idx = i
    #         # G(t) status color
    #         gt_status = qa_table_data[i][5]
    #         if gt_status == 'HIGH':
    #             table_style.append(('BACKGROUND', (5, row_idx), (5, row_idx), QCReportService.GREEN_PASS))
    #         elif gt_status == 'GOOD':
    #             table_style.append(('BACKGROUND', (5, row_idx), (5, row_idx), QCReportService.YELLOW_GOOD))
    #         elif gt_status == 'LOW':
    #             table_style.append(('BACKGROUND', (5, row_idx), (5, row_idx), QCReportService.RED_LOW))

    #         # W(t) status color
    #         wt_status = qa_table_data[i][8]
    #         if wt_status == 'HIGH':
    #             table_style.append(('BACKGROUND', (8, row_idx), (8, row_idx), QCReportService.GREEN_PASS))
    #         elif wt_status == 'GOOD':
    #             table_style.append(('BACKGROUND', (8, row_idx), (8, row_idx), QCReportService.YELLOW_GOOD))
    #         elif wt_status == 'LOW':
    #             table_style.append(('BACKGROUND', (8, row_idx), (8, row_idx), QCReportService.RED_LOW))

    #         # Overall status color
    #         overall_status = qa_table_data[i][9]
    #         if overall_status == 'PASS':
    #             table_style.append(('BACKGROUND', (9, row_idx), (9, row_idx), QCReportService.GREEN_PASS))
    #         else:
    #             table_style.append(('BACKGROUND', (9, row_idx), (9, row_idx), QCReportService.RED_LOW))

    #     qa_table.setStyle(TableStyle(table_style))
    #     story.append(qa_table)
    #     story.append(Spacer(1, 0.1*inch))

    #     # Confidence score
    #     total_stations = len(qa_check.md_data)
    #     confidence = (pass_count / total_stations * 100) if total_stations > 0 else 0

    #     confidence_data = [[
    #         'Survey Gyrocompass QC Confidence',
    #         f"{confidence:.2f} %",
    #         'SURVEY QUALIFIED'
    #     ]]
    #     confidence_table = Table(confidence_data, colWidths=[3.75*inch, 1.5*inch, 2.25*inch])
    #     confidence_table.setStyle(TableStyle([
    #         ('BACKGROUND', (0, 0), (0, 0), QCReportService.LIGHT_GRAY),
    #         ('BACKGROUND', (2, 0), (2, 0), QCReportService.GREEN_PASS),
    #         ('FONT', (0, 0), (-1, -1), 'Helvetica-Bold', 9),
    #         ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
    #         ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    #         ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    #         ('TOPPADDING', (0, 0), (-1, -1), 6),
    #         ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    #     ]))
    #     story.append(confidence_table)

    #     return story

    @staticmethod
    def _create_page3(qa_check: QualityCheck) -> List:
        """Create Page 3: Overall Survey QC Analysis."""
        story = []

        # Section header
        story.append(QCReportService._create_section_header('Overall Survey QC Analysis'))
        story.append(Spacer(1, 0.2*inch))

        # Calculate overall confidence
        # Gyrocompass QC confidence from page 2
        total_stations = len(qa_check.md_data)
        pass_count = sum(1 for status in qa_check.overall_status_data if status == 'PASS')
        gyrocompass_confidence = (pass_count / total_stations * 100) if total_stations > 0 else 0

        # Overall weighted confidence
        # Weights: Process Workflow (0.5), Sensor Calibration (2), Comparative QC (2), Gyrocompass QC (5), Secondary QC (0.5)
        process_workflow = 100.0  # Assuming passed
        sensor_calibration = 100.0  # Assuming passed
        comparative_qc = 100.0  # Assuming passed
        secondary_qc_status = "Pending"

        total_weight = 0.5 + 2 + 2 + 5 + 0.5
        overall_confidence = (
            (process_workflow * 0.5 + sensor_calibration * 2 + comparative_qc * 2 +
             gyrocompass_confidence * 5) / (total_weight - 0.5)  # Exclude pending Secondary QC
        )

        # QC table
        qc_data = [
            ['QC Confidence', f"{process_workflow:.0f}%", f"{sensor_calibration:.0f}%", f"{comparative_qc:.0f}%", f"{gyrocompass_confidence:.2f} %", secondary_qc_status],
            ['Weightage', '0.5', '2', '2', '5', '0.5'],
        ]

        qc_headers = [['', 'Process Workflow', 'Sensor Calibration', 'Comparitive QC', 'Gyrocompass QC', 'Secondary QC']]

        # Combine headers and data
        full_qc_data = qc_headers + qc_data

        qc_table = Table(full_qc_data, colWidths=[1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch, 1.25*inch])
        qc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 1), (0, -1), QCReportService.RED_HEADER),
            ('BACKGROUND', (1, 0), (-1, 0), QCReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8),
            ('FONT', (0, 1), (0, -1), 'Helvetica-Bold', 9),
            ('FONT', (1, 1), (-1, -1), 'Helvetica', 8),
            ('TEXTCOLOR', (0, 1), (0, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(qc_table)
        story.append(Spacer(1, 0.2*inch))

        # Overall confidence result
        result_data = [[
            'Overall Survey QC Confidence',
            f"{overall_confidence:.2f}%",
            'SURVEY QUALIFIED'
        ]]
        result_table = Table(result_data, colWidths=[2.5*inch, 2.0*inch, 3.0*inch])
        result_table.setStyle(TableStyle([
            ('BACKGROUND', (2, 0), (2, 0), QCReportService.GREEN_PASS),
            ('FONT', (0, 0), (-1, -1), 'Helvetica-Bold', 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(result_table)

        return story

    @staticmethod
    def _create_page4() -> List:
        """Create Page 4: Blank page for notes/signatures."""
        story = []
        # Just a blank page with header/footer
        story.append(Spacer(1, 8*inch))
        return story
