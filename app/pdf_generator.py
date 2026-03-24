"""
Generador de PDF para Bonos de Producción
"""
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfgen import canvas
from datetime import datetime
import json


def generate_bono_pdf(bono_data):
    """
    Genera un PDF con los datos del bono de producción
    
    Args:
        bono_data: dict con los datos del bono
        
    Returns:
        BytesIO: contenido del PDF
    """
    # Crear buffer
    buffer = BytesIO()
    
    # Crear documento PDF
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#2196F3'),
        spaceAfter=6,
        alignment=1  # centro
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2e7d32'),
        spaceAfter=6,
        spaceBefore=12
    )
    
    normal_style = styles['Normal']
    
    # Título
    elements.append(Paragraph("RESUMEN BONO DE PRODUCCIÓN", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Información general
    info_data = [
        ['Mes/Período:', bono_data.get('mes', 'N/A')],
        ['Planta:', bono_data.get('plant_name', 'Todas')],
        ['Producción Total:', f"{bono_data.get('produccion_total_m3', 0):,.2f} m³"],
        ['Horas Extra (Deducción):', f"{bono_data.get('horas_extra_m3', 0):,.2f} m³"],
        ['Producción Final:', f"{bono_data.get('produccion_final_m3', 0):,.2f} m³"],
    ]
    
    info_table = Table(info_data, colWidths=[2.5*inch, 3.5*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#333333')),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Sección de Materiales
    elements.append(Paragraph("MATERIALES DEL PERÍODO", heading_style))
    
    materiales_list = []
    try:
        if bono_data.get('materiales_resumen'):
            materiales_json = bono_data.get('materiales_resumen')
            if isinstance(materiales_json, str):
                materiales = json.loads(materiales_json)
            else:
                materiales = materiales_json
            
            materiales_list.append(['Material', 'm³'])
            total_m3 = 0
            for mat_name, m3 in materiales.items():
                materiales_list.append([mat_name, f"{m3:,.2f}"])
                total_m3 += m3
            materiales_list.append(['TOTAL', f"{total_m3:,.2f}"])
    except:
        materiales_list = [['Material', 'm³'], ['No hay datos', '']]
    
    if len(materiales_list) > 1:
        mat_table = Table(materiales_list, colWidths=[4*inch, 2*inch])
        mat_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e0e0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#2e7d32')),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9f9f9')]),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(mat_table)
        elements.append(Spacer(1, 0.2*inch))
    
    # Sección de Trabajadores
    elements.append(Paragraph("CÁLCULO DE BONOS POR TRABAJADOR", heading_style))
    
    trabajadores_data = [['Trabajador', 'Cargo', 'Precio Unitario', 'Producción', 'Total Bono']]
    
    try:
        trabajadores_json = bono_data.get('trabajadores', '[]')
        if isinstance(trabajadores_json, str):
            trabajadores = json.loads(trabajadores_json)
        else:
            trabajadores = trabajadores_json
        
        total_bono_general = 0
        produccion_final = bono_data.get('produccion_final_m3', 0)
        
        for t in trabajadores:
            nombre = t.get('nombre', 'N/A')
            cargo = t.get('cargo', 'N/A')
            precio_unitario = float(t.get('precio_unitario', 0))
            total_bono = precio_unitario * produccion_final
            total_bono_general += total_bono
            
            trabajadores_data.append([
                nombre,
                cargo,
                f"${precio_unitario:,.0f}",
                f"{produccion_final:,.2f} m³",
                f"${total_bono:,.0f}"
            ])
    except Exception as e:
        print(f"Error procesando trabajadores: {e}")
        trabajadores_data.append(['Error procesando datos', '', '', '', ''])
    
    if len(trabajadores_data) > 1:
        trab_table = Table(trabajadores_data, colWidths=[1.8*inch, 1.5*inch, 1.5*inch, 1*inch, 1.2*inch])
        trab_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e0e0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(trab_table)
        elements.append(Spacer(1, 0.15*inch))
    
    # Total general
    total_bono_general = bono_data.get('total_bono_general', 0)
    total_style = ParagraphStyle(
        'TotalStyle',
        parent=styles['Normal'],
        fontSize=13,
        textColor=colors.white,
        backColor=colors.HexColor('#2e7d32'),
        alignment=2,  # derecha
        spaceAfter=6
    )
    
    elements.append(Spacer(1, 0.1*inch))
    total_text = f"TOTAL BONO GENERAL: ${total_bono_general:,.0f}"
    total_table = Table([[total_text]], colWidths=[6*inch])
    total_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2e7d32')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(total_table)
    
    # Pie de página con timestamp
    elements.append(Spacer(1, 0.3*inch))
    timestamp = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=1
    )
    elements.append(Paragraph(f"Documento generado: {timestamp}", footer_style))
    
    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
