from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import datetime
import calendar
from fastapi import HTTPException
import uuid
from typing import Optional
from app.models.shift import Shift, ShiftSlotEnum, ShiftAssignment
from app.models.user import User, RoleEnum
from app.services.notification_service import create_in_app_notification
from app.schemas.shift import CreateShiftRequest, UpdateShiftRequest, CustomSignupRequest

SLOT_HEBREW = {
    ShiftSlotEnum.MORNING: "בוקר (10:00-14:00)",
    ShiftSlotEnum.AFTERNOON: "צהריים (14:00-18:00)",
    ShiftSlotEnum.EVENING: "ערב (18:00-22:00)",
}

SLOT_START_HOURS = {
    ShiftSlotEnum.MORNING: 10,
    ShiftSlotEnum.AFTERNOON: 14,
    ShiftSlotEnum.EVENING: 18,
}

async def generate_monthly_shifts(db: AsyncSession, month: int, year: int, requester: User) -> list[uuid.UUID]:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")

    existing = await db.execute(select(Shift).filter(
        func.extract('month', Shift.date) == month,
        func.extract('year', Shift.date) == year
    ))
    existing_dates = {(s.date, s.slot) for s in existing.scalars().all()}
    
    num_days = calendar.monthrange(year, month)[1]
    new_shifts = []
    
    for day in range(1, num_days + 1):
        d = datetime.date(year, month, day)
        # Skip Friday and Saturday - salon is normally closed on weekends
        if d.weekday() in (4, 5):
            continue
        for slot in ShiftSlotEnum:
            if (d, slot) not in existing_dates:
                shift = Shift(date=d, slot=slot, max_volunteers=1, created_by=requester.id)
                db.add(shift)
                new_shifts.append(shift)
                
    if new_shifts:
        await db.commit()
        for s in new_shifts:
            await db.refresh(s)
            
    return [s.id for s in new_shifts]


async def get_shifts_for_month(db: AsyncSession, month: int, year: int):
    result = await db.execute(select(Shift).filter(
        func.extract('month', Shift.date) == month,
        func.extract('year', Shift.date) == year
    ).order_by(Shift.date, Shift.slot))
    shifts = list(result.scalars().all())
    
    if not shifts:
        return []

    shift_ids = [s.id for s in shifts]
    assign_stmt = (
        select(ShiftAssignment, User.name)
        .outerjoin(User, ShiftAssignment.user_id == User.id)
        .filter(ShiftAssignment.shift_id.in_(shift_ids))
    )
    assign_res = await db.execute(assign_stmt)
    
    assignments_by_shift = {}
    for assignment, user_name in assign_res.all():
        assignment_data = {
            "id": str(assignment.id),
            "shift_id": str(assignment.shift_id),
            "user_id": str(assignment.user_id),
            "user_name": user_name,
            "clock_in": assignment.clock_in,
            "clock_out": assignment.clock_out,
            "hours_logged": assignment.hours_logged,
            "notes": assignment.notes
        }
        assignments_by_shift.setdefault(str(assignment.shift_id), []).append(assignment_data)

    for s in shifts:
        s_assignments = assignments_by_shift.get(str(s.id), [])
        s.assignments = s_assignments
        s.assignment_count = len(s_assignments)

    return shifts

