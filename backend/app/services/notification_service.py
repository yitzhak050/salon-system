from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
import datetime
import re
from app.models.notification import Notification
from app.models.user import User
from app.models.shift import Shift, ShiftAssignment
from app.utils.timezone import now_il_naive
from fastapi import HTTPException

SLOT_HEBREW_LABELS = {
    "MORNING": "בוקר (10:00-14:00)",
    "AFTERNOON": "צהריים (14:00-18:00)",
    "EVENING": "ערב (18:00-22:00)",
}

def _extract_shift_start_hour_min(slot, notes: str = None):
    if notes:
        m = re.search(r'(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}', notes)
        if m:
            try:
                return int(m.group(1)), int(m.group(2))
            except Exception:
                pass
    slot_str = slot.value if hasattr(slot, "value") else str(slot)
    if slot_str == "MORNING":
        return 10, 0
    elif slot_str == "AFTERNOON":
        return 14, 0
    return 18, 0


async def create_in_app_notification(db: AsyncSession, user_id: str, message: str) -> Notification:
    notif = Notification(user_id=str(user_id), message=message, is_read=False)
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif


async def check_and_create_shift_reminders(db: AsyncSession, user: User) -> None:
    """
    Automatically generates non-nagging shift reminders for the user if notifications_enabled is True:
    1. One day before an assigned shift.
    2. One hour before an assigned shift starts.
    3. Once when a month's shifts are published (current month or next month) if the user has < 2 shifts.
    Each reminder is created at most ONCE.
    """
    if getattr(user, "notifications_enabled", True) is False:
        return

    now_dt = now_il_naive()
    today_date = now_dt.date()
    tomorrow_date = today_date + datetime.timedelta(days=1)

    # Load recent notifications for this user to avoid duplicates
    existing_res = await db.execute(
        select(Notification.message)
        .filter(Notification.user_id == str(user.id))
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    existing_messages = set(existing_res.scalars().all())
    added_any = False

    # Check upcoming shifts for today and tomorrow
    stmt = (
        select(ShiftAssignment, Shift)
        .join(Shift, ShiftAssignment.shift_id == Shift.id)
        .filter(
            ShiftAssignment.user_id == str(user.id),
            Shift.is_active == True,
            Shift.date >= today_date,
            Shift.date <= tomorrow_date,
        )
    )
    rows = (await db.execute(stmt)).all()

    for assignment, shift in rows:
        slot_key = shift.slot.value if hasattr(shift.slot, "value") else str(shift.slot)
        slot_heb = SLOT_HEBREW_LABELS.get(slot_key, slot_key)
        sh, sm = _extract_shift_start_hour_min(shift.slot, assignment.notes)
        start_time_str = f"{sh:02d}:{sm:02d}"
        date_str = shift.date.strftime("%d.%m.%Y")

        # 1. Reminder 1 day before the shift
        if shift.date == tomorrow_date:
            msg_day_before = f"תזכורת: מחר ({date_str}) יש לך משמרת {slot_heb} בסלון הקהילתי! 📅"
            if msg_day_before not in existing_messages:
                db.add(Notification(user_id=str(user.id), message=msg_day_before, is_read=False))
                existing_messages.add(msg_day_before)
                added_any = True

        # 2. Reminder ~1 hour before the shift starts (between 5 minutes after start and 90 minutes before start)
        if shift.date == today_date:
            shift_start_dt = datetime.datetime.combine(shift.date, datetime.time(sh, sm))
            minutes_until = (shift_start_dt - now_dt).total_seconds() / 60.0
            if -5 <= minutes_until <= 90:
                msg_hour_before = f"תזכורת קרובה: בעוד כשעה ({start_time_str}) מתחילה המשמרת שלך ({slot_heb}) בסלון הקהילתי! ({date_str}) ⏰"
                if msg_hour_before not in existing_messages:
                    db.add(Notification(user_id=str(user.id), message=msg_hour_before, is_read=False))
                    existing_messages.add(msg_hour_before)
                    added_any = True

    # 3. Check if a month's shift board was published (current month & next month) and user has < 2 shifts
    next_month = 1 if today_date.month == 12 else today_date.month + 1
    next_year = today_date.year + 1 if today_date.month == 12 else today_date.year

    for m, y in [(today_date.month, today_date.year), (next_month, next_year)]:
        month_msg = f"לוח המשמרות לחודש {m:02d}/{y} פתוח! תזכורת ידידותית להירשם ללפחות 2 משמרות החודש 📅"
        if month_msg in existing_messages:
            continue

        # Check if shifts exist for (m, y)
        shifts_count_res = await db.execute(
            select(func.count()).select_from(Shift).filter(
                func.extract("month", Shift.date) == m,
                func.extract("year", Shift.date) == y,
                Shift.is_active == True,
            )
        )
        if (shifts_count_res.scalar() or 0) > 0:
            # Check how many shifts the user already signed up for in (m, y)
            user_shifts_res = await db.execute(
                select(func.count())
                .select_from(ShiftAssignment)
                .join(Shift, ShiftAssignment.shift_id == Shift.id)
                .filter(
                    ShiftAssignment.user_id == str(user.id),
                    func.extract("month", Shift.date) == m,
                    func.extract("year", Shift.date) == y,
                )
            )
            if (user_shifts_res.scalar() or 0) < 2:
                db.add(Notification(user_id=str(user.id), message=month_msg, is_read=False))
                existing_messages.add(month_msg)
                added_any = True

    if added_any:
        await db.commit()


async def get_notifications(db: AsyncSession, user_id: str) -> list:
    result = await db.execute(
        select(Notification)
        .filter(Notification.user_id == str(user_id))
        .order_by(Notification.created_at.desc())
    )
    return list(result.scalars().all())


async def mark_notification_as_read(db: AsyncSession, notification_id: str, user_id: str) -> Notification:
    result = await db.execute(
        select(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == str(user_id)
        )
    )
    notif = result.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    await db.refresh(notif)
    return notif


async def mark_all_as_read(db: AsyncSession, user_id: str) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == str(user_id))
        .where(Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return result.rowcount


def send_sms_stub(phone: str, message: str) -> None:
    # TODO: חבר כאן ספק SMS (Inforu, Twilio וכו')
    print(f"[SMS STUB → {phone}]: {message}")
