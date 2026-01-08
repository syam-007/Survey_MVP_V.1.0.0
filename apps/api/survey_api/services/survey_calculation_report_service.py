"""
Survey Calculation Report Service - Generates PDF reports matching TASK template format.
Creates comprehensive survey reports with job details, geodetic location, and survey data tables.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
import logging
from reportlab.platypus import KeepTogether
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from mpl_toolkits.mplot3d import Axes3D
import numpy as np

logger = logging.getLogger(__name__)


class SurveyCalculationReportService:
    """Service for generating Survey Calculation Reports matching TASK template."""

    @staticmethod
    def _draw_footer(canvas_obj, doc, page_num, total_pages):
        """Draw footer at fixed position on all pages."""
        canvas_obj.saveState()

        page_width = A4[0]

        # Footer position - 0.9" from bottom (well within printer's printable area)
        footer_y = 0.9 * inch

        # Set font for footer text
        canvas_obj.setFont('Helvetica', 9)
        canvas_obj.setFillColor(colors.black)

        # Determine footer text based on page number
        if page_num == 1:
            footer_text = "Survey Calculation Report - Cover Page"
        elif page_num == total_pages:
            footer_text = "Survey Calculation Report - Trajectory Visualization"
        else:
            footer_text = "Survey Calculation Report - Phase 1 Analysis - Geology"

        # Draw footer text on left - aligned with left margin (0.25")
        canvas_obj.drawString(0.25*inch, footer_y, footer_text)

        # Draw page number on right in bold and red - aligned with right margin
        canvas_obj.setFont('Helvetica-Bold', 9)
        canvas_obj.setFillColor(colors.HexColor('#c23c3e'))
        canvas_obj.drawRightString(page_width - 0.25*inch, footer_y, f"Page | {page_num}")

        canvas_obj.restoreState()

    @staticmethod
    def generate_report(survey_data, calculated_survey):
        """
        Generate a complete Survey Calculation Report PDF.

        Args:
            survey_data: SurveyData model instance
            calculated_survey: CalculatedSurvey model instance with results

        Returns:
            BytesIO: PDF file as bytes
        """
        buffer = BytesIO()

        # Create the PDF with A4 size and increased bottom margin for fixed footer
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.25*inch,
            leftMargin=0.25*inch,
            topMargin=0.25*inch,
            bottomMargin=1.15*inch  # Increased to accommodate fixed footer at 0.9" from bottom  
        )

        # Container for all flowable objects
        elements = []

        # Get related data
        survey_file = survey_data.survey_file
        run = survey_file.run
        well = run.well
        job = run.job if hasattr(run, 'job') else None
        location = well.location if hasattr(well, 'location') else None

        # Page 1: Cover Page with all details
        elements.extend(SurveyCalculationReportService._create_cover_page(
            survey_data, calculated_survey, run, well, job, location
        ))

        # Add page break before data pages
        elements.append(PageBreak())

        # Pages 2+: Gyroscopic Survey Report Data Tables
        elements.extend(SurveyCalculationReportService._create_data_pages(
            survey_data, calculated_survey, run
        ))

        # Calculate total pages for footer
        # 1 cover page + data pages + 1 plots page
        rows_per_page = 35
        md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
        data_pages_count = ((len(md_data) - 1) // rows_per_page + 1) if len(md_data) > 0 else 0
        total_pages = 1 + data_pages_count + 1

        # Build the PDF with footer callback
        doc.build(
            elements,
            onFirstPage=lambda c, d: SurveyCalculationReportService._draw_footer(c, d, 1, total_pages),
            onLaterPages=lambda c, d: SurveyCalculationReportService._draw_footer(c, d, c.getPageNumber(), total_pages)
        )

        # Get the PDF content
        pdf = buffer.getvalue()
        buffer.close()
        return pdf

    @staticmethod
    def _create_cover_page(survey_data, calculated_survey, run, well, job, location, is_interpolated=False, resolution=None):
        """Create the first page with all job and survey details."""
        elements = []
        survey_file = survey_data.survey_file

        # Get survey date from file upload date
        survey_date = survey_file.created_at.strftime('%d-%b-%Y') if hasattr(survey_file, 'created_at') and survey_file.created_at else datetime.now().strftime('%d-%b-%Y')
        # ===== Get TieOn Data Dynamically =====
        tieon_data = None
        hole_section = '4 1/2 "'
        minimum_id = '2"'
        survey_performed_in = '4" Drillpipe'
        well_type = 'Vertical'
        
        # Try to get tieon from run
        if run and hasattr(run, 'tieon'):
            try:
                tieon_data = run.tieon
                if tieon_data:
                    # Get hole section from master data
                    if tieon_data.hole_section_master:
                        hole_section = tieon_data.hole_section_master.hole_section_name
                    
                    # Get minimum ID from master data
                    if tieon_data.minimum_id:
                        minimum_id = tieon_data.minimum_id.minimum_id_name
                    
                    # Get survey run-in from master data
                    if tieon_data.survey_run_in:
                        survey_performed_in = tieon_data.survey_run_in.run_in_name
                    # Fallback to survey_run_in_type if master data not available
                    elif tieon_data.survey_run_in_type:
                        survey_performed_in = tieon_data.survey_run_in_type.replace('_', ' ').title()
                    
                    # Get well type
                    well_type = tieon_data.well_type if tieon_data.well_type else 'Vertical'
                    
            except Exception as e:
                logger.warning(f"Error accessing tieon data: {str(e)}")

        depth_ref = None
    
        # Try to get depth from run first
        if run:
            try:
                depth_ref = run.depth  # This might be None if not set
            except:
                depth_ref = None
        
        # If not found on run, try well
        if not depth_ref and well:
            try:
                depth_ref = well.depth  # This might be None if not set
            except:
                depth_ref = None
        
        # Set dynamic values with fallbacks
        if depth_ref:
            elevation_referred = depth_ref.elevation_reference if depth_ref.elevation_reference else 'Mean Sea Level (MSL)'
            reference_datum = depth_ref.reference_datum if depth_ref.reference_datum else 'RKB/DFE (Drill Floor Elevation)'
            
            # Format numeric values with units
            reference_height = f"{float(depth_ref.reference_height):.3f} m" if depth_ref.reference_height is not None else '0.000 m'
            reference_elevation = f"{float(depth_ref.reference_elevation):.3f} m" if depth_ref.reference_elevation is not None else '0.000 m'
        else:
            # Fallback values if no depth record exists
            elevation_referred = 'Mean Sea Level (MSL)'
            reference_datum = 'RKB/DFE (Drill Floor Elevation)'
            reference_height = '0.000 m'
            reference_elevation = '0.000 m'

        # Header table
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Survey', 'OPS', 'External', survey_date, 'TT-OPS-FRM-004']
        ]

        header_table = Table(header_data, colWidths=[0.88*inch, 1.14*inch, 0.88*inch, 1.04*inch, 3.83*inch])
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
        elements.append(header_table)
        elements.append(Spacer(1, 0.03*inch))

        # Title table
        title_data = [
            ['Title', 'Survey Calculation Report', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Surveys', '1 of 1', 'A', survey_date]
        ]

        title_table = Table(title_data, colWidths=[0.88*inch, 4.82*inch, 0.62*inch, 0.52*inch, 0.93*inch])
        title_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('BACKGROUND', (2, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (2, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(title_table)
        elements.append(Spacer(1, 0.05*inch))

        # Job Details Header
        job_header = Table([['Job Details']], colWidths=[7.77*inch])
        job_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(job_header)
        elements.append(Spacer(1, 0.05*inch))

        # Job Details Content
        # Use survey file upload date for "Date of Survey"
        survey_upload_date = survey_file.created_at.strftime('%B %d, %Y') if hasattr(survey_file, 'created_at') and survey_file.created_at else ''

        job_data = [
            ['Job # Reference', job.job_number if job else '', 'Date of Survey', survey_upload_date],
            ['Well Name', well.well_name if well else '', 'Rig #', job.rig.rig_number if job and hasattr(job, 'rig') and job.rig else ''],
            ['Survey Name', run.run_name or '', '', '']
        ]

        job_table = Table(job_data, colWidths=[1.55*inch, 2.33*inch, 1.55*inch, 2.34*inch])
        job_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (2, 0), (2, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, 1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(job_table)

        # Type of Service
        service_name = job.service.service_name if job and hasattr(job, 'service') and job.service else 'Wireline Multishot'
        service_para = Paragraph(
            f'<b><font color="#c23c3e">Type of Service Performed:</font> <font color="black">{service_name}</font></b>',
            ParagraphStyle('ServiceStyle', fontName='Helvetica-Bold', fontSize=11, leftIndent=0, spaceAfter=4)
        )
        elements.append(Spacer(1, 0.05*inch))
        elements.append(service_para)
        elements.append(Spacer(1, 0.05*inch))

        # Geodetic Location & Depth Reference Header
        geo_header = Table([['Geodetic Location & Depth Reference']], colWidths=[7.77*inch])
        geo_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(geo_header)
        elements.append(Spacer(1, 0.05*inch))

        # Table 1: Well Centre Coordinates and UTM Coordinates (cleaned up structure)
        if location:
            lat_dms = f"{location.latitude_degrees or ''}° {location.latitude_minutes or ''}' {location.latitude_seconds or ''}\" N" if location.latitude_degrees is not None else ''
            lon_dms = f"{location.longitude_degrees or ''}° {location.longitude_minutes or ''}' {location.longitude_seconds or ''}\" E" if location.longitude_degrees is not None else ''
            lat_decimal = f"{location.latitude}°N" if location.latitude else ''
            lon_decimal = f"{location.longitude}°E" if location.longitude else ''

            coordinates_data = [
                ['Well Centre Coordinates', 'Latitude', lat_dms, lat_decimal, 'UTM Coordinates', 'Northing', f"{location.northing} m" if location.northing else ''],
                ['', 'Longitude', lon_dms, lon_decimal, '', 'Easting', f"{location.easting} m" if location.easting else '']
            ]
        else:
            coordinates_data = [
                ['Well Centre Coordinates', 'Latitude', '', '', 'UTM Coordinates', 'Northing', ''],
                ['', 'Longitude', '', '', '', 'Easting', '']
            ]

        coordinates_table = Table(coordinates_data, colWidths=[1.45*inch, 0.83*inch, 1.55*inch, 0.83*inch, 1.24*inch, 0.83*inch, 1.04*inch])
        coordinates_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (1, 0), (1, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (4, 0), (4, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (5, 0), (5, 1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('TEXTCOLOR', (1, 0), (1, 1), colors.white),
            ('TEXTCOLOR', (4, 0), (4, 1), colors.white),
            ('TEXTCOLOR', (5, 0), (5, 1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(coordinates_table)
        elements.append(Spacer(1, 0.03*inch))

        # Table 2: Geodetic System and Depth Reference Details (aligned with coordinates table)
        if location:
            system_data = [
                ['Geodetic System', location.geodetic_system or '', 'Elevation Referred', elevation_referred],
                ['Map Zone', location.map_zone or '', 'Reference datum', reference_datum],
                ['North Reference', location.north_reference or '', 'Reference Height', reference_height],
                ['Grid Correction', f"{location.grid_correction}" if location.grid_correction is not None else '',
                'Reference Elevation', reference_elevation],
                ['Central Meridian', f"{location.central_meridian}" if location.central_meridian is not None else '',]
               
            ]
        else:
            system_data = [
                ['Geodetic System', '', 'Elevation Referred', elevation_referred],
                ['Map Zone', '', 'Reference datum', reference_datum],
                ['North Reference', '', 'Reference Height', reference_height],
                ['Grid Correction', '', 'Reference Elevation', reference_elevation],
                ['Central Meridian', '']
            ]

        system_table = Table(system_data, colWidths=[1.35*inch, 2.54*inch, 1.92*inch, 1.96*inch])
        system_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(system_table)
        elements.append(Spacer(1, 0.05*inch))

        # Equipment Details Header
        # equip_header = Table([['Equipment Details']], colWidths=[7.77*inch])
        # equip_header.setStyle(TableStyle([
        #     ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
        #     ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        #     ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        #     ('FONTSIZE', (0, 0), (-1, -1), 11),
        #     ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        #     ('LEFTPADDING', (0, 0), (-1, -1), 8),
        #     ('TOPPADDING', (0, 0), (-1, -1), 5),
        #     ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        # ]))
        # elements.append(equip_header)
        # elements.append(Spacer(1, 0.05*inch))

        # Get proposal direction (Vertical Section Azimuth)
        # Priority:
        # 1. If BHC enabled: Use the updated/recalculated value from calculated_survey.vertical_section_azimuth
        # 2. If BHC disabled: Use initial proposal_direction from tieon or run
                # ---------------------------------------------------------
        # Equipment Details (LEFT) + Vertical Section Reference (RIGHT)
        # ---------------------------------------------------------

        # --- Calculate Vertical Section Azimuth (same logic you already have) ---
        proposal_direction_value = 'N/A'
        #--checking for bhc enabled or not 
        bhc_enabled = run.bhc_enabled if hasattr(run, 'bhc_enabled') else False

        if bhc_enabled and hasattr(calculated_survey, 'vertical_section_azimuth') and calculated_survey.vertical_section_azimuth is not None:
            proposal_direction_value = f'{calculated_survey.vertical_section_azimuth:.2f} °deg'
        elif hasattr(run, 'tieon') and run.tieon and run.tieon.proposal_direction is not None:
            proposal_direction_value = f'{run.tieon.proposal_direction} °deg'
        elif run.proposal_direction is not None:
            proposal_direction_value = f'{run.proposal_direction} °deg'

        # Default values (replace with DB values if you have them later)
        displacement_referred_to = 'Well Head'
        vertical_section_reference = 'Well Centre'

        # --- Parallel Headers (same row) ---
        equip_vs_headers = [['Equipment Details', 'Vertical Section Reference']]
        equip_vs_headers_table = Table(equip_vs_headers, colWidths=[3.885*inch, 3.885*inch])
        equip_vs_headers_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(equip_vs_headers_table)
        elements.append(Spacer(1, 0.05*inch))

        # --- Left Table (Equipment) ---
        equip_left_data = [
            ['Survey Probe Type', '110  115'],
            ['Probe ID', '249  255'],
            ['Error Model', 'n/a  n/a'],
        ]
        equip_left_table = Table(equip_left_data, colWidths=[1.55*inch, 2.335*inch])
        equip_left_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))

        # --- Right Table (Vertical Section Reference) ---
        vs_right_data = [
            ['Displacement Referred to', displacement_referred_to],
            ['Vertical Section Reference', vertical_section_reference],
            ['Vertical Section Azimuth', proposal_direction_value],
            ['Data Obtained by', "Client Representative"],
            ['Survey Calculation Method', "Minimum Curvature"],

        ]
        vs_right_table = Table(vs_right_data, colWidths=[1.55*inch, 2.335*inch])
        vs_right_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))

        # --- Put both tables side-by-side in one row ---
        combined_row = Table([[equip_left_table, vs_right_table]], colWidths=[3.885*inch, 3.885*inch])
        combined_row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))

        elements.append(combined_row)
        elements.append(Spacer(1, 0.05*inch))


        # Survey Details and Tie-On Details Headers
        survey_tieon_headers = [['Survey Details', 'Tie-on Details']]
        survey_tieon_headers_table = Table(survey_tieon_headers, colWidths=[3.885*inch, 3.885*inch])
        survey_tieon_headers_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#c8a078')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elements.append(survey_tieon_headers_table)
        elements.append(Spacer(1, 0.05*inch))

        tieon = getattr(run, "tieon", None)

        # Get tie-on data from survey_data and calculated results
        survey_file = survey_data.survey_file
        tieon_md = survey_data.md_data[0] if hasattr(survey_data, 'md_data') and len(survey_data.md_data) > 0 else 0
        tieon_inc = survey_data.inc_data[0] if hasattr(survey_data, 'inc_data') and len(survey_data.inc_data) > 0 else 0
        tieon_azi = survey_data.azi_data[0] if hasattr(survey_data, 'azi_data') and len(survey_data.azi_data) > 0 else 0
        tieon_tvd = calculated_survey.tvd[0] if hasattr(calculated_survey, 'tvd') and len(calculated_survey.tvd) > 0 else 0
        tieon_ns = calculated_survey.northing[0] if hasattr(calculated_survey, 'northing') and len(calculated_survey.northing) > 0 else 0
        tieon_ew = calculated_survey.easting[0] if hasattr(calculated_survey, 'easting') and len(calculated_survey.easting) > 0 else 0       
        survey_from = getattr(tieon, "survey_interval_from", None)
        survey_to   = getattr(tieon, "survey_interval_to", None)

        # Survey and Tie-on Details Content
        survey_tieon_data = [
            ['Well Type', well_type, 'Measured Depth', f'{tieon_md} m'],
            ['Hole Section', hole_section, 'Inclination', f'{tieon_inc} °deg'],
            ['Minimum ID', minimum_id, 'Azimuth', f'{tieon_azi} °deg'],
            ['Survey Tool Type', 'Vertical', 'True Vertical Depth', f'{tieon_tvd} m'],
            ['Survey Performed In', survey_performed_in, 'Latitude (+N/-S)', f'{tieon_ns} m'],
            ['Survey From', f'{survey_from} m', 'Departure (+E/-W)', f'{tieon_ew} m'],
            ['Survey Footage', f'{survey_to} m' ]
        ]

        survey_tieon_table = Table(survey_tieon_data, colWidths=[1.35*inch, 2.54*inch, 1.35*inch, 2.53*inch])
        survey_tieon_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#c8a078')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.black),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(survey_tieon_table)
        elements.append(Spacer(1, 0.05*inch))

        # Overall Survey QC Analysis Header
        qc_header = Table([['Overall Survey QC Analysis']], colWidths=[7.77*inch])
        qc_header.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(qc_header)

        # QC Analysis Table
        qc_data = [
            ['', 'Process Workflow', 'Sensor Calibration', 'Comparative QC', 'Gyrocompass QC', 'Secondary QC'],
            ['QC Confidence', '100%', '97.8%', '100%', '91.25%', '95%'],
            ['Weightage', '0.5', '2', '2', '5', '0.5']
        ]

        qc_table = Table(qc_data, colWidths=[1.24*inch, 1.31*inch, 1.30*inch, 1.30*inch, 1.31*inch, 1.31*inch])
        qc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 1), (0, 2), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 1), (0, 2), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(qc_table)

        # QC Confidence Result
        qc_result_data = [['Overall Survey QC Confidence', '97%', 'SURVEY QUALIFIED']]
        qc_result_table = Table(qc_result_data, colWidths=[3.11*inch, 1.55*inch, 3.11*inch])
        qc_result_table.setStyle(TableStyle([
            ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#90EE90')),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(qc_result_table)

        # Footer will be drawn at fixed position by page template

        return elements

    @staticmethod
    def _create_trajectory_plots(survey_data, calculated_survey):
        """Create 3D and 2D trajectory visualization plots."""
        elements = []

        try:
            # Get data arrays
            md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
            tvd_data = calculated_survey.tvd if hasattr(calculated_survey, 'tvd') else []
            ns_data = calculated_survey.northing if hasattr(calculated_survey, 'northing') else []
            ew_data = calculated_survey.easting if hasattr(calculated_survey, 'easting') else []
            vs_data = calculated_survey.vertical_section if hasattr(calculated_survey, 'vertical_section') and calculated_survey.vertical_section else []

            if not md_data or not tvd_data or not ns_data or not ew_data:
                logger.warning("Insufficient data for trajectory plots")
                return elements

            # Create figure with 3 subplots (2 rows: 3D on top, 2D graphs below)
            # Using GridSpec to give 3D graph more space (60% top, 40% bottom)
            fig = plt.figure(figsize=(10, 7.5))
            gs = GridSpec(2, 2, figure=fig, height_ratios=[1.8, 1])

            # 3D Trajectory Plot (top row - larger size, spanning both columns)
            ax1 = fig.add_subplot(gs[0, :], projection='3d')
            ax1.plot(ew_data, ns_data, tvd_data, 'b-', linewidth=2)
            ax1.set_xlabel('Easting (m)', fontsize=10)
            ax1.set_ylabel('Northing (m)', fontsize=10)
            ax1.set_zlabel('TVD (m)', fontsize=10)
            ax1.set_title('3D Trajectory View', fontsize=12, fontweight='bold')
            ax1.invert_zaxis()  # Invert Z-axis for depth
            ax1.grid(True, alpha=0.3)
            ax1.tick_params(labelsize=9)

            # 2D Plan View (bottom left)
            ax2 = fig.add_subplot(gs[1, 0])
            ax2.plot(ew_data, ns_data, 'r-', linewidth=2)
            ax2.set_xlabel('Easting (m)', fontsize=9)
            ax2.set_ylabel('Northing (m)', fontsize=9)
            ax2.set_title('2D Plan View', fontsize=10, fontweight='bold')
            ax2.grid(True, alpha=0.3)
            ax2.axis('equal')
            ax2.tick_params(labelsize=8)

            # 2D Vertical Section View (bottom right)
            ax3 = fig.add_subplot(gs[1, 1])
            if vs_data and len(vs_data) > 0:
                ax3.plot(vs_data, tvd_data, 'g-', linewidth=2)
                ax3.set_xlabel('Vertical Section (m)', fontsize=9)
            else:
                # If vertical section not available, use MD
                ax3.plot(md_data, tvd_data, 'g-', linewidth=2)
                ax3.set_xlabel('Measured Depth (m)', fontsize=9)
            ax3.set_ylabel('TVD (m)', fontsize=9)
            ax3.set_title('2D Vertical Section', fontsize=10, fontweight='bold')
            ax3.invert_yaxis()  # Invert Y-axis for depth
            ax3.grid(True, alpha=0.3)
            ax3.tick_params(labelsize=8)

            # Save plot to buffer
            plt.tight_layout()
            img_buffer = BytesIO()
            plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
            plt.close()
            img_buffer.seek(0)

            # Add plot image to PDF
            img = Image(img_buffer, width=7*inch, height=5.25*inch)
            elements.append(img)

        except Exception as e:
            logger.error(f"Error creating trajectory plots: {str(e)}")

        return elements

    @staticmethod
    def _create_data_pages(survey_data, calculated_survey, run):
        """Create data pages with survey calculation table."""
        elements = []

        # Get survey date from file upload date
        survey_file = survey_data.survey_file
        survey_date = survey_file.created_at.strftime('%d-%b-%Y') if hasattr(survey_file, 'created_at') and survey_file.created_at else datetime.now().strftime('%d-%b-%Y')
        run_name = run.run_name or 'RNS-40'
        

        # Get survey data - MD, INC, AZI from survey_data; calculated values from calculated_survey
        md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
        inc_data = survey_data.inc_data if hasattr(survey_data, 'inc_data') else []
        azi_data = survey_data.azi_data if hasattr(survey_data, 'azi_data') else []
        tvd_data = calculated_survey.tvd if hasattr(calculated_survey, 'tvd') else []
        vs_data = calculated_survey.vertical_section if hasattr(calculated_survey, 'vertical_section') and calculated_survey.vertical_section else []
        ns_data = calculated_survey.northing if hasattr(calculated_survey, 'northing') else []
        ew_data = calculated_survey.easting if hasattr(calculated_survey, 'easting') else []
        dls_data = calculated_survey.dls if hasattr(calculated_survey, 'dls') and calculated_survey.dls else []

        # Prepare table data
        table_data = [
            ['MD\n(m)', 'Inclination\n(degs)', 'Azimuth\n(degs)', 'TVD\n(m)', 'V.S.\n(m)', '+N/S\n(m)', '+E/-W\n(m)', 'DLS\n(/30)']
        ]

        # Add data rows
        for i in range(len(md_data)):
            # Handle vertical section - might be None or empty
            vs_val = ""
            if vs_data and i < len(vs_data):
                try:
                    vs_val = f"{float(vs_data[i]):.2f}"
                except (TypeError, ValueError):
                    vs_val = "0.00"

            # Handle DLS - might be None or empty
            dls_val = "None"
            if dls_data and i < len(dls_data):
                try:
                    if dls_data[i] is not None and dls_data[i] != 'None':
                        dls_val = f"{float(dls_data[i]):.2f}"
                except (TypeError, ValueError):
                    dls_val = "None"

            row = [
                f"{float(md_data[i]):.2f}" if i < len(md_data) else "",
                f"{float(inc_data[i]):.2f}" if i < len(inc_data) else "",
                f"{float(azi_data[i]):.2f}" if i < len(azi_data) else "",
                f"{float(tvd_data[i]):.2f}" if i < len(tvd_data) else "",
                vs_val,
                f"{float(ns_data[i]):.2f}" if i < len(ns_data) else "",
                f"{float(ew_data[i]):.2f}" if i < len(ew_data) else "",
                dls_val
            ]
            table_data.append(row)

        # Create table with alternating row colors
        # A4 width = 8.27 inches, with 0.25" margins on each side = 7.77" available
        # Match header width exactly (7.77 inches total) with equal column distribution
        col_widths = [0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch]
        # Total = 7.77 inches (8 columns × 0.97125)

        # Split table into pages (approximately 35 rows per page to fit with header/footer)
        rows_per_page = 35
        total_rows = len(table_data) - 1  # Exclude header

        for page_start in range(0, total_rows, rows_per_page):
            if page_start > 0:
                elements.append(PageBreak())

            # Add header for each page
            # Page header with date and run name
            header_style = ParagraphStyle(
                'DataPageHeader',
                fontName='Helvetica-Bold',
                fontSize=16,
                textColor=colors.white,
                alignment=TA_LEFT,
                leftIndent=10,
                spaceAfter=10
            )

            header_data = [[Paragraph('Gyroscopic Survey Report', header_style), survey_date, run_name]]
            header_table = Table(header_data, colWidths=[4.52*inch, 1.625*inch, 1.625*inch])
            header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 16),
                ('FONTSIZE', (1, 0), (-1, -1), 14),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (0, 0), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(header_table)
            elements.append(Spacer(1, 0.1*inch))

            # Get page data
            page_end = min(page_start + rows_per_page, total_rows)
            page_data = [table_data[0]] + table_data[page_start + 1:page_end + 1]

            # Create table
            data_table = Table(page_data, colWidths=col_widths, repeatRows=1)
            data_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
                # Data rows
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
            ]))
            elements.append(data_table)

            # Footer will be drawn at fixed position by page template

        # Add trajectory plots on last page with header
        elements.append(PageBreak())

        # Add header for plots page
        header_style = ParagraphStyle(
            'DataPageHeader',
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.white,
            alignment=TA_LEFT,
            leftIndent=10,
            spaceAfter=10
        )

        header_data = [[Paragraph('Gyroscopic Survey Report', header_style), survey_date, run_name]]
        header_table = Table(header_data, colWidths=[4.52*inch, 1.625*inch, 1.625*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (0, 0), 16),
            ('FONTSIZE', (1, 0), (-1, -1), 14),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.1*inch))

        # Add trajectory plots
        elements.extend(SurveyCalculationReportService._create_trajectory_plots(survey_data, calculated_survey))

        # Footer will be drawn at fixed position by page template

        return elements

    @staticmethod
    def _create_data_pages_for_interpolated(survey_data, calculated_survey, run, resolution, survey_file=None):
        """Create data pages with survey calculation table for interpolated data."""
        elements = []

        # Get survey date from file upload date
        if survey_file and hasattr(survey_file, 'created_at') and survey_file.created_at:
            survey_date = survey_file.created_at.strftime('%d-%b-%Y')
        elif hasattr(survey_data, 'survey_file'):
            survey_date = survey_data.survey_file.created_at.strftime('%d-%b-%Y')
        else:
            survey_date = datetime.now().strftime('%d-%b-%Y')

        run_name = run.run_name or 'RNS-40'

        # Get survey data - MD, INC, AZI from survey_data; calculated values from calculated_survey
        md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
        inc_data = survey_data.inc_data if hasattr(survey_data, 'inc_data') else []
        azi_data = survey_data.azi_data if hasattr(survey_data, 'azi_data') else []
        tvd_data = calculated_survey.tvd if hasattr(calculated_survey, 'tvd') else []
        vs_data = calculated_survey.vertical_section if hasattr(calculated_survey, 'vertical_section') and calculated_survey.vertical_section else []
        ns_data = calculated_survey.northing if hasattr(calculated_survey, 'northing') else []
        ew_data = calculated_survey.easting if hasattr(calculated_survey, 'easting') else []
        dls_data = calculated_survey.dls if hasattr(calculated_survey, 'dls') and calculated_survey.dls else []

        # Prepare table data
        table_data = [
            ['MD\n(m)', 'Inclination\n(degs)', 'Azimuth\n(degs)', 'TVD\n(m)', 'V.S.\n(m)', '+N/S\n(m)', '+E/-W\n(m)', 'DLS\n(/30)']
        ]

        # Add data rows
        for i in range(len(md_data)):
            # Handle vertical section - might be None or empty
            vs_val = ""
            if vs_data and i < len(vs_data):
                try:
                    vs_val = f"{float(vs_data[i]):.2f}"
                except (TypeError, ValueError):
                    vs_val = "0.00"

            # Handle DLS - might be None or empty
            dls_val = "None"
            if dls_data and i < len(dls_data):
                try:
                    if dls_data[i] is not None and dls_data[i] != 'None':
                        dls_val = f"{float(dls_data[i]):.2f}"
                except (TypeError, ValueError):
                    dls_val = "None"

            row = [
                f"{float(md_data[i]):.2f}" if i < len(md_data) else "",
                f"{float(inc_data[i]):.2f}" if i < len(inc_data) else "",
                f"{float(azi_data[i]):.2f}" if i < len(azi_data) else "",
                f"{float(tvd_data[i]):.2f}" if i < len(tvd_data) else "",
                vs_val,
                f"{float(ns_data[i]):.2f}" if i < len(ns_data) else "",
                f"{float(ew_data[i]):.2f}" if i < len(ew_data) else "",
                dls_val
            ]
            table_data.append(row)

        # Create table with alternating row colors
        # A4 width = 8.27 inches, with 0.25" margins on each side = 7.77" available
        # Match header width exactly (7.77 inches total) with equal column distribution
        col_widths = [0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch, 0.97125*inch]
        # Total = 7.77 inches (8 columns × 0.97125)

        # Split table into pages (approximately 35 rows per page to fit with header/footer)
        rows_per_page = 35
        total_rows = len(table_data) - 1  # Exclude header

        for page_start in range(0, total_rows, rows_per_page):
            if page_start > 0:
                elements.append(PageBreak())

            # Add header for each page
            # Page header with date and run name (indicate interpolated)
            header_style = ParagraphStyle(
                'DataPageHeader',
                fontName='Helvetica-Bold',
                fontSize=16,
                textColor=colors.white,
                alignment=TA_LEFT,
                leftIndent=10,
                spaceAfter=10
            )

            # Header for data pages (same as calculated report)
            header_text = 'Gyroscopic Survey Report'
            header_data = [[Paragraph(header_text, header_style), survey_date, run_name]]
            header_table = Table(header_data, colWidths=[4.52*inch, 1.625*inch, 1.625*inch])
            header_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (0, 0), 16),
                ('FONTSIZE', (1, 0), (-1, -1), 14),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (0, 0), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            elements.append(header_table)
            elements.append(Spacer(1, 0.1*inch))

            # Get page data
            page_end = min(page_start + rows_per_page, total_rows)
            page_data = [table_data[0]] + table_data[page_start + 1:page_end + 1]

            # Create table
            data_table = Table(page_data, colWidths=col_widths, repeatRows=1)
            data_table.setStyle(TableStyle([
                # Header row
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
                # Data rows
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
                # Grid
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                # Alternating row colors
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
            ]))
            elements.append(data_table)

            # Footer will be drawn at fixed position by page template

        # Add trajectory plots on last page with header
        elements.append(PageBreak())

        # Add header for plots page
        header_style = ParagraphStyle(
            'DataPageHeader',
            fontName='Helvetica-Bold',
            fontSize=16,
            textColor=colors.white,
            alignment=TA_LEFT,
            leftIndent=10,
            spaceAfter=10
        )

        header_data = [[Paragraph('Gyroscopic Survey Report', header_style), survey_date, run_name]]
        header_table = Table(header_data, colWidths=[4.52*inch, 1.625*inch, 1.625*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (0, 0), 16),
            ('FONTSIZE', (1, 0), (-1, -1), 14),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (0, 0), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.1*inch))

        # Add trajectory plots
        elements.extend(SurveyCalculationReportService._create_trajectory_plots(survey_data, calculated_survey))

        # Footer will be drawn at fixed position by page template

        return elements


def generate_survey_calculation_report(survey_data_id):
    """
    Generate survey calculation report for given survey data ID.

    Args:
        survey_data_id: UUID of the SurveyData instance

    Returns:
        BytesIO: PDF report bytes
    """
    from survey_api.models import SurveyData, CalculatedSurvey

    try:
        survey_data = SurveyData.objects.get(id=survey_data_id)
        calculated_survey = CalculatedSurvey.objects.get(survey_data=survey_data)

        return SurveyCalculationReportService.generate_report(survey_data, calculated_survey)
    except Exception as e:
        logger.error(f"Error generating survey calculation report: {str(e)}")
        raise











#latest update -------------------------------------------------------07-01-2026------------------------------------------------------!


# """
# Survey Calculation Report Service - Generates PDF reports matching TASK template format.
# Creates comprehensive survey reports with job details, geodetic location, and survey data tables.
# """
# from io import BytesIO
# from datetime import datetime
# import logging