async def assign_volunteer_to_shift(db: AsyncSession, shift_id: str, user_id: str, notes: Optional[str] = None, requester: Optional[User] = None) -> ShiftAssignment:
    # Validate shift
    s_res = await db.execute(select(Shift).filter(Shift.id == str(shift_id)))
    shift = s_res.scalars().first()
    if not shift or not shift.is_active:
        raise HTTPException(status_code=400, detail="משמרת לא תקינה או לא פעילה")

    # Block past-shift registration for non-managers
    is_manager = requester and requester.role == RoleEnum.SALON_MANAGER
    if shift.date < datetime.date.today() and not is_manager:
        raise HTTPException(status_code=400, detail="לא ניתן להירשם למשמרת שתאריכה כבר עבר")
        
    # Validate not already assigned
    a_res = await db.execute(select(ShiftAssignment).filter(
        ShiftAssignment.shift_id == str(shift_id),
        ShiftAssignment.user_id == str(user_id)
    ))
    if a_res.scalars().first():
        raise HTTPException(status_code=400, detail="המתנדב כבר רשום למשמרת זו")

    # Validate shift capacity (default 1 volunteer, unless manager increased it)
    assign_count_res = await db.execute(
        select(func.count()).select_from(ShiftAssignment).filter(ShiftAssignment.shift_id == str(shift_id))
    )
    current_count = assign_count_res.scalar() or 0
    max_allowed = shift.max_volunteers if shift.max_volunteers is not None else 1
    if current_count >= max_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"המשמרת כבר מלאה (מקסימום {max_allowed} אחראים/מתנדבים)"
        )
        
    assignment = ShiftAssignment(shift_id=str(shift_id), user_id=str(user_id), notes=notes)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    
    slot_label = SLOT_HEBREW.get(shift.slot, str(shift.slot.value))
    title_suffix = f" ({shift.title})" if shift.title else ""
    await create_in_app_notification(
        db,
        user_id,
        f"שובצת בהצלחה למשמרת{title_suffix} בתאריך {shift.date.strftime('%d/%m/%Y')} ({slot_label})"
    )
    
    return assignment

async def unassign_volunteer(db: AsyncSession, assignment_id: str, requester: User) -> None:
    res = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.id == str(assignment_id)))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="שיבוץ לא נמצא")
        
    # Non-managers (volunteers and operators) can only unassign themselves and must abide by 24h cutoff
    if requester.role != RoleEnum.SALON_MANAGER:
        if str(assignment.user_id) != str(requester.id):
            raise HTTPException(status_code=403, detail="אין הרשאה לבטל שיבוץ של מתנדב אחר")
            
        # 24-hour cancellation rule
        shift_res = await db.execute(select(Shift).filter(Shift.id == assignment.shift_id))
        shift = shift_res.scalars().first()
        if shift:
            start_hour = SLOT_START_HOURS.get(shift.slot, 10)
            shift_start_dt = datetime.datetime.combine(shift.date, datetime.time(start_hour, 0))
            now_dt = datetime.datetime.now()
            if now_dt + datetime.timedelta(hours=24) > shift_start_dt:
                raise HTTPException(
                    status_code=400,
                    detail="לא ניתן לבטל הרשמה פחות מ-24 שעות לפני מועד תחילת המשמרת"
                )
    else:
        shift_res = await db.execute(select(Shift).filter(Shift.id == assignment.shift_id))
        shift = shift_res.scalars().first()

    user_id_to_notify = assignment.user_id
    await db.delete(assignment)
    await db.commit()

    if shift:
        slot_label = SLOT_HEBREW.get(shift.slot, str(shift.slot.value))
        await create_in_app_notification(
            db,
            user_id_to_notify,
            f"בוטל השיבוץ למשמרת בתאריך {shift.date.strftime('%d/%m/%Y')} ({slot_label})"
        )

async def create_shift(db: AsyncSession, req: CreateShiftRequest, requester: User) -> Shift:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    shift = Shift(
        date=req.date,
        slot=req.slot,
        title=req.title,
        max_volunteers=req.max_volunteers or 1,
        created_by=requester.id
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    shift.assignments = []
    shift.assignment_count = 0
    return shift

async def update_shift(db: AsyncSession, shift_id: str, req: UpdateShiftRequest, requester: User) -> Shift:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    res = await db.execute(select(Shift).filter(Shift.id == str(shift_id)))
    shift = res.scalars().first()
    if not shift:
        raise HTTPException(status_code=404, detail="משמרת לא נמצאה")
        
    if req.title is not None:
        shift.title = req.title
    if req.max_volunteers is not None:
        shift.max_volunteers = req.max_volunteers
    if req.is_active is not None:
        shift.is_active = req.is_active
        
    await db.commit()
    await db.refresh(shift)
    return shift

async def custom_shift_signup(db: AsyncSession, req: CustomSignupRequest, user: User) -> ShiftAssignment:
    # Block past-date signups for non-managers
    if req.date < datetime.date.today() and user.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=400, detail="לא ניתן להירשם להתנדבות שתאריכה כבר עבר")

    # Determine slot if omitted
    slot = req.slot
    if not slot:
        try:
            start_h = int(req.start_time.split(":")[0])
            if start_h < 14:
                slot = ShiftSlotEnum.MORNING
            elif start_h < 18:
                slot = ShiftSlotEnum.AFTERNOON
            else:
                slot = ShiftSlotEnum.EVENING
        except Exception:
            slot = ShiftSlotEnum.MORNING

    # Look for existing shift on this date and slot
    s_res = await db.execute(select(Shift).filter(
        Shift.date == req.date,
        Shift.slot == slot
    ))
    shift = s_res.scalars().first()
    
    if not shift:
        # Create a new shift for this date (e.g. weekend or special slot)
        shift = Shift(
            date=req.date,
            slot=slot,
            title=f"התנדבות {req.start_time}-{req.end_time}",
            max_volunteers=2,
            created_by=user.id
        )
        db.add(shift)
        await db.commit()
        await db.refresh(shift)

    notes = f"שעות: {req.start_time}-{req.end_time}"
    if req.notes:
        notes += f" | {req.notes}"

    return await assign_volunteer_to_shift(db, str(shift.id), str(user.id), notes=notes)

