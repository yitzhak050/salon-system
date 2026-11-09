from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import bcrypt
from jose import jwt
import datetime
import io
import csv
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import Optional
from fastapi import HTTPException
from app.models.user import User, RoleEnum
from app.schemas.user import UserCreate, BulkImportResult
from app.config import settings
from app.utils.timezone import now_il_naive

# bcrypt 5.x — direct calls (passlib not compatible with bcrypt>=5.0)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = now_il_naive() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def create_user(db: AsyncSession, user_data: UserCreate, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can create users")

    result = await db.execute(select(User).filter(User.phone == user_data.phone))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Phone already registered")

    user = User(
        name=user_data.name,
        phone=user_data.phone,
        email=user_data.email.strip() if user_data.email else None,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def authenticate_user(db: AsyncSession, phone: str, password: str) -> str:
    result = await db.execute(select(User).filter(User.phone == phone))
    user = result.scalars().first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return create_access_token(data={
        "sub": str(user.id),
        "user_id": str(user.id),
        "role": user.role.value,
        "name": user.name
    })


async def list_users(db: AsyncSession) -> list:
    result = await db.execute(select(User).filter(User.deleted_at == None))
    return list(result.scalars().all())

async def deactivate_user(db: AsyncSession, user_id: str, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can change user status")

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Toggle active status - does NOT delete the user
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return user

async def reset_user_password(db: AsyncSession, user_id: str, new_password: str, requester: User) -> User:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can reset passwords")

    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(new_password)
    await db.commit()
    await db.refresh(user)
    return user

async def hard_delete_user(db: AsyncSession, user_id: str, requester: User, force: bool = False) -> dict:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete users")
    
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.models.shift import Shift, ShiftAssignment
    from app.models.closing_checklist import ClosingTaskCompletion
    from app.models.notification import Notification

    now_dt = now_il_naive()
    today_date = now_dt.date()

    # Check user's shift assignments
    stmt = (
        select(ShiftAssignment, Shift)
        .outerjoin(Shift, ShiftAssignment.shift_id == Shift.id)
        .filter(ShiftAssignment.user_id == user_id)
    )
    rows = (await db.execute(stmt)).all()

    future_shifts_count = 0
    for assignment, shift in rows:
        if shift and shift.date:
            if shift.date > today_date:
                future_shifts_count += 1
            elif shift.date == today_date:
                slot_val = shift.slot.value if hasattr(shift.slot, 'value') else str(shift.slot)
                end_hour = 14 if slot_val == "MORNING" else (18 if slot_val == "AFTERNOON" else 22)
                if now_dt < datetime.datetime.combine(shift.date, datetime.time(end_hour, 0)):
                    future_shifts_count += 1

    # Only warn if the user has FUTURE shifts and force=False.
    # Past shifts NEVER block deletion!
    if future_shifts_count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "HAS_FUTURE_SHIFTS",
                "future_shifts_count": future_shifts_count,
                "message": f"למשתמש {user.name} יש {future_shifts_count} משמרות עתידיות משובצות.",
            },
        )

    # Clean up all foreign key dependencies so deletion always succeeds cleanly:
    assignment_ids = [assignment.id for assignment, _ in rows]
    if assignment_ids:
        completions_res = await db.execute(
            select(ClosingTaskCompletion).filter(ClosingTaskCompletion.shift_assignment_id.in_(assignment_ids))
        )
        for comp in completions_res.scalars().all():
            await db.delete(comp)
        await db.flush()

    for assignment, _ in rows:
        await db.delete(assignment)

    notifications_res = await db.execute(
        select(Notification).filter(Notification.user_id == user_id)
    )
    for notif in notifications_res.scalars().all():
        await db.delete(notif)

    created_shifts_res = await db.execute(
        select(Shift).filter(Shift.created_by == user_id)
    )
    for sh in created_shifts_res.scalars().all():
        sh.created_by = None

    await db.flush()

    # Permanently delete the user
    await db.delete(user)
    await db.commit()
    return {
        "message": "User and all their shift assignments deleted permanently",
        "deleted_future_shifts": future_shifts_count,
    }

async def update_user_profile(db: AsyncSession, current_user: User, email: Optional[str] = None, name: Optional[str] = None) -> User:
    if email is not None:
        current_user.email = email.strip() if email.strip() else None
    if name is not None and name.strip():
        current_user.name = name.strip()
    await db.commit()
    await db.refresh(current_user)
    return current_user

