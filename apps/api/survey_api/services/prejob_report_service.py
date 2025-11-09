"""
Service for generating Pre-Survey Data Sheet (Prejob Report) PDF.

This service generates a PDF report matching the TASK-TARGET template format
with job master data including customer, client, well, rig, service, and location information.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


class PrejobReportService:
    """Service for generating Pre-Survey Data Sheet PDF reports."""

    @staticmethod
    def generate_prejob_report(job, run=None):
        """
        Generate a Pre-Survey Data Sheet PDF for the given job.

        Args:
            job: Job model instance with related master data
            run: Optional Run model instance for getting survey file upload date

        Returns:
            BytesIO: PDF file as bytes
        """
        buffer = BytesIO()

        # Create the PDF object using A4 size with equal margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=0.25*inch,
            leftMargin=0.25*inch,
            topMargin=0.25*inch,
            bottomMargin=0.25*inch
        )

        # Container for the 'Flowable' objects
        elements = []

        # Get location data
        location = job.well.location if hasattr(job.well, 'location') else None

        # Header information table
        header_data = [
            ['Type', 'Department', 'Scope', 'Issue Date', 'Document Ref #'],
            ['Controlled', 'Field Services', 'External', '10-May-2019', 'TES02-FRM-PJS02v2.1']
        ]

        header_table = Table(header_data, colWidths=[1.17*inch, 1.52*inch, 1.17*inch, 1.28*inch, 2.63*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            
            ('FONTSIZE', (0, 1), (-1, 1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.05*inch))

        # Title information table
        title_data = [
            ['Title', 'On-Site Job Documentation', 'Pages', 'Rev.', 'Rev. Date'],
            ['Sub Title', 'Pre-Survey Data Sheet', '1 of 1', '2.0', '03-Aug-2022']
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
        elements.append(title_table)
        elements.append(Spacer(1, 0.1*inch))

        # Job Details Section Header
        job_header_data = [['Job Details']]
        job_header_table = Table(job_header_data, colWidths=[7.77*inch])
        job_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(job_header_table)
        elements.append(Spacer(1, 0.05*inch))

        # Determine Date of Survey - use survey file upload date from run if available, otherwise job start date
        if run and hasattr(run, 'survey_file') and run.survey_file and hasattr(run.survey_file, 'uploaded_at'):
            date_of_survey = run.survey_file.uploaded_at.strftime('%d-%b-%Y')
        elif run and hasattr(run, 'created_at') and run.created_at:
            date_of_survey = run.created_at.strftime('%d-%b-%Y')
        elif job.start_date:
            date_of_survey = job.start_date.strftime('%d-%b-%Y')
        else:
            date_of_survey = ''

        # Job Details Content - 4 column layout
        job_details_data = [
            ['Customer', job.customer.customer_name if job.customer else '', 'Job # Reference', job.job_number],
            ['Well Name', job.well.well_name if job.well else '', 'Rig #', job.rig.rig_number if job.rig else ''],
            ['Well Location', getattr(job.well, 'field_name', '') or '', 'Date of Survey', date_of_survey]
        ]

        job_details_table = Table(job_details_data, colWidths=[1.28*inch, 2.57*inch, 1.40*inch, 2.52*inch])
        job_details_table.setStyle(TableStyle([
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
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(job_details_table)

        # Type of Service row
        service_data = [['Type of Service Performed:', job.service.service_name if job.service else '']]
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
        elements.append(service_table)
        elements.append(Spacer(1, 0.1*inch))

        # Geodetic Location & Depth Reference Section Header
        geo_header_data = [['Geodetic Location & Depth Reference']]
        geo_header_table = Table(geo_header_data, colWidths=[7.77*inch])
        geo_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(geo_header_table)
        elements.append(Spacer(1, 0.05*inch))

        # Geodetic Location Content - Well Centre Coordinates Table
        if location:
            lat_dms = f"{location.latitude_degrees or ''}° {location.latitude_minutes or ''}' {location.latitude_seconds or ''}\" N" if location.latitude_degrees is not None else ''
            lon_dms = f"{location.longitude_degrees or ''}° {location.longitude_minutes or ''}' {location.longitude_seconds or ''}\" E" if location.longitude_degrees is not None else ''
            lat_decimal = f"{location.latitude}°N" if location.latitude else ''
            lon_decimal = f"{location.longitude}°E" if location.longitude else ''

            well_coords_data = [
                ['Well Centre\nCoordinates', 'Latitude', lat_dms, 'N', '=', lat_decimal, 'UTM\nCoordinates', 'Northing', f"{location.northing}m N" if location.northing else ''],
                ['', 'Longitude', lon_dms, 'E', '=', lon_decimal, '', 'Easting', f"{location.easting}m E" if location.easting else ''],
            ]
        else:
            well_coords_data = [
                ['Well Centre\nCoordinates', 'Latitude', '', 'N', '=', '', 'UTM\nCoordinates', 'Northing', ''],
                ['', 'Longitude', '', 'E', '=', '', '', 'Easting', ''],
            ]

        well_coords_table = Table(well_coords_data, colWidths=[0.99*inch, 0.76*inch, 1.17*inch, 0.29*inch, 0.29*inch, 0.93*inch, 0.99*inch, 1.05*inch, 1.30*inch])
        well_coords_table.setStyle(TableStyle([
            # Background for labels
            ('BACKGROUND', (0, 0), (0, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (1, 0), (1, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (6, 0), (6, 1), colors.HexColor('#808080')),
            ('BACKGROUND', (7, 0), (7, 1), colors.HexColor('#808080')),
            # Text color for labels
            ('TEXTCOLOR', (0, 0), (0, 1), colors.white),
            ('TEXTCOLOR', (1, 0), (1, 1), colors.white),
            ('TEXTCOLOR', (6, 0), (6, 1), colors.white),
            ('TEXTCOLOR', (7, 0), (7, 1), colors.white),
            # Font
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            # Grid and alignment
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        elements.append(well_coords_table)
        elements.append(Spacer(1, 0.08*inch))  # Gap between the two tables

        # Geodetic System and Elevation Details Table
        if location:
            # Get depth reference data if available
            depth = location.depth if hasattr(location, 'depth') else None

            geodetic_data = [
                ['Geodetic System', location.geodetic_system or '', '', '', '', '', 'Elevation Referred', 'Mean Sea Level (MSL)', ''],
                ['Geodetic Datum', location.geodetic_datum or '', '', '', '', '', 'Ground Level', 'above MSL', ''],
                ['Map Zone', location.map_zone or '', '', '', '', '', 'Reference Datum', 'RKB / DFE (Drill Floor Elevation)', ''],
                ['North Reference', location.north_reference or '', '', '', '', '', 'Reference Height', 'above Ground Level', ''],
                ['Grid Correction', f"{location.grid_correction} degs" if location.grid_correction is not None else '', '', '', '', '', 'Reference Elevation', 'above MSL', ''],
                ['Central Meridian', f"{location.central_meridian}E" if location.central_meridian is not None else '', '', '', '', '', '', '', ''],
            ]
        else:
            geodetic_data = [
                ['Geodetic System', '', '', '', '', '', 'Elevation Referred', '', ''],
                ['Geodetic Datum', '', '', '', '', '', 'Ground Level', '', ''],
                ['Map Zone', '', '', '', '', '', 'Reference Datum', '', ''],
                ['North Reference', '', '', '', '', '', 'Reference Height', '', ''],
                ['Grid Correction', '', '', '', '', '', 'Reference Elevation', '', ''],
                ['Central Meridian', '', '', '', '', '', '', '', ''],
            ]

        geodetic_table = Table(geodetic_data, colWidths=[0.99*inch, 0.76*inch, 1.17*inch, 0.29*inch, 0.29*inch, 0.93*inch, 0.99*inch, 1.05*inch, 1.30*inch])
        geodetic_table.setStyle(TableStyle([
            # Background for labels only
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (6, 0), (6, -2), colors.HexColor('#808080')),
            # Text color for labels
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (6, 0), (6, -2), colors.white),
            # Font - bold for labels, regular for values
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (6, 0), (6, -2), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (5, -1), 'Helvetica'),
            ('FONTNAME', (7, 0), (8, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            # Grid and alignment
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            # Merge cells for geodetic system values (columns 1-5)
            ('SPAN', (1, 0), (5, 0)),
            ('SPAN', (1, 1), (5, 1)),
            ('SPAN', (1, 2), (5, 2)),
            ('SPAN', (1, 3), (5, 3)),
            ('SPAN', (1, 4), (5, 4)),
            ('SPAN', (1, 5), (5, 5)),
            # Merge cells for elevation values (columns 7-8)
            ('SPAN', (7, 0), (8, 0)),
            ('SPAN', (7, 1), (8, 1)),
            ('SPAN', (7, 2), (8, 2)),
            ('SPAN', (7, 3), (8, 3)),
            ('SPAN', (7, 4), (8, 4)),
        ]))
        elements.append(geodetic_table)
        elements.append(Spacer(1, 0.1*inch))

        # Equipment Details Section Header
        equip_header_data = [['Equipment Details']]
        equip_header_table = Table(equip_header_data, colWidths=[7.77*inch])
        equip_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#c23c3e')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(equip_header_table)
        elements.append(Spacer(1, 0.05*inch))

        # Equipment Details Content - 4 column layout
        equipment_data = [
            ['Wireline Unit #', '', 'Displacement Referred to', 'Well Head'],
            ['Pick-up #', '', 'Vertical Section Reference', 'Well Centre'],
            ['GyroFlex Tool Serial #', '', 'Vertical Section Azimuth', 'degs'],
            ['Memory Module #', '', 'Survey Calculation Method', 'Minimum Curvature'],
            ['Electronic Module #', '', '', ''],
            ['Wireline CIU #', '', '', ''],
            ['UBHO Serial #', '', '', ''],
            ['Pump Down Kit #', '', '', ''],
        ]

        equipment_table = Table(equipment_data, colWidths=[1.75*inch, 2.10*inch, 1.99*inch, 1.93*inch])
        equipment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            ('BACKGROUND', (2, 0), (2, 3), colors.HexColor('#808080')),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, 3), colors.white),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, 3), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(equipment_table)
        elements.append(Spacer(1, 0.1*inch))

        # Survey Details and Tie-on Details Headers
        survey_tieon_headers = [['Survey Details', 'Tie-on Details']]
        survey_tieon_headers_table = Table(survey_tieon_headers, colWidths=[3.885*inch, 3.885*inch])
        survey_tieon_headers_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#c23c3e')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#c8a078')),
            ('TEXTCOLOR', (0, 0), (0, 0), colors.white),
            ('TEXTCOLOR', (1, 0), (1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(survey_tieon_headers_table)
        elements.append(Spacer(1, 0.05*inch))

        # Survey and Tie-on Details Content
        # Get tie-on and survey data from run if available
        tieon = None
        depth = None
        well = None
        if run:
            tieon = run.tieon if hasattr(run, 'tieon') else None
            depth = run.depth if hasattr(run, 'depth') else None
            well = run.well if hasattr(run, 'well') else None

        # Try to get survey data range for "survey from/to"
        survey_from_val = ''
        survey_to_val = ''
        survey_footage_val = ''

        # Get survey interval values from tieon
        if tieon:
            survey_from_val = f"{tieon.survey_interval_from:.2f}" if tieon.survey_interval_from is not None else ''
            survey_to_val = f"{tieon.survey_interval_to:.2f}" if tieon.survey_interval_to is not None else ''

            # Calculate survey meterage (length) - use stored value or calculate from interval
            if tieon.survey_interval_length is not None:
                survey_footage_val = f"{tieon.survey_interval_length:.2f}"
            elif tieon.survey_interval_from is not None and tieon.survey_interval_to is not None:
                survey_footage_val = f"{(tieon.survey_interval_to - tieon.survey_interval_from):.2f}"
            else:
                survey_footage_val = ''

        # Survey Details (left side)
        # Get well type from tieon (vertical or deviated)
        well_type = tieon.well_type if tieon and tieon.well_type else ''

        # Get hole section from tieon.hole_section_master
        hole_section = ''
        if tieon and hasattr(tieon, 'hole_section_master') and tieon.hole_section_master:
            hole_section = tieon.hole_section_master.hole_section_name

        # Get minimum ID from tieon.minimum_id
        minimum_id = ''
        if tieon and hasattr(tieon, 'minimum_id') and tieon.minimum_id:
            minimum_id = tieon.minimum_id.minimum_id_name

        survey_tool_type = run.run_type if run and run.run_type else ''

        # Get survey performed in from tieon.survey_run_in
        survey_performed_in = ''
        if tieon and hasattr(tieon, 'survey_run_in') and tieon.survey_run_in:
            survey_performed_in = tieon.survey_run_in.run_in_name

        # Tie-on Details (right side) - Format to 2 decimal places
        tieon_md = f"{tieon.md:.2f} m" if tieon and tieon.md is not None else ''
        tieon_inc = f"{tieon.inc:.2f}°" if tieon and tieon.inc is not None else ''
        tieon_azi = f"{tieon.azi:.2f}°" if tieon and tieon.azi is not None else ''
        tieon_tvd = f"{tieon.tvd:.2f} m" if tieon and tieon.tvd is not None else ''
        tieon_lat = f"{tieon.latitude:.2f}" if tieon and tieon.latitude is not None else ''
        tieon_dep = f"{tieon.departure:.2f}" if tieon and tieon.departure is not None else ''
        data_obtained_by = 'Client Representative'

        # Format survey from/to display
        survey_from_to_display = f"{survey_from_val} to {survey_to_val}" if survey_from_val and survey_to_val else ''

        survey_tieon_data = [
            ['Well Type', well_type, 'Measured Depth', tieon_md],
            ['Hole Section', hole_section, 'Inclination', tieon_inc],
            ['Minimum ID', minimum_id, 'Azimuth', tieon_azi],
            ['Survey Tool Type', survey_tool_type, 'True Vertical Depth', tieon_tvd],
            ['Survey Performed in', survey_performed_in, 'Latitude (+N/-S)', tieon_lat],
            ['Survey from', survey_from_to_display, 'Departure (+E/-W)', tieon_dep],
            ['Survey Meterage', survey_footage_val, 'Data Obtained By', data_obtained_by],
        ]

        survey_tieon_table = Table(survey_tieon_data, colWidths=[1.40*inch, 2.485*inch, 1.40*inch, 2.485*inch])
        survey_tieon_table.setStyle(TableStyle([
            # Survey Details backgrounds
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#808080')),
            # Tie-on Details backgrounds
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#c8a078')),
            # Text colors
            ('TEXTCOLOR', (0, 0), (0, -1), colors.white),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.black),
            # Font - bold for labels, regular for values
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTNAME', (3, 0), (3, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            # Grid and alignment
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(survey_tieon_table)
        elements.append(Spacer(1, 0.1*inch))

        # Signature Section
        signature_data = [
            ['TASK-TARGET\nRepresentative', '_' * 70],
            ['Customer\nRepresentative', '_' * 70],
        ]

        signature_table = Table(signature_data, colWidths=[1.75*inch, 6.02*inch])
        signature_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(signature_table)

        # Build PDF
        doc.build(elements)

        # Get the value of the BytesIO buffer and return it
        pdf = buffer.getvalue()
        buffer.close()
        return pdf