# from reportlab.lib.pagesizes import A4
# from reportlab.lib import colors
# from reportlab.lib.units import inch
# from reportlab.platypus import (
#     SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image, KeepTogether
# )
# from reportlab.lib.styles import ParagraphStyle
# from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

# import matplotlib
# matplotlib.use('Agg')  # Use non-interactive backend
# import matplotlib.pyplot as plt
# from matplotlib.gridspec import GridSpec

# logger = logging.getLogger(__name__)


# class SurveyCalculationReportService:
#     """Service for generating Survey Calculation Reports matching TASK template."""

#     # ===== Cover page compaction + unified font sizing =====
#     # Make cover page fit on 1st page:
#     COVER_FONT = 7            # all cover tables text size
#     COVER_HEADER_FONT = 7     # section header bars (Job Details, etc.)
#     COVER_TITLE_FONT = 9     # "Type of Service Performed" line
#     COVER_GRID = 0.5

#     # Padding (smaller = more content fits)
#     PAD_TINY = 2
#     PAD_SMALL = 3

#     # Spacers (smaller = more content fits)
#     SP_XXS = 0.01 * inch
#     SP_XS = 0.02 * inch
#     SP_S = 0.03 * inch

#     @staticmethod
#     def _ts_base(font_size=COVER_FONT, top=PAD_TINY, bottom=PAD_TINY, left=6, right=6):
#         """Reusable base TableStyle: grid + font size + padding + valign."""
#         return TableStyle([
#             ('FONTSIZE', (0, 0), (-1, -1), font_size),
#             ('GRID', (0, 0), (-1, -1), SurveyCalculationReportService.COVER_GRID, colors.grey),
#             ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
#             ('TOPPADDING', (0, 0), (-1, -1), top),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), bottom),
#             ('LEFTPADDING', (0, 0), (-1, -1), left),
#             ('RIGHTPADDING', (0, 0), (-1, -1), right),
#         ])

