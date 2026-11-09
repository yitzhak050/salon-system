from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import uuid
import datetime
import re
import os
import io
from typing import Optional
from app.utils.timezone import now_il_naive
from app.models.shift import Shift, ShiftAssignment, ShiftSlotEnum
from app.models.user import User
from app.schemas.report import VolunteerStats, AdminStats, ShiftGap, AttendanceShiftItem, VolunteerAttendanceReport
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HEBREW_DAYS = {
    6: "ראשון",
    0: "שני",
    1: "שלישי",
    2: "רביעי",
    3: "חמישי",
    4: "שישי",
    5: "שבת"
}

SLOT_HEBREW = {
    "MORNING": "בוקר",
    "AFTERNOON": "צהריים",
    "EVENING": "ערב",
}

def get_slot_hours_range(slot, notes: Optional[str] = None):
    """
    Extract start time, end time, duration and display string.
    Checks notes for custom ranges like 'שעות: 10:00-14:00' or '10:00-12:30'.
    """
    if notes:
        m = re.search(r'(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', notes)
        if m:
            start_str, end_str = m.group(1), m.group(2)
            try:
                sh, sm = map(int, start_str.split(':'))
                eh, em = map(int, end_str.split(':'))
                dur = (eh + em / 60.0) - (sh + sm / 60.0)
                if dur > 0:
                    return sh, sm, eh, em, dur, f"{start_str}-{end_str}"
            except Exception:
                pass

    slot_str = slot.value if hasattr(slot, 'value') else str(slot)
    if slot_str == "MORNING":
        return 10, 0, 14, 0, 4.0, "10:00-14:00"
    elif slot_str == "AFTERNOON":
        return 14, 0, 18, 0, 4.0, "14:00-18:00"
    else:
        return 18, 0, 22, 0, 4.0, "18:00-22:00"

def calculate_actual_hours_for_assignment(assignment: ShiftAssignment, shift: Shift, now_dt: Optional[datetime.datetime] = None) -> float:
    """
    Calculates actual hours completed for an assignment:
    1. If explicit hours_logged > 0, return hours_logged.
    2. If shift start time has arrived (past shift or today with current time >= shift start time),
       automatically credit the scheduled shift hours (even if clock-in wasn't clicked).
    3. If future shift, return 0.0.
    """
    if assignment.hours_logged is not None and assignment.hours_logged > 0:
        return round(float(assignment.hours_logged), 2)

    if not shift or not shift.date:
        return 0.0

    if now_dt is None:
        now_dt = now_il_naive()

    sh, sm, _, _, scheduled_duration, _ = get_slot_hours_range(shift.slot, assignment.notes)
    shift_start_dt = datetime.datetime.combine(shift.date, datetime.time(sh, sm))

    # If shift is in the past, or today and current time has reached start time:
    if now_dt >= shift_start_dt:
        return round(scheduled_duration, 2)

    return 0.0