async def verify_user_old_password(current_user: User, old_password: str) -> dict:
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="הסיסמה הנוכחית שגויה")
    return {"valid": True}

async def change_user_own_password(db: AsyncSession, current_user: User, old_password: str, new_password: str) -> User:
    if not verify_password(old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="הסיסמה הנוכחית שגויה")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="הסיסמה החדשה חייבת להכיל לפחות 4 תווים")
    current_user.hashed_password = get_password_hash(new_password)
    await db.commit()
    await db.refresh(current_user)
    return current_user

def _normalize_phone(raw_phone: str) -> str:
    s = str(raw_phone or "").strip()
    if s.endswith(".0"):
        s = s[:-2]
    s = re.sub(r"[\s\-\(\)]", "", s)
    if s.startswith("+972"):
        s = "0" + s[4:]
    elif s.startswith("972") and len(s) >= 11:
        s = "0" + s[3:]
    elif len(s) == 9 and s.startswith("5") and s.isdigit():
        s = "0" + s
    return s

def _normalize_cell(val) -> str:
    s = str(val if val is not None else "").strip()
    if s.endswith(".0") and s[:-2].isdigit():
        s = s[:-2]
    return s

def _col_letter_to_index(col_ref: str) -> int:
    letters = "".join(c for c in col_ref if c.isalpha()).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return max(0, idx - 1)

