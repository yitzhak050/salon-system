from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_db
from app.schemas.report import VolunteerStats, AdminStats, VolunteerAttendanceReport
from app.models.user import User
from app.dependencies import get_current_user, require_manager
from app.services.report_service import (
    get_volunteer_stats, get_volunteer_attendance_report,
    get_admin_stats, export_volunteer_pdf, export_admin_pdf,
    get_all_users_yearly_stats
)

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/volunteer/stats", response_model=VolunteerStats)
async def volunteer_stats_route(
    year: Optional[int] = Query(None, description="Year for stats"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_volunteer_stats(db, current_user.id, year=year)

@router.get("/volunteer/attendance", response_model=VolunteerAttendanceReport)
async def volunteer_attendance_route(
    year: Optional[int] = Query(None, description="Year for attendance report"),
    filter_type: Optional[str] = Query(None, description="Filter type: month, year, all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_volunteer_attendance_report(db, current_user.id, year=year, filter_type=filter_type)

@router.get("/volunteer/pdf")
async def volunteer_pdf_route(
    year: Optional[int] = Query(None, description="Year for report"),
    filter_type: Optional[str] = Query(None, description="Filter type: month, year, all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    report = await get_volunteer_attendance_report(db, current_user.id, year=year, filter_type=filter_type)
    pdf_bytes = export_volunteer_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=volunteer_attendance_{report.year}.pdf"}
    )

@router.get("/admin/stats", response_model=AdminStats)
async def admin_stats_route(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    return await get_admin_stats(db, month, year)

@router.get("/admin/pdf")
async def admin_pdf_route(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    stats = await get_admin_stats(db, month, year)
    pdf_bytes = export_admin_pdf(stats)
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=admin_report_{month}_{year}.pdf"})

@router.get("/admin/yearly-stats")
async def admin_yearly_stats_route(year: Optional[int] = Query(None), db: AsyncSession = Depends(get_db), current_user: User = Depends(require_manager)):
    return await get_all_users_yearly_stats(db, year=year)

@router.get("/admin/volunteer/{user_id}/attendance", response_model=VolunteerAttendanceReport)
async def admin_volunteer_attendance_route(
    user_id: str,
    year: Optional[int] = Query(None),
    filter_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    return await get_volunteer_attendance_report(db, user_id, year=year, filter_type=filter_type)

@router.get("/admin/volunteer/{user_id}/pdf")
async def admin_volunteer_pdf_route(
    user_id: str,
    year: Optional[int] = Query(None),
    filter_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    report = await get_volunteer_attendance_report(db, user_id, year=year, filter_type=filter_type)
    pdf_bytes = export_volunteer_pdf(report)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=volunteer_attendance_{user_id}_{report.year}.pdf"}
    )