async def get_volunteer_stats(db: AsyncSession, user_id: uuid.UUID, goal_hours: float = 60.0, year: Optional[int] = None) -> VolunteerStats:
    """
    Calculates yearly volunteer stats for actual hours completed.
    Defaults to current year.
    """
    if year is None:
        year = datetime.date.today().year

    user_res = await db.execute(select(User).filter(User.id == str(user_id)))
    user = user_res.scalars().first()

    stmt = (
        select(ShiftAssignment, Shift)
        .join(Shift, ShiftAssignment.shift_id == Shift.id)
        .filter(
            ShiftAssignment.user_id == str(user_id),
            func.extract('year', Shift.date) == year
        )
        .order_by(Shift.date.asc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    now_dt = now_il_naive()
    total_hours = 0.0
    shift_count = 0

    for assignment, shift in rows:
        actual_h = calculate_actual_hours_for_assignment(assignment, shift, now_dt)
        total_hours += actual_h
        if actual_h > 0:
            shift_count += 1

    total_hours = round(total_hours, 1)
    progress_pct = min(100.0, round((total_hours / goal_hours) * 100, 1)) if goal_hours else 0.0

    return VolunteerStats(
        user_id=str(user_id),
        user_name=user.name if user else "מתנדב",
        total_hours=total_hours,
        shift_count=shift_count,
        goal_hours=goal_hours,
        progress_pct=progress_pct,
        year=year
    )

async def get_all_users_yearly_stats(db: AsyncSession, year: Optional[int] = None) -> dict:
    if year is None:
        year = datetime.date.today().year
    
    users_res = await db.execute(select(User).filter(User.deleted_at == None))
    users = users_res.scalars().all()
    
    stmt = (
        select(ShiftAssignment, Shift)
        .join(Shift, ShiftAssignment.shift_id == Shift.id)
        .filter(func.extract('year', Shift.date) == year)
    )
    res = await db.execute(stmt)
    rows = res.all()
    
    now_dt = now_il_naive()
    user_hours = {str(u.id): 0.0 for u in users}
    
    for assignment, shift in rows:
        uid = str(assignment.user_id)
        if uid in user_hours:
            actual_h = calculate_actual_hours_for_assignment(assignment, shift, now_dt)
            if actual_h > 0:
                user_hours[uid] += actual_h
                
    # Round hours
    return {uid: round(hours, 1) for uid, hours in user_hours.items()}

async def get_volunteer_attendance_report(
    db: AsyncSession,
    user_id: uuid.UUID,
    year: Optional[int] = None,
    filter_type: Optional[str] = None
) -> VolunteerAttendanceReport:
    """
    Generates an attendance report with detailed records for every shift assigned.
    Supports filter_type:
      - 'month': last month (from 30 days ago until today)
      - 'year': last year (from 365 days ago until today)
      - 'all': all shifts ever
      - or fallback to specific calendar year if filter_type is None.
    """
    now_dt = now_il_naive()
    today_date = now_dt.date()

    user_res = await db.execute(select(User).filter(User.id == str(user_id)))
    user = user_res.scalars().first()

    stmt = (
        select(ShiftAssignment, Shift)
        .join(Shift, ShiftAssignment.shift_id == Shift.id)
        .filter(ShiftAssignment.user_id == str(user_id))
    )

    period_label = f"שנת {year or today_date.year}"
    report_year = year or today_date.year
    if filter_type == "month":
        start_date = today_date - datetime.timedelta(days=30)
        stmt = stmt.filter(Shift.date >= start_date, Shift.date <= today_date)
        period_label = f"חודש אחרון ({start_date.strftime('%d.%m.%Y')} - {today_date.strftime('%d.%m.%Y')})"
    elif filter_type == "year":
        start_date = today_date - datetime.timedelta(days=365)
        stmt = stmt.filter(Shift.date >= start_date, Shift.date <= today_date)
        period_label = f"שנה אחרונה ({start_date.strftime('%d.%m.%Y')} - {today_date.strftime('%d.%m.%Y')})"
    elif filter_type == "all":
        period_label = "כל המשמרות (מכל הזמנים)"
    else:
        if year is None:
            year = today_date.year
        stmt = stmt.filter(func.extract('year', Shift.date) == year)
        period_label = f"שנת {year}"
        report_year = year

    stmt = stmt.order_by(Shift.date.asc(), Shift.slot.asc())
    res = await db.execute(stmt)
    rows = res.all()

    now_dt = now_il_naive()
    records = []
    total_hours = 0.0

    for assignment, shift in rows:
        actual_h = calculate_actual_hours_for_assignment(assignment, shift, now_dt)
        sh, sm, _, _, dur, hours_range = get_slot_hours_range(shift.slot, assignment.notes)
        shift_start_dt = datetime.datetime.combine(shift.date, datetime.time(sh, sm))

        if assignment.clock_out:
            status = "הושלמה"
        elif assignment.clock_in:
            if now_dt >= shift_start_dt + datetime.timedelta(hours=dur):
                status = "הושלמה"
            else:
                status = "במשמרת פעילה"
        elif now_dt >= shift_start_dt:
            status = "אושר לפי מועד"
        else:
            status = "מתוכננת"

        slot_key = shift.slot.value if hasattr(shift.slot, 'value') else str(shift.slot)
        slot_name = SLOT_HEBREW.get(slot_key, slot_key)
        day_name = HEBREW_DAYS.get(shift.date.weekday(), "")

        ci_str = assignment.clock_in.strftime("%H:%M") if assignment.clock_in else None
        co_str = assignment.clock_out.strftime("%H:%M") if assignment.clock_out else None

        records.append(AttendanceShiftItem(
            assignment_id=str(assignment.id),
            shift_id=str(shift.id),
            date=shift.date,
            day_of_week=day_name,
            slot=slot_name,
            hours_range=hours_range,
            clock_in=ci_str,
            clock_out=co_str,
            hours_logged=actual_h,
            status=status,
            notes=assignment.notes
        ))
        total_hours += actual_h

    return VolunteerAttendanceReport(
        user_id=str(user_id),
        user_name=user.name if user else "מתנדב",
        year=report_year,
        period_label=period_label,
        total_hours=round(total_hours, 1),
        shift_count=len([r for r in records if r.hours_logged > 0]),
        records=records
    )

async def get_admin_stats(db: AsyncSession, month: int, year: int) -> AdminStats:
    shifts_res = await db.execute(select(Shift).filter(
        func.extract('month', Shift.date) == month,
        func.extract('year', Shift.date) == year
    ))
    shifts = shifts_res.scalars().all()

    if shifts:
        assign_res = await db.execute(select(ShiftAssignment).filter(
            ShiftAssignment.shift_id.in_([s.id for s in shifts])
        ))
        assignments = assign_res.scalars().all()
    else:
        assignments = []

    shift_counts = {}
    for a in assignments:
        shift_counts[a.shift_id] = shift_counts.get(a.shift_id, 0) + 1

    gaps = []
    for s in shifts:
        if shift_counts.get(s.id, 0) == 0:
            gaps.append(ShiftGap(date=s.date, slot=s.slot))

    users_res = await db.execute(select(User))
    users = users_res.scalars().all()

    shift_lookup = {s.id: s for s in shifts}
    now_dt = now_il_naive()

    user_stats = []
    for u in users:
        if not u.is_active:
            continue
        u_assignments = [a for a in assignments if str(a.user_id) == str(u.id)]
        total_hours = sum(
            calculate_actual_hours_for_assignment(a, shift_lookup.get(a.shift_id), now_dt)
            for a in u_assignments
        )
        user_stats.append(VolunteerStats(
            user_id=str(u.id),
            user_name=u.name,
            total_hours=round(total_hours, 1),
            shift_count=len(u_assignments),
            year=year
        ))

    return AdminStats(
        month=month,
        year=year,
        shifts_with_gap=gaps,
        volunteer_stats=user_stats
    )

def _get_pdf_font():
    font_name = "Helvetica"
    font_path = "C:\\Windows\\Fonts\\arial.ttf"
    if os.path.exists(font_path):
        try:
            pdfmetrics.registerFont(TTFont("ArialHebrew", font_path))
            font_name = "ArialHebrew"
        except Exception:
            pass
    return font_name

def export_volunteer_pdf(report: VolunteerAttendanceReport) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    font_name = _get_pdf_font()
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HebrewTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=18,
        alignment=1,
        spaceAfter=20
    )
    
    normal_style = ParagraphStyle(
        'HebrewNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=12,
        alignment=2
    )

    elements = []
    
    elements.append(Paragraph(bidi_text(f"דוח נוכחות והתנדבות - סלון קהילתי"), title_style))
    elements.append(Paragraph(bidi_text(f"שנת הדוח: {report.year}"), normal_style))
    elements.append(Paragraph(bidi_text(f"שם המתנדב: {report.user_name}"), normal_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(bidi_text(f"סך הכל שעות פעילות: {report.total_hours}"), normal_style))
    elements.append(Paragraph(bidi_text(f"משמרות שהושלמו: {report.shift_count}"), normal_style))
    elements.append(Spacer(1, 20))
    
    data = [[
        bidi_text("סטטוס"),
        bidi_text("שעות שבוצעו"),
        bidi_text("כניסה/יציאה"),
        bidi_text("משמרת"),
        bidi_text("יום"),
        bidi_text("תאריך")
    ]]
    
    for item in report.records:
        in_out = f"{item.clock_in or '-'} / {item.clock_out or '-'}"
        data.append([
            bidi_text(item.status),
            str(item.hours_logged),
            bidi_text(in_out),
            bidi_text(f"{item.slot} ({item.hours_range})"),
            bidi_text(item.day_of_week),
            str(item.date)
        ])
        
    t = Table(data, colWidths=[60, 60, 80, 120, 80, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
    ]))
    
    elements.append(t)
    doc.build(elements)
    
    buffer.seek(0)
    return buffer.getvalue()

from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def bidi_text(text: str) -> str:
    # Basic RTL support if string contains Hebrew
    text_str = str(text)
    if any("\u0590" <= c <= "\u05FF" for c in text_str):
        # A simple hack for RTL: reverse the string
        return text_str[::-1]
    return text_str

def export_admin_pdf(stats: AdminStats) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    font_name = _get_pdf_font()
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HebrewTitle',
        parent=styles['Heading1'],
        fontName=font_name,
        fontSize=18,
        alignment=1, # Center
        spaceAfter=20
    )
    
    normal_style = ParagraphStyle(
        'HebrewNormal',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=11,
        alignment=2 # Right align for RTL
    )

    elements = []
    
    # Title
    elements.append(Paragraph(bidi_text(f"דוח סיכום פעילות והתנדבות - סלון קהילתי"), title_style))
    elements.append(Paragraph(bidi_text(f"תקופת הדוח: {stats.month}/{stats.year}"), normal_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(bidi_text(f"סה״כ מתנדבים רשומים: {len(stats.volunteer_stats)}"), normal_style))
    elements.append(Paragraph(bidi_text(f"משמרות ללא שיבוץ (פערים): {len(stats.shifts_with_gap)}"), normal_style))
    elements.append(Spacer(1, 20))
    
    # Volunteer Table
    elements.append(Paragraph(bidi_text("פירוט שעות מתנדבים:"), title_style))
    
    # Table Header (Reversed order for RTL)
    data = [[
        bidi_text("סטטוס"),
        bidi_text("שעות"),
        bidi_text("משמרות"),
        bidi_text("שם מתנדב")
    ]]
    
    for v in stats.volunteer_stats:
        status = "פעיל" if (v.shift_count or 0) >= 2 else "לא פעיל"
        if (v.shift_count or 0) == 0:
            status = "0 משמרות"
            
        data.append([
            bidi_text(status),
            str(v.total_hours),
            str(v.shift_count),
            bidi_text(v.user_name)
        ])
        
    t = Table(data, colWidths=[100, 100, 100, 200])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), font_name),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
    ]))
    
    elements.append(t)
    
    if stats.shifts_with_gap:
        elements.append(Spacer(1, 30))
        elements.append(Paragraph(bidi_text("משמרות ללא שיבוץ (פערים):"), title_style))
        gap_data = [[bidi_text("משמרת"), bidi_text("תאריך")]]
        for g in stats.shifts_with_gap:
            slot_val = g.slot.value if hasattr(g.slot, 'value') else str(g.slot)
            slot_heb = SLOT_HEBREW.get(slot_val, slot_val)
            gap_data.append([bidi_text(slot_heb), str(g.date)])
        
        gt = Table(gap_data, colWidths=[150, 150])
        gt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d32f2f')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey])
        ]))
        elements.append(gt)

    doc.build(elements)
    
    buffer.seek(0)
    return buffer.getvalue()