async def clock_in_shift(db: AsyncSession, shift_id: str, user_id: str, timestamp: datetime.datetime) -> ShiftAssignment:
    res = await db.execute(select(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.user_id == user_id
    ))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="שיבוץ לא נמצא")
    if assignment.clock_in:
        raise HTTPException(status_code=400, detail="כבר בוצעה כניסה")

    # Strip timezone for SQLite compatibility
    assignment.clock_in = timestamp.replace(tzinfo=None)
    await db.commit()
    await db.refresh(assignment)
    return assignment

async def clock_out_shift(db: AsyncSession, shift_id: str, user_id: str, timestamp: datetime.datetime) -> ShiftAssignment:
    res = await db.execute(select(ShiftAssignment).filter(
        ShiftAssignment.shift_id == shift_id,
        ShiftAssignment.user_id == user_id
    ))
    assignment = res.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="שיבוץ לא נמצא")
    if not assignment.clock_in:
        raise HTTPException(status_code=400, detail="טרם בוצעה כניסה")

    # Strip timezone for SQLite compatibility
    naive_ts = timestamp.replace(tzinfo=None)
    assignment.clock_out = naive_ts
    assignment.hours_logged = (naive_ts - assignment.clock_in).total_seconds() / 3600.0
    await db.commit()
    await db.refresh(assignment)
    return assignment

async def delete_shift(db: AsyncSession, shift_id: str, requester: User) -> None:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete assignments first
    assign_res = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.shift_id == str(shift_id)))
    for a in assign_res.scalars().all():
        await db.delete(a)
        
    res = await db.execute(select(Shift).filter(Shift.id == str(shift_id)))
    shift = res.scalars().first()
    if not shift:
        raise HTTPException(status_code=404, detail="משמרת לא נמצאה")
        
    await db.delete(shift)
    await db.commit()

async def batch_delete_shifts(db: AsyncSession, shift_ids: list[str], requester: User) -> int:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not shift_ids:
        return 0
    
    assign_res = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.shift_id.in_(shift_ids)))
    for a in assign_res.scalars().all():
        await db.delete(a)
        
    shifts_res = await db.execute(select(Shift).filter(Shift.id.in_(shift_ids)))
    shifts = shifts_res.scalars().all()
    count = len(shifts)
    for s in shifts:
        await db.delete(s)
        
    await db.commit()
    return count

async def delete_weekend_shifts(db: AsyncSession, month: int, year: int, requester: User) -> int:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    shifts_res = await db.execute(select(Shift).filter(
        func.extract('month', Shift.date) == month,
        func.extract('year', Shift.date) == year
    ))
    all_month_shifts = shifts_res.scalars().all()
    weekend_ids = [str(s.id) for s in all_month_shifts if s.date.weekday() in (4, 5)] # Friday=4, Saturday=5
    
    return await batch_delete_shifts(db, weekend_ids, requester)

async def batch_unassign_shifts(db: AsyncSession, shift_ids: list[str], requester: User) -> int:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not shift_ids:
        return 0
    
    assign_res = await db.execute(select(ShiftAssignment).filter(ShiftAssignment.shift_id.in_(shift_ids)))
    assignments = assign_res.scalars().all()
    count = len(assignments)
    for a in assignments:
        await db.delete(a)
    await db.commit()
    return count



