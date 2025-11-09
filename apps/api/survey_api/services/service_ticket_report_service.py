"""
Service Ticket Report Generation Service.

Generates PDF reports for service tickets based on TES02-FRM-ST02v2.0 template.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from survey_api.models import Run


class ServiceTicketReportService:
    """Service for generating Service Ticket PDF reports."""

    @staticmethod
    def generate_service_ticket(run: Run) -> io.BytesIO:
        """
        Generate a service ticket PDF for a given run.

        Args:
            run: Run object to generate service ticket for

        Returns:
            BytesIO buffer containing the PDF
        """
        try:
            # Create PDF buffer
            buffer = io.BytesIO()

            # Create PDF document with equal margins
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=0.25*inch,
                leftMargin=0.25*inch,
                topMargin=0.25*inch,
                bottomMargin=0.25*inch
            )

            # Build report content
            story = []

            # Add header and title tables at the top
            story.extend(ServiceTicketReportService._create_header_title_tables(run))
            story.append(Spacer(1, 0.05*inch))

            # Add content sections with minimal spacing
            story.extend(ServiceTicketReportService._create_job_details_section(run))
            story.append(Spacer(1, 0.02*inch))  # Minimal spacing

            story.append(ServiceTicketReportService._create_service_type_section(run))
            story.append(Spacer(1, 0.02*inch))  # Minimal spacing

            story.extend(ServiceTicketReportService._create_crew_details_section(run))
            story.append(Spacer(1, 0.1*inch))  # Gap between Job Description and Equipment

            story.extend(ServiceTicketReportService._create_equipment_section(run))
            story.append(Spacer(1, 0.1*inch))  # Gap between Equipment and Run Details

            story.append(ServiceTicketReportService._create_run_survey_details_section(run))

            # Build PDF with custom header/footer
            doc.build(
                story,
                onFirstPage=lambda c, d: ServiceTicketReportService._add_header_footer(c, d, run),
                onLaterPages=lambda c, d: ServiceTicketReportService._add_header_footer(c, d, run)
            )

            buffer.seek(0)
            return buffer

        except Exception as e:
            print(f"Error generating service ticket: {str(e)}")
            raise

    @staticmethod
    def _add_header_footer(canvas_obj: canvas.Canvas, doc, run: Run):
        """Add header and footer to each page."""
        canvas_obj.saveState()

        width, height = A4
        page_num = canvas_obj.getPageNumber()

        # Draw header
        ServiceTicketReportService._draw_header(canvas_obj, width, height, run, page_num)

        # Draw footer
        ServiceTicketReportService._draw_footer(canvas_obj, width, height, run, page_num)

        canvas_obj.restoreState()

    @staticmethod
    def _draw_header(canvas_obj: canvas.Canvas, width: float, height: float, run: Run, page_num: int):
        """Draw header matching Service Ticket template style."""
        # Header and title tables now part of story content for uniform margins
        pass

    @staticmethod
    def _draw_footer(canvas_obj: canvas.Canvas, width: float, height: float, run: Run, page_num: int):
        """Draw footer matching Service Ticket template style."""
        well = run.well if hasattr(run, 'well') and run.well else None
        job = run.job if hasattr(run, 'job') and run.job else None

        # Footer text
        canvas_obj.setFillColor(colors.black)
        canvas_obj.setFont('Helvetica', 9)
        well_name = well.well_name if well else "N/A"
        job_number = job.job_number if job else "N/A"
        rig_number = job.rig.rig_number if job and job.rig else "N/A"

        footer_text = f"{job_number} / {well_name} / {rig_number}"
        canvas_obj.drawString(0.25*inch, 0.25*inch, footer_text)

        # Page number (right side)
        canvas_obj.setFillColor(colors.HexColor('#C00000'))
        canvas_obj.setFont('Helvetica-Bold', 10)
        canvas_obj.drawRightString(width - 0.25*inch, 0.25*inch, f'P a g e | {page_num}')

    @staticmethod
    def _create_section_header(text: str, background_color='#C00000'):
        """Create a section header with red/grey gradient style using Table for perfect alignment."""
        header_data = [[text]]
        header_table = Table(header_data, colWidths=[7.77*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(background_color)),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        return header_table

    @staticmethod
    def _create_header_title_tables(run: Run):
        """Create header and title tables for document top."""
        survey_date = run.created_at.strftime('%d-%b-%Y') if run.created_at else datetime.now().strftime('%d-%b-%Y')

        # Header info table
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Controlled', 'Field Services', 'External', '10-May-2019', 'TES02-FRM-ST02v2.0']
        ]

        header_table = Table(header_data, colWidths=[1.05*inch, 1.28*inch, 0.93*inch, 1.17*inch, 3.34*inch])
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

        # Title table
        title_data = [
            ['Title', 'On-Site Job Documentation', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Service Ticket', '1 of 1', '2.0', survey_date]
        ]

        title_table = Table(title_data, colWidths=[1.17*inch, 4.67*inch, 0.7*inch, 0.58*inch, 0.65*inch])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('BACKGROUND', (2, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (1, 0), (1, -1), 15),
        ]))

        return [header_table, Spacer(1, 0.02*inch), title_table]

    @staticmethod
    def _create_job_details_section(run: Run):
        """Create Job Details section."""
        well = run.well if hasattr(run, 'well') and run.well else None
        job = run.job if hasattr(run, 'job') and run.job else None
        location = run.location if hasattr(run, 'location') and run.location else None
        depth = run.depth if hasattr(run, 'depth') and run.depth else None
        tieon = run.tieon if hasattr(run, 'tieon') and run.tieon else None

        customer = job.customer.customer_name if job and job.customer else "N/A"
        well_name = well.well_name if well else "N/A"
        well_location = well.well_name if well else "N/A"  # Using well_name as location
        well_id = well.well_id if well else "N/A"
        job_ref = job.job_number if job else "N/A"
        rig_number = job.rig.rig_number if job and job.rig else "N/A"

        # Get hole section from tieon.hole_section_master
        hole_section = "N/A"
        if tieon and hasattr(tieon, 'hole_section_master') and tieon.hole_section_master:
            hole_section = tieon.hole_section_master.hole_section_name

        survey_date = run.created_at.strftime('%B %d, %Y') if run.created_at else "N/A"

        # Job Details header
        header = ServiceTicketReportService._create_section_header('Job Details')

        # Job details table
        data = [
            ['Customer', customer, 'Job # Reference', job_ref],
            ['Well Name', well_name, 'Rig #', rig_number],
            ['Well Location', well_location, 'Hole Section', hole_section],
            ['Well ID', well_id, 'Date of Survey', survey_date],
        ]

        table = Table(data, colWidths=[1.4*inch, 2.67*inch, 1.52*inch, 2.18*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#A6A6A6')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#A6A6A6')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),  # Reduced font size
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),  # Minimal padding
        ]))

        # Return as list of elements for proper spacing
        return [header, Spacer(1, 0.05*inch), table]

    @staticmethod
    def _create_service_type_section(run: Run):
        """Create Type of Service Performed section."""
        # Get service type from run or use default
        service_type = "Gyroscopic Multishot Survey – High Angle"  # Default, could be made dynamic

        style = ParagraphStyle(
            'ServiceType',
            fontName='Helvetica-Bold',
            fontSize=10,  # Further reduced font size
            textColor=colors.HexColor('#C00000'),
            alignment=1,  # Center
            spaceAfter=0,  # No extra spacing
            spaceBefore=0,  # No extra spacing
        )

        text = f"Type of Service Performed:{service_type}"
        paragraph = Paragraph(text, style)

        # Wrap in table with same width as other sections for consistent alignment
        return Table([[paragraph]], colWidths=[8.77*inch])

    @staticmethod
    def _create_crew_details_section(run: Run):
        """Create On Site Crew Details section."""
        header = ServiceTicketReportService._create_section_header('On Site Crew Details')

        # Crew details table - using placeholder data
        crew_data = [
            ['#', 'Job Description', 'Name', 'Arrived on Location', '', 'Departed from Location', '', 'Total Days'],
            ['', '', '', 'Date', 'Time', 'Date', 'Time', ''],
        ]

        # Add placeholder rows
        for i in range(1, 5):
            crew_data.append([str(i), '', '', '', '', '', '', ''])

        table = Table(crew_data, colWidths=[0.42*inch, 1.55*inch, 1.55*inch, 1.04*inch, 0.83*inch, 1.04*inch, 0.83*inch, 0.51*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 1), colors.white),
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),  # Reduced font size
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('SPAN', (3, 0), (4, 0)),  # Merge Arrived on Location
            ('SPAN', (5, 0), (6, 0)),  # Merge Departed from Location
        ]))

        # Return as list of elements for proper spacing
        return [header, Spacer(1, 0.05*inch), table]

    @staticmethod
    def _create_equipment_section(run: Run):
        """Create Equipment Details & Rental Information section."""
        header = ServiceTicketReportService._create_section_header('Equipment Details & Rental Information')

        # Equipment info - styled like Job Details table
        equip_info = [
            ['Wireline Unit #', '', 'GyroFlex Tool Serial #', ''],
            ['Pick-up / Secondary Vehicle #', '', 'Wireline CIU #', ''],
            ['UBHO Serial #', '', 'Pump Down Kit #', ''],
        ]

        equip_table = Table(equip_info, colWidths=[2.07*inch, 1.82*inch, 2.07*inch, 1.81*inch])
        equip_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#A6A6A6')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#A6A6A6')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),  # Reduced font size
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('LEFTPADDING', (0, 0), (-1, -1), 4),  # Minimal padding
        ]))

        # Equipment rental table
        rental_data = [
            ['#', 'Equipment', 'Size & Specification', 'Arrived on Location', '', 'Departed from Location', '', 'Total Days'],
            ['', '', '', 'Date', 'Time', 'Date', 'Time', ''],
            ['1', '', '', '', '', '', '', ''],
        ]

        rental_table = Table(rental_data, colWidths=[0.42*inch, 1.24*inch, 1.86*inch, 1.04*inch, 0.83*inch, 1.04*inch, 0.83*inch, 0.51*inch])
        rental_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 1), colors.white),
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),  # Reduced font size
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),  # Minimal padding
            ('SPAN', (3, 0), (4, 0)),
            ('SPAN', (5, 0), (6, 0)),
        ]))

        # Return as list of elements for proper spacing
        return [header, Spacer(1, 0.05*inch), equip_table, Spacer(1, 0.1*inch), rental_table]

    @staticmethod
    def _create_run_survey_details_section(run: Run):
        """Create Run Details, Survey Details, and Comments & Authorization sections matching reference PDF layout."""
        depth = run.depth if hasattr(run, 'depth') and run.depth else None
        tieon = run.tieon if hasattr(run, 'tieon') and run.tieon else None

        # Run Details Header
        run_header_data = [['Run Details']]
        run_header = Table(run_header_data, colWidths=[3.64*inch])
        run_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Get well type from tieon
        well_type = tieon.well_type if tieon and tieon.well_type else "N/A"

        # Get hole section from tieon.hole_section_master
        hole_section = "N/A"
        if tieon and hasattr(tieon, 'hole_section_master') and tieon.hole_section_master:
            hole_section = tieon.hole_section_master.hole_section_name

        bottom_temp = "60°C"  # Standard bottom hole temperature

        # Get survey performed in from tieon.survey_run_in
        survey_performed_in = "N/A"
        if tieon and hasattr(tieon, 'survey_run_in') and tieon.survey_run_in:
            survey_performed_in = tieon.survey_run_in.run_in_name

        no_of_runs = "1"  # Default
        npt = "No"  # Default

        run_data = [
            ['Well Type', well_type],
            ['Hole Section', hole_section],
            ['Bottom Hole Temp', bottom_temp],
            ['Survey Performed in', survey_performed_in],
            ['No. of Runs', no_of_runs],
            ['NPT', npt],
        ]

        run_table = Table(run_data, colWidths=[1.56*inch, 2.08*inch])
        run_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        # Survey Details Header
        survey_header_data = [['Survey Details']]
        survey_header = Table(survey_header_data, colWidths=[4.13*inch])
        survey_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Get survey depths and meterage from tieon
        start_depth = f"{tieon.survey_interval_from:.2f} m" if tieon and tieon.survey_interval_from is not None else "0 m"
        end_depth = f"{tieon.survey_interval_to:.2f} m" if tieon and tieon.survey_interval_to is not None else "N/A"

        # Calculate or get meterage
        if tieon and tieon.survey_interval_length is not None:
            meterage = f"{tieon.survey_interval_length:.2f} m"
        elif tieon and tieon.survey_interval_from is not None and tieon.survey_interval_to is not None:
            meterage = f"{(tieon.survey_interval_to - tieon.survey_interval_from):.2f} m"
        else:
            meterage = "N/A"

        # Get closure distance and direction from calculated survey data (last MD point)
        closure_distance_str = "m"
        closure_direction_str = "°"
        max_inclination_str = "°"

        try:
            # Get primary survey file
            primary_survey_file = run.survey_files.filter(survey_role='primary').first()
            if primary_survey_file and hasattr(primary_survey_file, 'survey_data'):
                survey_data_obj = primary_survey_file.survey_data
                if hasattr(survey_data_obj, 'calculated_survey'):
                    calculated_survey = survey_data_obj.calculated_survey

                    # Get last closure distance value
                    if calculated_survey.closure_distance and len(calculated_survey.closure_distance) > 0:
                        closure_distance_value = calculated_survey.closure_distance[-1]
                        closure_distance_str = f"{closure_distance_value:.2f} m"

                    # Get last closure direction value
                    if calculated_survey.closure_direction and len(calculated_survey.closure_direction) > 0:
                        closure_direction_value = calculated_survey.closure_direction[-1]
                        closure_direction_str = f"{closure_direction_value:.2f}°"

                    # Get maximum inclination from inc_data
                    if survey_data_obj.inc_data and len(survey_data_obj.inc_data) > 0:
                        max_inc = max(survey_data_obj.inc_data)
                        max_inclination_str = f"{max_inc:.2f}°"
        except Exception as e:
            # If any error occurs, just use default values
            print(f"Error getting closure values: {str(e)}")

        survey_data = [
            ['Survey Start Depth', start_depth],
            ['Survey End Depth', end_depth],
            ['Survey Meterage', meterage],
            ['Maximum Inclination', max_inclination_str],
            ['Closure Distance', closure_distance_str],
            ['Closure Direction', closure_direction_str],
        ]

        survey_table = Table(survey_data, colWidths=[1.65*inch, 2.48*inch])
        survey_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))

        # Comments & Authorization Header
        comments_header_data = [['Comments & Authorization']]
        comments_header = Table(comments_header_data, colWidths=[4.13*inch])
        comments_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))

        # Comments & Authorization content
        comments_content = [
            [''],
            [''],
            [''],
            ['TASK – Target Representative'],
            [''],
            [''],
            [''],
            [''],
            ['Client Representative – Sign & Stamp'],
        ]

        comments_table = Table(comments_content, colWidths=[4.13*inch], rowHeights=[0.3*inch] * 9)
        comments_table.setStyle(TableStyle([
            ('FONTNAME', (0, 3), (0, 3), 'Helvetica-Bold'),
            ('FONTNAME', (0, 8), (0, 8), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 3), (0, 3), 'BOTTOM'),
            ('VALIGN', (0, 8), (0, 8), 'BOTTOM'),
            ('LINEABOVE', (0, 3), (-1, 3), 1, colors.black),
            ('LINEABOVE', (0, 8), (-1, 8), 1, colors.black),
        ]))

        # Build left section (Run Details + Survey Details stacked)
        left_section = [
            [run_header],
            [run_table],
            [Spacer(1, 0.1*inch)],
            [survey_header],
            [survey_table],
        ]

        left_table = Table(left_section, colWidths=[3.64*inch])
        left_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        # Build right section (Comments & Authorization full height)
        right_section = [
            [comments_header],
            [comments_table],
        ]

        right_table = Table(right_section, colWidths=[4.13*inch])
        right_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        # Combine left and right with proper alignment
        combined_table = Table([[left_table, right_table]], colWidths=[3.64*inch, 4.13*inch])
        combined_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        return combined_table