def _parse_xlsx_rows(file_bytes: bytes) -> list[list[str]]:
    with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            ss_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in ss_root.iter():
                if si.tag.endswith("}si") or si.tag == "si":
                    texts = [t.text or "" for t in si.iter() if t.tag.endswith("}t") or t.tag == "t"]
                    shared_strings.append("".join(texts))

        sheet_files = sorted(
            name for name in z.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        if not sheet_files:
            raise ValueError("לא נמצא גיליון עבודה בקובץ האקסל")

        sheet_root = ET.fromstring(z.read(sheet_files[0]))
        rows = []
        for row_el in sheet_root.iter():
            if not (row_el.tag.endswith("}row") or row_el.tag == "row"):
                continue
            row_cells = {}
            next_col = 0
            for c_el in row_el:
                if not (c_el.tag.endswith("}c") or c_el.tag == "c"):
                    continue
                ref = c_el.attrib.get("r", "")
                col_idx = _col_letter_to_index(ref) if ref else next_col
                next_col = col_idx + 1
                c_type = c_el.attrib.get("t", "")
                val_str = ""
                if c_type == "inlineStr":
                    texts = [t.text or "" for t in c_el.iter() if t.tag.endswith("}t") or t.tag == "t"]
                    val_str = "".join(texts)
                else:
                    v_el = next((ch for ch in c_el if ch.tag.endswith("}v") or ch.tag == "v"), None)
                    if v_el is not None and v_el.text is not None:
                        if c_type == "s":
                            idx = int(v_el.text)
                            val_str = shared_strings[idx] if 0 <= idx < len(shared_strings) else ""
                        else:
                            val_str = v_el.text
                row_cells[col_idx] = _normalize_cell(val_str)
            if row_cells:
                max_col = max(row_cells.keys())
                row_list = [row_cells.get(i, "") for i in range(max_col + 1)]
                if any(cell.strip() for cell in row_list):
                    rows.append(row_list)
        return rows

def _parse_csv_rows(file_bytes: bytes) -> list[list[str]]:
    text = None
    for enc in ("utf-8-sig", "utf-8", "cp1255", "windows-1255", "iso-8859-8"):
        try:
            text = file_bytes.decode(enc)
            break
        except Exception:
            continue
    if text is None:
        text = file_bytes.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    return [[_normalize_cell(c) for c in row] for row in reader if any(str(c).strip() for c in row)]

async def bulk_import_users(db: AsyncSession, file_bytes: bytes, filename: str, requester: User) -> BulkImportResult:
    if requester.role != RoleEnum.SALON_MANAGER:
        raise HTTPException(status_code=403, detail="רק מנהל רשאי לייבא משתמשים")

    fname_lower = (filename or "").lower()
    try:
        if fname_lower.endswith(".xlsx") or file_bytes[:2] == b"PK":
            rows = _parse_xlsx_rows(file_bytes)
        else:
            rows = _parse_csv_rows(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"שגיאה בקריאת הקובץ: {str(e)}")

    if not rows:
        raise HTTPException(status_code=400, detail="הקובץ ריק או שלא נמצאו בו שורות")

    # Detect header row if present
    name_col, phone_col, pass_col, email_col = 0, 1, 2, 3
    start_idx = 0
    first_row_lower = [c.strip().lower() for c in rows[0]]
    header_keywords = ("שם", "שם מלא", "name", "טלפון", "מספר טלפון", "phone", "סיסמא", "סיסמה", "password")
    if any(any(k in cell for k in header_keywords) for cell in first_row_lower):
        start_idx = 1
        found_name = found_phone = found_pass = found_email = None
        for idx, cell in enumerate(first_row_lower):
            if any(k in cell for k in ("שם", "name")) and found_name is None:
                found_name = idx
            elif any(k in cell for k in ("טלפון", "נייד", "phone")) and found_phone is None:
                found_phone = idx
            elif any(k in cell for k in ("סיסמ", "pass")) and found_pass is None:
                found_pass = idx
            elif any(k in cell for k in ("אימייל", "מייל", "דוא", "email", "mail")) and found_email is None:
                found_email = idx
        if found_name is not None:
            name_col = found_name
        if found_phone is not None:
            phone_col = found_phone
        if found_pass is not None:
            pass_col = found_pass
        if found_email is not None:
            email_col = found_email

    existing_res = await db.execute(select(User.phone))
    existing_phones = {p for (p,) in existing_res.all()}

    created_users = []
    skipped_users = []

    for row in rows[start_idx:]:
        name = row[name_col].strip() if len(row) > name_col else ""
        phone = _normalize_phone(row[phone_col]) if len(row) > phone_col else ""
        password = row[pass_col].strip() if len(row) > pass_col else ""
        email = row[email_col].strip() if len(row) > email_col else None

        if not name and not phone:
            continue
        if not name or not phone or not password:
            skipped_users.append(f"{name or phone or 'שורה חסרה'} (חסר שם/טלפון/סיסמה)")
            continue
        if phone in existing_phones:
            skipped_users.append(f"{name} ({phone} - כבר קיים)")
            continue

        new_user = User(
            name=name,
            phone=phone,
            email=email if email else None,
            role=RoleEnum.EVENT_VOLUNTEER,
            hashed_password=get_password_hash(password)
        )
        db.add(new_user)
        existing_phones.add(phone)
        created_users.append(f"{name} ({phone})")

    await db.commit()
    return BulkImportResult(
        created_count=len(created_users),
        skipped_count=len(skipped_users),
        created_users=created_users,
        skipped_users=skipped_users
    )

def generate_sample_xlsx_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '</Types>'
        ))
        z.writestr("_rels/.rels", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '</Relationships>'
        ))
        z.writestr("xl/workbook.xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="משתמשים" sheetId="1" r:id="rId1"/></sheets>'
            '</workbook>'
        ))
        z.writestr("xl/_rels/workbook.xml.rels", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '</Relationships>'
        ))
        z.writestr("xl/worksheets/sheet1.xml", (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetViews><sheetView rightToLeft="1" workbookViewId="0"/></sheetViews>'
            '<sheetData>'
            '<row r="1">'
            '<c r="A1" t="inlineStr"><is><t>שם מלא</t></is></c>'
            '<c r="B1" t="inlineStr"><is><t>מספר טלפון</t></is></c>'
            '<c r="C1" t="inlineStr"><is><t>סיסמא</t></is></c>'
            '<c r="D1" t="inlineStr"><is><t>אימייל</t></is></c>'
            '</row>'
            '<row r="2">'
            '<c r="A2" t="inlineStr"><is><t>ישראל ישראלי</t></is></c>'
            '<c r="B2" t="inlineStr"><is><t>0501112233</t></is></c>'
            '<c r="C2" t="inlineStr"><is><t>123456</t></is></c>'
            '<c r="D2" t="inlineStr"><is><t>israel@example.com</t></is></c>'
            '</row>'
            '</sheetData>'
            '</worksheet>'
        ))
    buf.seek(0)
    return buf.getvalue()
