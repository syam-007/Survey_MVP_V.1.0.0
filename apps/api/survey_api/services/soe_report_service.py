"""
SOE Report Service for generating Sequence of Events reports.

Generates PDF reports matching the TES02-FRM-SOE01v2.1 template style.
"""
import io
import logging
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
)
from reportlab.pdfgen import canvas

from survey_api.models import Job

logger = logging.getLogger(__name__)


class SOEReportService:
    """Service for generating SOE (Sequence of Events) reports for jobs."""

    # Color definitions matching template
    GRAY_HEADER = colors.HexColor('#808080')
    RED_HEADER = colors.HexColor('#c23c3e')  # Matching pre-job report color
    LIGHT_GRAY = colors.HexColor('#D9D9D9')
    WHITE = colors.white

    @staticmethod
    def generate_soe_report(job_id: str) -> io.BytesIO:
        """
        Generate SOE report PDF for a given job.

        Args:
            job_id: UUID of the Job record

        Returns:
            BytesIO buffer containing the generated PDF

        Raises:
            Job.DoesNotExist: If job not found
        """
        try:
            logger.info(f"Generating SOE report for Job ID: {job_id}")

            # Get Job data with related objects
            job = Job.objects.select_related(
                'customer',
                'rig',
                'well'
            ).prefetch_related(
                'runs',
                'runs__survey_files',
                'runs__activity_logs'
            ).get(id=job_id)

            # Create PDF buffer
            buffer = io.BytesIO()

            # Create PDF document with margins matching pre-job report
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=0.25*inch,
                leftMargin=0.25*inch,
                topMargin=2.25*inch,  # Space for header tables and section header on page 2
                bottomMargin=1.15*inch  # Space for footer at 0.9" from bottom (printable area)
            )

            # Build report content
            story = []

            # Page content
            story.extend(SOEReportService._create_page_content(job))

            # Build PDF with custom header/footer
            doc.build(
                story,
                onFirstPage=lambda c, d: SOEReportService._add_header_footer(c, d, job),
                onLaterPages=lambda c, d: SOEReportService._add_header_footer(c, d, job)
            )

            buffer.seek(0)
            logger.info(f"SOE report generated successfully for Job ID: {job_id}")
            return buffer

        except Job.DoesNotExist:
            logger.error(f"Job not found: {job_id}")
            raise
        except Exception as e:
            logger.error(f"Error generating SOE report: {str(e)}")
            raise

    @staticmethod
    def _add_header_footer(canvas_obj: canvas.Canvas, doc, job: Job):
        """Add header and footer to each page."""
        canvas_obj.saveState()

        width, height = A4
        page_num = canvas_obj.getPageNumber()

        # Header
        SOEReportService._draw_header(canvas_obj, width, height, job, page_num)

        # Footer
        SOEReportService._draw_footer(canvas_obj, width, height, job, page_num)

        canvas_obj.restoreState()

    @staticmethod
    def _draw_header(canvas_obj: canvas.Canvas, width: float, height: float, job: Job, page_num: int):
        """Draw the header section matching SOE template style."""
        from reportlab.platypus import Table, TableStyle

        # Get survey date (use job created date or first run date)
        survey_date = job.created_at.strftime('%d-%b-%Y') if job.created_at else datetime.now().strftime('%d-%b-%Y')

        # Header table data (matching SOE template)
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Controlled', 'Field Services', 'External', survey_date, 'TES02-FRM-SOE01v2.1']
        ]

        # Create header table - 7.77" wide (page width 8.27" - left margin 0.25" - right margin 0.25" = 7.77")
        header_table = Table(header_data, colWidths=[0.89*inch, 1.17*inch, 0.84*inch, 1.05*inch, 3.82*inch])
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

        # Draw header table - position at 0.25" from left edge (matching pre-job report margin)
        header_table.wrapOn(canvas_obj, width - 0.5*inch, height)
        header_table.drawOn(canvas_obj, 0.25*inch, height - 1.25*inch)

        # Title table data
        title_data = [
            ['Title', 'On-Site Job Documentation', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Sequence of Events', f'{page_num} of 1', '2.0', survey_date]
        ]

        # Title table - 7.77" wide (page width 8.27" - left margin 0.25" - right margin 0.25" = 7.77")
        title_table = Table(title_data, colWidths=[1.11*inch, 4.49*inch, 0.61*inch, 0.56*inch, 1.00*inch])
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
            ('LEFTPADDING', (1, 0), (1, -1), 15),
            ('RIGHTPADDING', (0, 0), (0, -1), 5),
        ]))

        # Draw title table below header with proper spacing
        # On page 1: Header table at 1.25", title at 1.9" (matches original design)
        # On page 2+: Position title table well below header table to avoid overlap
        # In ReportLab, drawOn(canvas, x, y) places the BOTTOM edge at y-coordinate
        # From top of page: header bottom at 1.25"
        if page_num > 1:
            # Page 2+: Position title table much further down to avoid any overlap
            # Header table bottom is at height - 1.25", which is 1.25" from top
            # Position title table bottom at 1.85" from top (0.60" gap)
            title_table.wrapOn(canvas_obj, width - 0.5*inch, height)
            title_table.drawOn(canvas_obj, 0.25*inch, height - 1.85*inch)

            # Add "Sequence of Events" section header after title table
            # Title table ends at 1.85", add 0.1" gap, section header starts at 1.95"
            # Section header height is 0.25", so it ends at 2.20"
            # Content starts at 2.25" from top (topMargin)
            section_header_height = 0.25*inch
            # Position section header bottom at 2.20" from top (header spans 1.95" to 2.20")
            section_header_y = height - 2.20*inch

            # Draw section header background (red bar) - matching page 1 style with pre-job report color
            canvas_obj.setFillColor(colors.HexColor('#c23c3e'))
            canvas_obj.rect(0.25*inch, section_header_y, 7.77*inch, section_header_height, fill=1, stroke=0)

            # Draw section header text - matching page 1 style (11pt bold, left-aligned with padding)
            canvas_obj.setFillColor(colors.white)
            canvas_obj.setFont('Helvetica-Bold', 11)
            # Left padding of 8px = 0.111 inch, vertical centering
            canvas_obj.drawString(0.25*inch + 0.111*inch, section_header_y + 0.07*inch, 'Sequence of Events')
        else:
            # Page 1: Keep original position with updated margins
            title_table.wrapOn(canvas_obj, width - 0.5*inch, height)
            title_table.drawOn(canvas_obj, 0.25*inch, height - 1.9*inch)

    @staticmethod
    def _draw_footer(canvas_obj: canvas.Canvas, width: float, height: float, job: Job, page_num: int):
        """Draw footer matching SOE template style."""
        well = job.well if hasattr(job, 'well') and job.well else None
        rig = job.rig if hasattr(job, 'rig') and job.rig else None

        # Footer position - 0.9" from bottom (well within printer's printable area)
        footer_y = 0.9 * inch

        # Footer text (left side) - aligned with left margin (matching pre-job report)
        canvas_obj.setFillColor(colors.black)
        canvas_obj.setFont('Helvetica', 9)
        well_name = well.well_name if well else "N/A"
        rig_number = rig.rig_number if rig else "N/A"
        canvas_obj.drawString(0.25*inch, footer_y, f"{job.job_number} / {well_name} / {rig_number}")

        # Page number (right side) in red - aligned with right margin (matching pre-job report)
        canvas_obj.setFillColor(colors.HexColor('#c23c3e'))
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.drawRightString(width - 0.25*inch, footer_y, f"P a g e | {page_num}")

    @staticmethod
    def _create_section_header(text: str, width: float = 7.77*inch) -> Table:
        """Create a styled section header - 7.77" wide (page width 8.27" - left margin 0.25" - right margin 0.25")."""
        data = [[Paragraph(f'<b><font color="white" size="11">{text}</font></b>', getSampleStyleSheet()['Normal'])]]
        table = Table(data, colWidths=[width])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), SOEReportService.RED_HEADER),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ]))
        return table

    @staticmethod
    def _create_page_content(job: Job) -> List:
        """Create page content: Job Details and Sequence of Events."""
        story = []
        well = job.well if hasattr(job, 'well') and job.well else None
        rig = job.rig if hasattr(job, 'rig') and job.rig else None

        # Job Details Header with spacer for gap after title table on page 1
        story.append(Spacer(1, 0.1*inch))  # Gap between title table and Job Details
        story.append(SOEReportService._create_section_header('Job Details'))
        story.append(Spacer(1, 0.05*inch))

        # Job information table - simplified 2x2 layout matching template
        survey_date_str = job.created_at.strftime('%B %d, %Y') if job.created_at else 'N/A'

        job_data = [
            ['Job # Reference', job.job_number, 'Date of Survey', survey_date_str],
            ['Well Name', well.well_name if well else 'N/A', 'Rig #', rig.rig_number if rig else 'N/A']
        ]
        # Job table - 7.77" wide (page width 8.27" - left margin 0.25" - right margin 0.25" = 7.77")
        job_table = Table(job_data, colWidths=[1.55*inch, 2.04*inch, 1.55*inch, 2.63*inch])
        job_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), SOEReportService.LIGHT_GRAY),
            ('BACKGROUND', (2, 0), (2, -1), SOEReportService.LIGHT_GRAY),
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 8),
            ('FONT', (0, 0), (0, -1), 'Helvetica-Bold', 8),
            ('FONT', (2, 0), (2, -1), 'Helvetica-Bold', 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(job_table)
        story.append(Spacer(1, 0.08*inch))

        # Type of Service
        # Determine service type based on job data
        service_type = "Gyroscopic Multishot Survey – High Angle"
        if job.service and hasattr(job.service, 'service_name'):
            service_type = job.service.service_name

        service_text = f'<font color="{SOEReportService.RED_HEADER.hexval()}" size="10"><b>Type of Service Performed: {service_type}</b></font>'
        story.append(Paragraph(service_text, getSampleStyleSheet()['Normal']))
        story.append(Spacer(1, 0.08*inch))

        # Sequence of Events Header
        story.append(SOEReportService._create_section_header('Sequence of Events'))
        story.append(Spacer(1, 0.05*inch))

        # Collect all activity logs for this job and its runs
        activities = SOEReportService._get_job_activities(job)

        # Create SOE table
        soe_header = [['Date', 'Time', 'Duration\n(mins)', 'Task Description', 'Assigned']]
        soe_data = []

        for activity in activities:
            date_str = activity['timestamp'].strftime('%Y-%m-%d') if activity['timestamp'] else ''
            time_str = activity['timestamp'].strftime('%H:%M:%S') if activity['timestamp'] else ''
            duration = activity.get('duration', '')
            description = activity.get('description', '')
            assigned = activity.get('user', '')

            soe_data.append([date_str, time_str, duration, description, assigned])

        full_soe_data = soe_header + soe_data

        # SOE table - 7.77" wide (page width 8.27" - left margin 0.25" - right margin 0.25" = 7.77")
        # repeatRows=1 ensures the header row is repeated on each page
        soe_table = Table(full_soe_data, colWidths=[1.07*inch, 1.07*inch, 0.84*inch, 3.82*inch, 0.97*inch], repeatRows=1)
        soe_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), SOEReportService.GRAY_HEADER),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 8),
            ('FONT', (0, 1), (-1, -1), 'Helvetica', 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            # Task Description column should be left-aligned
            ('ALIGN', (3, 1), (3, -1), 'LEFT'),
        ]))
        story.append(soe_table)

        return story

    @staticmethod
    def _get_job_activities(job: Job) -> List[Dict[str, Any]]:
        """
        Get all activities related to this job.
        Collects activities from job and all its runs.
        """
        from survey_api.models import RunActivityLog

        activities = []

        # Get job creation activity
        activities.append({
            'timestamp': job.created_at,
            'duration': '',
            'description': f'Job Created: {job.job_number}',
            'user': job.user.username if hasattr(job, 'user') and job.user else 'System'
        })

        # Get all runs for this job
        runs = job.runs.all().order_by('created_at')

        for run in runs:
            # Run creation
            activities.append({
                'timestamp': run.created_at,
                'duration': '',
                'description': f'Run Created: {run.run_number} - {run.run_name}',
                'user': run.user.username if hasattr(run, 'user') and run.user else 'System'
            })

            # Survey file uploads
            survey_files = run.survey_files.all().order_by('created_at')
            for sf in survey_files:
                activities.append({
                    'timestamp': sf.created_at,
                    'duration': '',
                    'description': f'Survey Uploaded: {sf.file_name} ({sf.survey_type})',
                    'user': run.user.username if hasattr(run, 'user') and run.user else 'System'
                })

                # Survey calculation
                if sf.processing_status == 'completed':
                    activities.append({
                        'timestamp': sf.created_at,
                        'duration': '',
                        'description': f'Survey Calculated: {sf.file_name}',
                        'user': 'System'
                    })

            # Get activity logs for this run
            activity_logs = RunActivityLog.objects.filter(run=run).order_by('created_at')
            for log in activity_logs:
                activities.append({
                    'timestamp': log.created_at,
                    'duration': '',
                    'description': log.description,
                    'user': log.user.username if log.user else 'System'
                })

        # Sort all activities by timestamp
        activities.sort(key=lambda x: x['timestamp'] if x['timestamp'] else datetime.min)

        # Calculate durations (time difference between consecutive activities)
        for i in range(len(activities)):
            if i > 0 and activities[i]['timestamp'] and activities[i-1]['timestamp']:
                # Calculate time difference
                time_diff = activities[i]['timestamp'] - activities[i-1]['timestamp']
                duration_minutes = time_diff.total_seconds() / 60

                if duration_minutes < 1:
                    # Less than 1 minute - show in seconds
                    activities[i]['duration'] = f"{int(time_diff.total_seconds())}s"
                elif duration_minutes < 60:
                    # Less than 60 mins - show with 1 decimal
                    activities[i]['duration'] = f"{duration_minutes:.1f}"
                elif duration_minutes < 1440:  # Less than 24 hours
                    # Show in hours
                    duration_hours = duration_minutes / 60
                    if duration_hours < 10:
                        activities[i]['duration'] = f"{duration_hours:.1f}h"
                    else:
                        activities[i]['duration'] = f"{int(duration_hours)}h"
                else:
                    # 24+ hours - show in days
                    duration_days = duration_minutes / 1440
                    activities[i]['duration'] = f"{duration_days:.1f}d"

        return activities