#     @staticmethod
#     def _draw_footer(canvas_obj, doc, page_num, total_pages):
#         """Draw footer at fixed position on all pages."""
#         canvas_obj.saveState()
#         page_width = A4[0]

#         footer_y = 0.9 * inch

#         canvas_obj.setFont('Helvetica', 9)
#         canvas_obj.setFillColor(colors.black)

#         if page_num == 1:
#             footer_text = "Survey Calculation Report - Cover Page"
#         elif page_num == total_pages:
#             footer_text = "Survey Calculation Report - Trajectory Visualization"
#         else:
#             footer_text = "Survey Calculation Report - Phase 1 Analysis - Geology"

#         canvas_obj.drawString(0.25 * inch, footer_y, footer_text)

#         canvas_obj.setFont('Helvetica-Bold', 9)
#         canvas_obj.setFillColor(colors.HexColor('#c23c3e'))
#         canvas_obj.drawRightString(page_width - 0.25 * inch, footer_y, f"Page | {page_num}")

#         canvas_obj.restoreState()

#     @staticmethod
#     def generate_report(survey_data, calculated_survey):
#         """Generate a complete Survey Calculation Report PDF."""
#         buffer = BytesIO()

#         doc = SimpleDocTemplate(
#             buffer,
#             pagesize=A4,
#             rightMargin=0.25 * inch,
#             leftMargin=0.25 * inch,
#             topMargin=0.20 * inch,     # slightly tighter than before
#             bottomMargin=1.15 * inch   # keep space for fixed footer
#         )

