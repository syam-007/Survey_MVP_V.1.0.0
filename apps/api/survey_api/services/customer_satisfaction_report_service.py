"""
Customer Satisfaction Report Generation Service.

Generates PDF reports for customer satisfaction based on TES04-FRM-CSR01v2.0 template.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

from survey_api.models import Run


class CustomerSatisfactionReportService:
    """Service for generating Customer Satisfaction PDF reports."""

    @staticmethod
    def generate_customer_satisfaction_report(run: Run) -> io.BytesIO:
        """
        Generate a customer satisfaction report PDF for a given run.

        Args:
            run: Run object to generate report for

        Returns:
            BytesIO buffer containing the PDF
        """
        try:
            # Create PDF buffer
            buffer = io.BytesIO()

            # Create PDF document with equal margins matching prejob report
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=0.25*inch,
                leftMargin=0.25*inch,
                topMargin=0.2*inch,
                bottomMargin=0.25*inch
            )

            # Build report content
            story = []

            # Add header tables (Type and Title) at the top
            story.append(CustomerSatisfactionReportService._create_header_table())
            story.append(Spacer(1, 0.05*inch))

            story.append(CustomerSatisfactionReportService._create_title_table())
            story.append(Spacer(1, 0.1*inch))

            # Add content sections
            story.extend(CustomerSatisfactionReportService._create_job_details_section(run))
            story.append(Spacer(1, 0.01*inch))

            story.append(CustomerSatisfactionReportService._create_service_type_section(run))
            story.append(Spacer(1, 0.02*inch))

            story.extend(CustomerSatisfactionReportService._create_job_objective_section(run))
            story.append(Spacer(1, 0.01*inch))

            story.append(CustomerSatisfactionReportService._create_yes_no_questions_section())
            story.append(Spacer(1, 0.02*inch))

            story.extend(CustomerSatisfactionReportService._create_performance_evaluation_section())
            story.append(Spacer(1, 0.02*inch))

            story.extend(CustomerSatisfactionReportService._create_remarks_section())
            story.append(Spacer(1, 0.02*inch))

            story.append(CustomerSatisfactionReportService._create_signature_section())

            # Build PDF with custom footer only
            doc.build(
                story,
                onFirstPage=lambda c, d: CustomerSatisfactionReportService._add_footer(c, d, run),
                onLaterPages=lambda c, d: CustomerSatisfactionReportService._add_footer(c, d, run)
            )

            buffer.seek(0)
            return buffer

        except Exception as e:
            print(f"Error generating customer satisfaction report: {str(e)}")
            raise

    @staticmethod
    def _create_header_table():
        """Create the header Type table matching prejob report style."""
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Controlled', 'Quality Control', 'External', '10-May-2019', 'TES04-FRM-CSR01v2.0']
        ]

        header_table = Table(header_data, colWidths=[1.17*inch, 1.52*inch, 1.17*inch, 1.29*inch, 2.62*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 8),
            ('FONTSIZE', (0, 1), (-1, 1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        return header_table

    @staticmethod
    def _create_title_table():
        """Create the title table matching prejob report style."""
        title_data = [
            ['Title', 'CRM Forms', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Customer Satisfaction Review', '1 of 1', '2.0', '03-Aug-2022']
        ]

        title_table = Table(title_data, colWidths=[1.17*inch, 4.09*inch, 0.82*inch, 0.58*inch, 1.11*inch])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('BACKGROUND', (2, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        return title_table

    @staticmethod
    def _add_footer(canvas_obj: canvas.Canvas, doc, run: Run):
        """Add footer to each page."""
        canvas_obj.saveState()

        width, height = A4
        page_num = canvas_obj.getPageNumber()

        # Draw footer with job reference and page number
        job = run.job if hasattr(run, 'job') and run.job else None
        well = run.well if hasattr(run, 'well') and run.well else None

        job_ref = job.job_number if job else ""
        well_name = well.well_name if well else ""

        # Safely get rig number
        rig_number = ""
        if job and hasattr(job, 'rig'):
            try:
                rig_number = job.rig.rig_number if job.rig else ""
            except:
                rig_number = ""

        footer_text = f"{job_ref} / {well_name} / {rig_number}"

        # Draw footer text
        canvas_obj.setFont('Helvetica', 10)
        canvas_obj.drawString(3*inch, 0.25*inch, footer_text)

        # Draw page number
        canvas_obj.setFillColor(colors.HexColor('#C00000'))
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.drawRightString(width - 0.25*inch, 0.25*inch, f"P a g e | {page_num}")

        canvas_obj.restoreState()

    @staticmethod
    def _create_section_header(text: str):
        """Create a section header with left-aligned text and red background."""
        # Single cell table with full width
        header_data = [[text]]
        header_table = Table(header_data, colWidths=[7.77*inch])
        header_table.setStyle(TableStyle([
            # Red background
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (0, 0), 10),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('VALIGN', (0, 0), (0, 0), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 6),
            ('TOPPADDING', (0, 0), (0, 0), 3),
            ('BOTTOMPADDING', (0, 0), (0, 0), 3),
        ]))
        return header_table

    @staticmethod
    def _create_job_details_section(run: Run):
        """Create Job Details section."""
        well = run.well if hasattr(run, 'well') and run.well else None
        job = run.job if hasattr(run, 'job') and run.job else None

        # Safely get customer name
        customer = ""
        if job and hasattr(job, 'customer'):
            try:
                customer = job.customer.customer_name if job.customer else ""
            except:
                customer = ""

        well_name = well.well_name if well else ""
        well_location = getattr(well, 'field_name', '') or ""
        job_ref = job.job_number if job else ""

        # Safely get rig number
        rig_number = ""
        if job and hasattr(job, 'rig'):
            try:
                rig_number = job.rig.rig_number if job.rig else ""
            except:
                rig_number = ""

        survey_date = run.created_at.strftime('%B %d, %Y') if run.created_at else ""

        # Job Details header
        header = CustomerSatisfactionReportService._create_section_header('Job Details')

        # Job details table
        data = [
            ['Customer', customer, 'Job # Reference', job_ref],
            ['Well Name', well_name, 'Rig #', rig_number],
            ['Well Location', well_location, 'Date of Survey', survey_date],
        ]

        table = Table(data, colWidths=[1.29*inch, 2.57*inch, 1.4*inch, 2.51*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))

        return [header, Spacer(1, 0.05*inch), table]

    @staticmethod
    def _create_service_type_section(run: Run):
        """Create Type of Service Performed section matching prejob report style."""
        # Get service from job if available
        job = run.job if hasattr(run, 'job') and run.job else None
        service_type = job.service.service_name if job and job.service else "Gyroscopic Multishot Survey – High Angle"

        # Create table matching prejob report style
        service_data = [['Type of Service Performed:', service_type]]
        service_table = Table(service_data, colWidths=[2.34*inch, 5.43*inch])
        service_table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return service_table

    @staticmethod
    def _create_job_objective_section(run: Run):
        """Create Job Objective & Evaluation section."""
        header = CustomerSatisfactionReportService._create_section_header('Job Objective & Evaluation')

        # Job objective text
        objective_text = "To provide an accurate gyroscopic survey for the forementioned well with high operational efficiency."

        style = ParagraphStyle(
            'Objective',
            fontName='Helvetica',
            fontSize=9,
            alignment=TA_LEFT,
            spaceAfter=3,
            spaceBefore=3,
            leftIndent=0,
        )

        objective_para = Paragraph(objective_text, style)

        # Wrap paragraph in table to ensure alignment with other tables
        objective_table = Table([[objective_para]], colWidths=[7.77*inch])
        objective_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        return [header, objective_table]

    @staticmethod
    def _create_yes_no_questions_section():
        """Create the Yes/No questions section."""
        # Create the three question rows
        questions_data = [
            ['HSE Related Issues', 'NO', 'YES', 'if Yes, please describe…', ''],
            ['Service Quality\nRelated Issues', 'NO', 'YES', 'if Yes, please describe…', ''],
            ['Non-Productive time', 'NO', 'YES', 'if Yes, Number of NPT hours', 'hrs.'],
        ]

        questions_table = Table(questions_data, colWidths=[1.29*inch, 0.58*inch, 0.58*inch, 3.74*inch, 1.58*inch])
        questions_table.setStyle(TableStyle([
            # Font
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-BoldOblique'),
            ('FONTNAME', (1, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            # NO boxes - Green background
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#92D050')),
            ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#92D050')),
            ('BACKGROUND', (1, 2), (1, 2), colors.HexColor('#92D050')),
            # YES boxes - Red background
            ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#C00000')),
            ('BACKGROUND', (2, 1), (2, 1), colors.HexColor('#C00000')),
            ('BACKGROUND', (2, 2), (2, 2), colors.HexColor('#C00000')),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.white),
            # Description text - italic
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Oblique'),
            ('TEXTCOLOR', (3, 0), (3, -1), colors.HexColor('#C00000')),
            # Alignment
            ('ALIGN', (1, 0), (2, -1), 'CENTER'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (3, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))

        return questions_table

    @staticmethod
    def _create_performance_evaluation_section():
        """Create Performance Evaluation section with ratings table."""
        header = CustomerSatisfactionReportService._create_section_header('Performance Evaluation')

        # Description paragraph
        desc_text = "Dear Customer, please help us serve you more efficiently by completing the below performance survey, given the difficulty of job. TASK-Target is very interested to understand its strengths and weakness and/or what important recommendations that you would give to improve TASK-Target service and customer satisfaction."

        desc_style = ParagraphStyle(
            'Description',
            fontName='Helvetica-Oblique',
            fontSize=8,
            textColor=colors.HexColor('#c23c3e'),
            alignment=TA_LEFT,
            spaceAfter=3,
            spaceBefore=3,
            leftIndent=0,
        )

        desc_para = Paragraph(desc_text, desc_style)

        # Wrap paragraph in table to ensure alignment with other tables
        desc_table = Table([[desc_para]], colWidths=[7.77*inch])
        desc_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        # Ratings legend table
        ratings_data = [
            ['Ratings', 'Description'],
            ['5', 'Superior performance (Establish new Quality/Performance standards)'],
            ['4', 'Exceed Expectations (Provide more than what was required/expected)'],
            ['3', 'Met Expectation (Did what was expected)'],
            ['2', 'Below Expectations (Did not do what was expected - Recovery made)'],
            ['1', 'Poor Performance (Job problems/failures occurred & No recovery made)'],
        ]

        ratings_table = Table(ratings_data, colWidths=[0.7*inch, 7.07*inch])
        ratings_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            # Rating colors
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#00B050')),  # 5 - Green
            ('BACKGROUND', (0, 2), (0, 2), colors.HexColor('#92D050')),  # 4 - Light green
            ('BACKGROUND', (0, 3), (0, 3), colors.HexColor('#FFFF00')),  # 3 - Yellow
            ('BACKGROUND', (0, 4), (0, 4), colors.HexColor('#FFC000')),  # 2 - Orange
            ('BACKGROUND', (0, 5), (0, 5), colors.HexColor('#C00000')),  # 1 - Red
            ('TEXTCOLOR', (0, 5), (0, 5), colors.white),
            # Font
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            # Grid and alignment
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))

        # Note text
        note_style = ParagraphStyle(
            'Note',
            fontName='Helvetica-Oblique',
            fontSize=7,
            alignment=TA_RIGHT,
            spaceAfter=2,
            spaceBefore=2,
        )
        note_para = Paragraph("(Please circle / tick the appropriate quality rating)", note_style)

        # Performance rating table
        performance_data = [
            ['Category', 'Customer Satisfaction Rating (Please Circle One Rating for Each Line)', 'Quality Rating'],
            ['Personnel', 'TASK-Target Representative was competent and effective in operations?', '5', '4', '3', '2', '1'],
            ['Equipment', 'Was the Quality & Accuracy for our tools to your satisfaction?', '5', '4', '3', '2', '1'],
            ['Job Design', 'Overall services delivered timely and effectively?', '5', '4', '3', '2', '1'],
            ['Product / Material', 'TASK-Target Gyro tool reliability (Lost Time/Failures)', '5', '4', '3', '2', '1'],
            ['Health & Safety', 'Was all the HSE policies followed / HSE initiatives taken?', '5', '4', '3', '2', '1'],
            ['Timelines', 'Timely follow-up & On time delivery of the requested Services?', '5', '4', '3', '2', '1'],
            ['Customer Rating', 'Overall, Job satisfaction', '5', '4', '3', '2', '1'],
        ]

        performance_table = Table(performance_data, colWidths=[1.17*inch, 3.97*inch, 0.53*inch, 0.53*inch, 0.53*inch, 0.53*inch, 0.53*inch])
        performance_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('SPAN', (2, 0), (6, 0)),  # Merge Quality Rating cells
            # Category column
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#D0CECE')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            # Rating boxes - colored
            ('BACKGROUND', (2, 1), (2, -1), colors.HexColor('#00B050')),  # 5
            ('BACKGROUND', (3, 1), (3, -1), colors.HexColor('#92D050')),  # 4
            ('BACKGROUND', (4, 1), (4, -1), colors.HexColor('#FFFF00')),  # 3
            ('BACKGROUND', (5, 1), (5, -1), colors.HexColor('#FFC000')),  # 2
            ('BACKGROUND', (6, 1), (6, -1), colors.HexColor('#C00000')),  # 1
            ('TEXTCOLOR', (6, 1), (6, -1), colors.white),
            # Font
            ('FONTNAME', (2, 1), (6, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            # Grid and alignment
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (6, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ]))

        return [header, desc_table, ratings_table, note_para, performance_table]

    @staticmethod
    def _create_remarks_section():
        """Create Remarks & Comments section."""
        header = CustomerSatisfactionReportService._create_section_header('Remarks & Comments')

        # Two text areas
        remarks_data = [
            ['Appreciable Actions / Services', ''],
            ['Recommendations to Improve\nour Service Quality', ''],
        ]

        remarks_table = Table(remarks_data, colWidths=[2.04*inch, 5.73*inch], rowHeights=[0.3*inch, 0.3*inch])
        remarks_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-BoldOblique'),
            ('FONTSIZE', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ]))

        return [header, remarks_table]
        

    @staticmethod
    def _create_signature_section():
        """Create signature section matching reference PDF."""
        signature_data = [
            ['Customer\nRepresentative', '', 'Signature', '', '']
        ]

        signature_table = Table(signature_data, colWidths=[1.25*inch, 2.57*inch, 0.83*inch, 2.08*inch, 1.04*inch])
        signature_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (2, 0), (2, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('LINEBELOW', (1, 0), (1, 0), 1, colors.black),
            ('LINEBELOW', (3, 0), (3, 0), 1, colors.black),
            ('LINEBELOW', (4, 0), (4, 0), 1, colors.black),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        return signature_table
