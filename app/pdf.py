from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def report_to_pdf_bytes(report: dict) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    x = 40
    y = height - 40

    c.setFont("Helvetica-Bold", 15)
    c.drawString(x, y, f"Reporte de Producción - {report.get('plant', '')}")
    y -= 28

    c.setFont("Helvetica", 11)
    def draw_label(label, value):
        nonlocal y
        c.setFont("Helvetica-Bold", 11)
        c.drawString(x, y, f"{label}:")
        c.setFont("Helvetica", 11)
        c.drawString(x+120, y, str(value))
        y -= 18
        if y < 60:
            c.showPage()
            y = height - 40

    draw_label("Fecha", report.get('date', ''))
    draw_label("Planta", report.get('plant', ''))
    if report.get('horometer_start') is not None:
        draw_label("Horómetro Inicio", report.get('horometer_start'))
    if report.get('horometer_end') is not None:
        draw_label("Horómetro Final", report.get('horometer_end'))

    # Camiones
    try:
        trucks = report.get('truck_ids')
        if isinstance(trucks, str):
            trucks = eval(trucks)
        if trucks:
            draw_label("Camiones", ', '.join(str(t) for t in trucks))
    except Exception:
        pass
    # Maquinaria
    try:
        machinery = report.get('machinery_ids')
        if isinstance(machinery, str):
            machinery = eval(machinery)
        if machinery:
            draw_label("Maquinaria", ', '.join(str(m) for m in machinery))
    except Exception:
        pass

    # Tabla de materiales
    try:
        materials = report.get('materials')
        if isinstance(materials, str):
            materials = eval(materials)
        if materials:
            c.setFont("Helvetica-Bold", 11)
            c.drawString(x, y, "Producción por material (m³):")
            y -= 18
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x+10, y, "Material")
            c.drawString(x+120, y, "m³")
            y -= 15
            c.setFont("Helvetica", 10)
            for m in materials:
                c.drawString(x+10, y, str(m.get('material_id', '')))
                c.drawString(x+120, y, str(m.get('m3', '')))
                y -= 15
                if y < 60:
                    c.showPage()
                    y = height - 40
            y -= 5
    except Exception:
        pass

    if report.get('total_m3') is not None:
        draw_label("Cantidad total (m³)", report.get('total_m3'))
    if report.get('downtime_min') is not None:
        draw_label("Minutos muertos", report.get('downtime_min'))
    if report.get('maintenances'):
        draw_label("Mantenciones", report.get('maintenances'))

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