#         elements = []

#         survey_file = survey_data.survey_file
#         run = survey_file.run
#         well = run.well
#         job = run.job if hasattr(run, 'job') else None
#         location = well.location if hasattr(well, 'location') else None

#         elements.extend(SurveyCalculationReportService._create_cover_page(
#             survey_data, calculated_survey, run, well, job, location
#         ))

#         elements.append(PageBreak())

#         elements.extend(SurveyCalculationReportService._create_data_pages(
#             survey_data, calculated_survey, run
#         ))

#         rows_per_page = 35
#         md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
#         data_pages_count = ((len(md_data) - 1) // rows_per_page + 1) if len(md_data) > 0 else 0
#         total_pages = 1 + data_pages_count + 1

#         doc.build(
#             elements,
#             onFirstPage=lambda c, d: SurveyCalculationReportService._draw_footer(c, d, 1, total_pages),
#             onLaterPages=lambda c, d: SurveyCalculationReportService._draw_footer(c, d, c.getPageNumber(), total_pages)
#         )

#         pdf = buffer.getvalue()
#         buffer.close()
#         return pdf

#     @staticmethod
#     def _create_cover_page(survey_data, calculated_survey, run, well, job, location,
#                            is_interpolated=False, resolution=None):
#         """Create the first page with all job and survey details."""
#         elements = []
#         survey_file = survey_data.survey_file

#         survey_date = (
#             survey_file.created_at.strftime('%d-%b-%Y')
#             if hasattr(survey_file, 'created_at') and survey_file.created_at
#             else datetime.now().strftime('%d-%b-%Y')
#         )

#         # ===== Header table =====
#         header_data = [
#             ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
#             ['Survey', 'OPS', 'External', survey_date, 'TT-OPS-FRM-004']
#         ]
#         header_table = Table(header_data, colWidths=[0.88 * inch, 1.14 * inch, 0.88 * inch, 1.04 * inch, 3.83 * inch])
#         header_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
#             ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#             ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ]))
#         header_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(header_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         # ===== Title table =====
#         title_data = [
#             ['Title', 'Survey Calculation Report', 'Pages', 'Rev.', 'Rev. Date'],
#             ['Sub Title', 'Surveys', '1 of 1', 'A', survey_date]
#         ]
#         title_table = Table(title_data, colWidths=[0.88 * inch, 4.82 * inch, 0.62 * inch, 0.52 * inch, 0.93 * inch])
#         title_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
#             ('BACKGROUND', (2, 0), (-1, 0), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (2, 0), (-1, 0), colors.white),
#             ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ]))
#         title_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(title_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XS))

#         # ===== Section header helper =====
#         def section_header(text, color_hex='#c23c3e'):
#             t = Table([[text]], colWidths=[7.77 * inch])
#             t.setStyle(TableStyle([
#                 ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(color_hex)),
#                 ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
#                 ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#                 ('FONTSIZE', (0, 0), (-1, -1), SurveyCalculationReportService.COVER_HEADER_FONT),
#                 ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#                 ('LEFTPADDING', (0, 0), (-1, -1), 6),
#                 ('TOPPADDING', (0, 0), (-1, -1), SurveyCalculationReportService.PAD_SMALL),
#                 ('BOTTOMPADDING', (0, 0), (-1, -1), SurveyCalculationReportService.PAD_SMALL),
#             ]))
#             return t

#         # ===== Job Details =====
#         elements.append(section_header('Job Details', '#c23c3e'))
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         survey_upload_date = (
#             survey_file.created_at.strftime('%B %d, %Y')
#             if hasattr(survey_file, 'created_at') and survey_file.created_at
#             else ''
#         )

#         job_data = [
#             ['Job # Reference', job.job_number if job else '', 'Date of Survey', survey_upload_date],
#             ['Well Name', well.well_name if well else '', 'Rig #',
#              job.rig.rig_number if job and hasattr(job, 'rig') and job.rig else ''],
#             ['Survey Name', run.run_name or '', '', '']
#         ]
#         job_table = Table(job_data, colWidths=[1.55 * inch, 2.33 * inch, 1.55 * inch, 2.34 * inch])
#         job_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
#             ('BACKGROUND', (2, 0), (2, 1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
#             ('TEXTCOLOR', (2, 0), (2, 1), colors.white),
#             ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#             ('FONTNAME', (2, 0), (2, 1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         job_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(job_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         # ===== Type of Service =====
#         service_name = job.service.service_name if job and hasattr(job, 'service') and job.service else 'Wireline Multishot'
#         service_para = Paragraph(
#             f'<b><font color="#c23c3e">Type of Service Performed:</font> '
#             f'<font color="black">{service_name}</font></b>',
#             ParagraphStyle(
#                 'ServiceStyle',
#                 fontName='Helvetica-Bold',
#                 fontSize=SurveyCalculationReportService.COVER_TITLE_FONT,
#                 leading=SurveyCalculationReportService.COVER_TITLE_FONT + 1,
#                 spaceAfter=0
#             )
#         )
#         elements.append(service_para)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         # ===== Geodetic Location & Depth Reference =====
#         elements.append(section_header('Geodetic Location & Depth Reference', '#c23c3e'))
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         if location:
#             lat_dms = (
#                 f"{location.latitude_degrees or ''}° {location.latitude_minutes or ''}' "
#                 f"{location.latitude_seconds or ''}\" N"
#                 if location.latitude_degrees is not None else ''
#             )
#             lon_dms = (
#                 f"{location.longitude_degrees or ''}° {location.longitude_minutes or ''}' "
#                 f"{location.longitude_seconds or ''}\" E"
#                 if location.longitude_degrees is not None else ''
#             )
#             lat_decimal = f"{location.latitude}°N" if location.latitude else ''
#             lon_decimal = f"{location.longitude}°E" if location.longitude else ''

#             coordinates_data = [
#                 ['Well Centre Coordinates', 'Latitude', lat_dms, lat_decimal, 'UTM Coordinates', 'Northing',
#                  f"{location.northing} m" if location.northing else ''],
#                 ['', 'Longitude', lon_dms, lon_decimal, '', 'Easting',
#                  f"{location.easting} m" if location.easting else '']
#             ]
#         else:
#             coordinates_data = [
#                 ['Well Centre Coordinates', 'Latitude', '', '', 'UTM Coordinates', 'Northing', ''],
#                 ['', 'Longitude', '', '', '', 'Easting', '']
#             ]

#         coordinates_table = Table(
#             coordinates_data,
#             colWidths=[1.45 * inch, 0.83 * inch, 1.55 * inch, 0.83 * inch, 1.24 * inch, 0.83 * inch, 1.04 * inch]
#         )
#         coordinates_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
#             ('BACKGROUND', (1, 0), (1, 1), colors.HexColor('#808080')),
#             ('BACKGROUND', (4, 0), (4, 1), colors.HexColor('#808080')),
#             ('BACKGROUND', (5, 0), (5, 1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
#             ('TEXTCOLOR', (1, 0), (1, 1), colors.white),
#             ('TEXTCOLOR', (4, 0), (4, 1), colors.white),
#             ('TEXTCOLOR', (5, 0), (5, 1), colors.white),
#             ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         coordinates_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(coordinates_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         if location:
#             system_data = [
#                 ['Geodetic System', location.geodetic_system or '', 'Elevation Referred', 'Mean Sea Level (MSL)'],
#                 ['Map Zone', location.map_zone or '', 'Reference datum', 'RKB/DFE (Drill Floor Elevation)'],
#                 ['North Reference', location.north_reference or '', 'Reference Height', '12 m'],
#                 ['Grid Correction', f"{location.grid_correction}" if location.grid_correction is not None else '',
#                  'Reference Elevation', '12 m'],
#                 ['Central Meridian', f"{location.central_meridian}" if location.central_meridian is not None else '',
#                  'Survey Calculation', 'Minimum Curvature']
#             ]
#         else:
#             system_data = [
#                 ['Geodetic System', '', 'Elevation Referred', 'Mean Sea Level (MSL)'],
#                 ['Map Zone', '', 'Reference datum', 'RKB/DFE (Drill Floor Elevation)'],
#                 ['North Reference', '', 'Reference Height', '12 m'],
#                 ['Grid Correction', '', 'Reference Elevation', '12 m'],
#                 ['Central Meridian', '', 'Survey Calculation', 'Minimum Curvature']
#             ]

#         system_table = Table(system_data, colWidths=[1.35 * inch, 2.54 * inch, 1.92 * inch, 1.96 * inch])
#         system_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
#             ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
#             ('TEXTCOLOR', (2, 0), (2, -1), colors.white),
#             ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         system_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(system_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XS))

#         # ===== Equipment Details (LEFT) + Vertical Section Reference (RIGHT) =====
#         proposal_direction_value = 'N/A'
#         bhc_enabled = run.bhc_enabled if hasattr(run, 'bhc_enabled') else False

#         if bhc_enabled and hasattr(calculated_survey, 'vertical_section_azimuth') and calculated_survey.vertical_section_azimuth is not None:
#             proposal_direction_value = f'{calculated_survey.vertical_section_azimuth:.2f} °deg'
#         elif hasattr(run, 'tieon') and run.tieon and run.tieon.proposal_direction is not None:
#             proposal_direction_value = f'{run.tieon.proposal_direction} °deg'
#         elif getattr(run, 'proposal_direction', None) is not None:
#             proposal_direction_value = f'{run.proposal_direction} °deg'

#         displacement_referred_to = 'Well Head'
#         vertical_section_reference = 'Well Centre'

#         equip_vs_headers_table = Table([['Equipment Details', 'Vertical Section Reference']],
#                                        colWidths=[3.885 * inch, 3.885 * inch])
#         equip_vs_headers_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#c23c3e')),
#             ('TEXTCOLOR', (0, 0), (1, 0), colors.white),
#             ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
#             ('FONTSIZE', (0, 0), (1, 0), SurveyCalculationReportService.COVER_HEADER_FONT),
#             ('ALIGN', (0, 0), (1, 0), 'LEFT'),
#             ('LEFTPADDING', (0, 0), (1, 0), 6),
#             ('TOPPADDING', (0, 0), (1, 0), SurveyCalculationReportService.PAD_SMALL),
#             ('BOTTOMPADDING', (0, 0), (1, 0), SurveyCalculationReportService.PAD_SMALL),
#         ]))
#         elements.append(equip_vs_headers_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         equip_left_data = [
#             ['Survey Probe Type', '110  115'],
#             ['Probe ID', '249  255'],
#             ['Error Model', 'n/a  n/a'],
#         ]
#         equip_left_table = Table(equip_left_data, colWidths=[1.55 * inch, 2.335 * inch])
#         equip_left_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
#             ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         equip_left_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))

#         vs_right_data = [
#             ['Displacement Referred to', displacement_referred_to],
#             ['Vertical Section Reference', vertical_section_reference],
#             ['Vertical Section Azimuth', proposal_direction_value],
#             ['Data Obtained by', "Client Representative"],
#             ['Survey Calculation Method', "Minimum Curvature"],
#         ]
#         vs_right_table = Table(vs_right_data, colWidths=[1.55 * inch, 2.335 * inch])
#         vs_right_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
#             ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         vs_right_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))

#         combined_row = Table([[equip_left_table, vs_right_table]],
#                              colWidths=[3.885 * inch, 3.885 * inch])
#         combined_row.setStyle(TableStyle([
#             ('VALIGN', (0, 0), (-1, -1), 'TOP'),
#             ('LEFTPADDING', (0, 0), (-1, -1), 0),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 0),
#             ('TOPPADDING', (0, 0), (-1, -1), 0),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
#         ]))
#         elements.append(combined_row)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XS))

#         # ===== Survey Details + Tie-on Details =====
#         survey_tieon_headers_table = Table([['Survey Details', 'Tie-on Details']],
#                                            colWidths=[3.885 * inch, 3.885 * inch])
#         survey_tieon_headers_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
#             ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#c8a078')),
#             ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
#             ('TEXTCOLOR', (1, 0), (1, 0), colors.white),
#             ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
#             ('FONTSIZE', (0, 0), (1, 0), SurveyCalculationReportService.COVER_HEADER_FONT),
#             ('ALIGN', (0, 0), (1, 0), 'LEFT'),
#             ('LEFTPADDING', (0, 0), (1, 0), 6),
#             ('TOPPADDING', (0, 0), (1, 0), SurveyCalculationReportService.PAD_SMALL),
#             ('BOTTOMPADDING', (0, 0), (1, 0), SurveyCalculationReportService.PAD_SMALL),
#         ]))
#         elements.append(survey_tieon_headers_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XXS))

#         tieon_md = survey_data.md_data[0] if hasattr(survey_data, 'md_data') and len(survey_data.md_data) > 0 else 0
#         tieon_inc = survey_data.inc_data[0] if hasattr(survey_data, 'inc_data') and len(survey_data.inc_data) > 0 else 0
#         tieon_azi = survey_data.azi_data[0] if hasattr(survey_data, 'azi_data') and len(survey_data.azi_data) > 0 else 0
#         tieon_tvd = calculated_survey.tvd[0] if hasattr(calculated_survey, 'tvd') and len(calculated_survey.tvd) > 0 else 0
#         tieon_ns = calculated_survey.northing[0] if hasattr(calculated_survey, 'northing') and len(calculated_survey.northing) > 0 else 0
#         tieon_ew = calculated_survey.easting[0] if hasattr(calculated_survey, 'easting') and len(calculated_survey.easting) > 0 else 0

#         survey_tieon_data = [
#             ['Well Type', 'Vertical', 'Measured Depth', f'{tieon_md} m'],
#             ['Hole Section', '4 1/2 "', 'Inclination', f'{tieon_inc} °deg'],
#             ['Minimum ID', '2"', 'Azimuth', f'{tieon_azi} °deg'],
#             ['Survey Tool Type', 'Vertical', 'True Vertical Depth', f'{tieon_tvd} m'],
#             ['Survey Performed In', '4" Drillpipe', 'Latitude (+N/-S)', f'{tieon_ns} m'],
#             ['Survey From', '100 m', 'Departure (+E/-W)', f'{tieon_ew} m'],
#             ['Survey Footage', '1000 m', 'Well Type', 'Vertical']
#         ]
#         survey_tieon_table = Table(survey_tieon_data, colWidths=[1.35 * inch, 2.54 * inch, 1.35 * inch, 2.53 * inch])
#         survey_tieon_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
#             ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#c8a078')),
#             ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
#             ('TEXTCOLOR', (2, 0), (2, -1), colors.black),
#             ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
#             ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#         ]))
#         survey_tieon_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))
#         elements.append(survey_tieon_table)
#         elements.append(Spacer(1, SurveyCalculationReportService.SP_XS))

#         # ===== QC block (KEEP TOGETHER so it doesn’t split to page 2) =====
#         qc_header = Table([['Overall Survey QC Analysis']], colWidths=[7.77 * inch])
#         qc_header.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
#             ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#             ('FONTSIZE', (0, 0), (-1, -1), SurveyCalculationReportService.COVER_FONT),
#             ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
#             ('RIGHTPADDING', (0, 0), (-1, -1), 6),
#             ('TOPPADDING', (0, 0), (-1, -1), SurveyCalculationReportService.PAD_TINY),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), SurveyCalculationReportService.PAD_TINY),
#         ]))

#         qc_data = [
#             ['', 'Process Workflow', 'Sensor Calibration', 'Comparative QC', 'Gyrocompass QC', 'Secondary QC'],
#             ['QC Confidence', '100%', '97.8%', '100%', '91.25%', '95%'],
#             ['Weightage', '0.5', '2', '2', '5', '0.5']
#         ]
#         qc_table = Table(qc_data, colWidths=[1.24 * inch, 1.31 * inch, 1.30 * inch, 1.30 * inch, 1.31 * inch, 1.31 * inch])
#         qc_table.setStyle(TableStyle([
#             ('BACKGROUND', (0, 1), (0, 2), colors.HexColor('#c23c3e')),
#             ('TEXTCOLOR', (0, 1), (0, 2), colors.white),
#             ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
#             ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
#             ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ]))
#         qc_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_TINY,
#             bottom=SurveyCalculationReportService.PAD_TINY,
#         ))

#         qc_result_data = [['Overall Survey QC Confidence', '97%', 'SURVEY QUALIFIED']]
#         qc_result_table = Table(qc_result_data, colWidths=[3.11 * inch, 1.55 * inch, 3.11 * inch])
#         qc_result_table.setStyle(TableStyle([
#             ('BACKGROUND', (2, 0), (2, 0), colors.HexColor('#90EE90')),
#             ('FONTNAME', (0, 0), (2, 0), 'Helvetica-Bold'),
#             ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
#         ]))
#         qc_result_table.setStyle(SurveyCalculationReportService._ts_base(
#             font_size=SurveyCalculationReportService.COVER_FONT,
#             top=SurveyCalculationReportService.PAD_SMALL,
#             bottom=SurveyCalculationReportService.PAD_SMALL,
#         ))

#         # This is the key: keep QC header+tables together (no split to page 2)
#         qc_block = [qc_header, qc_table, qc_result_table]
#         elements.append(KeepTogether(qc_block))

#         return elements

#     @staticmethod
#     def _create_trajectory_plots(survey_data, calculated_survey):
#         """Create 3D and 2D trajectory visualization plots."""
#         elements = []
#         try:
#             md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
#             tvd_data = calculated_survey.tvd if hasattr(calculated_survey, 'tvd') else []
#             ns_data = calculated_survey.northing if hasattr(calculated_survey, 'northing') else []
#             ew_data = calculated_survey.easting if hasattr(calculated_survey, 'easting') else []
#             vs_data = calculated_survey.vertical_section if hasattr(calculated_survey, 'vertical_section') and calculated_survey.vertical_section else []

#             if not md_data or not tvd_data or not ns_data or not ew_data:
#                 logger.warning("Insufficient data for trajectory plots")
#                 return elements

#             fig = plt.figure(figsize=(10, 7.5))
#             gs = GridSpec(2, 2, figure=fig, height_ratios=[1.8, 1])

#             ax1 = fig.add_subplot(gs[0, :], projection='3d')
#             ax1.plot(ew_data, ns_data, tvd_data, 'b-', linewidth=2)
#             ax1.set_xlabel('Easting (m)', fontsize=10)
#             ax1.set_ylabel('Northing (m)', fontsize=10)
#             ax1.set_zlabel('TVD (m)', fontsize=10)
#             ax1.set_title('3D Trajectory View', fontsize=12, fontweight='bold')
#             ax1.invert_zaxis()
#             ax1.grid(True, alpha=0.3)
#             ax1.tick_params(labelsize=9)

#             ax2 = fig.add_subplot(gs[1, 0])
#             ax2.plot(ew_data, ns_data, 'r-', linewidth=2)
#             ax2.set_xlabel('Easting (m)', fontsize=9)
#             ax2.set_ylabel('Northing (m)', fontsize=9)
#             ax2.set_title('2D Plan View', fontsize=10, fontweight='bold')
#             ax2.grid(True, alpha=0.3)
#             ax2.axis('equal')
#             ax2.tick_params(labelsize=8)

#             ax3 = fig.add_subplot(gs[1, 1])
#             if vs_data and len(vs_data) > 0:
#                 ax3.plot(vs_data, tvd_data, 'g-', linewidth=2)
#                 ax3.set_xlabel('Vertical Section (m)', fontsize=9)
#             else:
#                 ax3.plot(md_data, tvd_data, 'g-', linewidth=2)
#                 ax3.set_xlabel('Measured Depth (m)', fontsize=9)
#             ax3.set_ylabel('TVD (m)', fontsize=9)
#             ax3.set_title('2D Vertical Section', fontsize=10, fontweight='bold')
#             ax3.invert_yaxis()
#             ax3.grid(True, alpha=0.3)
#             ax3.tick_params(labelsize=8)

#             plt.tight_layout()
#             img_buffer = BytesIO()
#             plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
#             plt.close()
#             img_buffer.seek(0)

#             img = Image(img_buffer, width=7 * inch, height=5.25 * inch)
#             elements.append(img)

#         except Exception as e:
#             logger.error(f"Error creating trajectory plots: {str(e)}")

#         return elements

#     @staticmethod
#     def _create_data_pages(survey_data, calculated_survey, run):
#         """Create data pages with survey calculation table."""
#         elements = []

#         survey_file = survey_data.survey_file
#         survey_date = (
#             survey_file.created_at.strftime('%d-%b-%Y')
#             if hasattr(survey_file, 'created_at') and survey_file.created_at
#             else datetime.now().strftime('%d-%b-%Y')
#         )
#         run_name = run.run_name or 'RNS-40'

#         md_data = survey_data.md_data if hasattr(survey_data, 'md_data') else []
#         inc_data = survey_data.inc_data if hasattr(survey_data, 'inc_data') else []
#         azi_data = survey_data.azi_data if hasattr(survey_data, 'azi_data') else []
#         tvd_data = calculated_survey.tvd if hasattr(calculated_survey, 'tvd') else []
#         vs_data = calculated_survey.vertical_section if hasattr(calculated_survey, 'vertical_section') and calculated_survey.vertical_section else []
#         ns_data = calculated_survey.northing if hasattr(calculated_survey, 'northing') else []
#         ew_data = calculated_survey.easting if hasattr(calculated_survey, 'easting') else []
#         dls_data = calculated_survey.dls if hasattr(calculated_survey, 'dls') and calculated_survey.dls else []

#         table_data = [['MD\n(m)', 'Inclination\n(degs)', 'Azimuth\n(degs)', 'TVD\n(m)', 'V.S.\n(m)', '+N/S\n(m)', '+E/-W\n(m)', 'DLS\n(/30)']]

#         for i in range(len(md_data)):
#             vs_val = ""
#             if vs_data and i < len(vs_data):
#                 try:
#                     vs_val = f"{float(vs_data[i]):.2f}"
#                 except (TypeError, ValueError):
#                     vs_val = "0.00"

#             dls_val = "None"
#             if dls_data and i < len(dls_data):
#                 try:
#                     if dls_data[i] is not None and dls_data[i] != 'None':
#                         dls_val = f"{float(dls_data[i]):.2f}"
#                 except (TypeError, ValueError):
#                     dls_val = "None"

#             row = [
#                 f"{float(md_data[i]):.2f}" if i < len(md_data) else "",
#                 f"{float(inc_data[i]):.2f}" if i < len(inc_data) else "",
#                 f"{float(azi_data[i]):.2f}" if i < len(azi_data) else "",
#                 f"{float(tvd_data[i]):.2f}" if i < len(tvd_data) else "",
#                 vs_val,
#                 f"{float(ns_data[i]):.2f}" if i < len(ns_data) else "",
#                 f"{float(ew_data[i]):.2f}" if i < len(ew_data) else "",
#                 dls_val
#             ]
#             table_data.append(row)

#         col_widths = [0.97125 * inch] * 8
#         rows_per_page = 35
#         total_rows = len(table_data) - 1

#         header_style = ParagraphStyle(
#             'DataPageHeader',
#             fontName='Helvetica-Bold',
#             fontSize=16,
#             textColor=colors.white,
#             alignment=TA_LEFT,
#             leftIndent=10,
#             spaceAfter=10
#         )

#         for page_start in range(0, total_rows, rows_per_page):
#             if page_start > 0:
#                 elements.append(PageBreak())

#             hdr = Table([[Paragraph('Gyroscopic Survey Report', header_style), survey_date, run_name]],
#                         colWidths=[4.52 * inch, 1.625 * inch, 1.625 * inch])
#             hdr.setStyle(TableStyle([
#                 ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
#                 ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
#                 ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
#                 ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
#                 ('FONTSIZE', (1, 0), (-1, -1), 14),
#                 ('ALIGN', (0, 0), (0, 0), 'LEFT'),
#                 ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
#                 ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
#                 ('LEFTPADDING', (0, 0), (0, 0), 10),
#                 ('TOPPADDING', (0, 0), (-1, -1), 8),
#                 ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
#             ]))
#             elements.append(hdr)
#             elements.append(Spacer(1, 0.1 * inch))

#             page_end = min(page_start + rows_per_page, total_rows)
#             page_data = [table_data[0]] + table_data[page_start + 1:page_end + 1]

#             data_table = Table(page_data, colWidths=col_widths, repeatRows=1)
#             data_table.setStyle(TableStyle([
#                 ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
#                 ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
#                 ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
#                 ('FONTSIZE', (0, 0), (-1, 0), 8),
#                 ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
#                 ('VALIGN', (0, 0), (-1, 0), 'MIDDLE'),
#                 ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
#                 ('FONTSIZE', (0, 1), (-1, -1), 7),
#                 ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
#                 ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
#                 ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
#                 ('TOPPADDING', (0, 0), (-1, -1), 3),
#                 ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
#                 ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F0F0')]),
#             ]))
#             elements.append(data_table)

#         elements.append(PageBreak())

#         hdr = Table([[Paragraph('Gyroscopic Survey Report', header_style), survey_date, run_name]],
#                     colWidths=[4.52 * inch, 1.625 * inch, 1.625 * inch])
#         hdr.setStyle(TableStyle([
#             ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
#             ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
#             ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
#             ('FONTNAME', (1, 0), (-1, -1), 'Helvetica'),
#             ('FONTSIZE', (1, 0), (-1, -1), 14),
#             ('ALIGN', (0, 0), (0, 0), 'LEFT'),
#             ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
#             ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
#             ('LEFTPADDING', (0, 0), (0, 0), 10),
#             ('TOPPADDING', (0, 0), (-1, -1), 8),
#             ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
#         ]))
#         elements.append(hdr)
#         elements.append(Spacer(1, 0.1 * inch))

#         elements.extend(SurveyCalculationReportService._create_trajectory_plots(survey_data, calculated_survey))
#         return elements


# def generate_survey_calculation_report(survey_data_id):
#     """
#     Generate survey calculation report for given survey data ID.
#     """
#     from survey_api.models import SurveyData, CalculatedSurvey

#     try:
#         survey_data = SurveyData.objects.get(id=survey_data_id)
#         calculated_survey = CalculatedSurvey.objects.get(survey_data=survey_data)
#         return SurveyCalculationReportService.generate_report(survey_data, calculated_survey)
#     except Exception as e:
#         logger.error(f"Error generating survey calculation report: {str(e)}")
#         raise
