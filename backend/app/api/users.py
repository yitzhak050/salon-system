from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.auth import _check_rate_limit, _record_failed_attempt, _clear_failed_attempts
from app.schemas.user import (
    UserCreate,
    UserOut,
    UserResetPassword,
    UserProfileUpdate,
    UserChangePassword,
    UserVerifyPassword,
    BulkImportResult,
)
from app.models.user import User
from app.dependencies import require_manager, get_current_user
from app.services.user_service import (
    create_user,
    list_users,
    deactivate_user,
    reset_user_password,
    hard_delete_user,
    update_user_profile,
    verify_user_old_password,
    change_user_own_password,
    bulk_import_users,
    generate_sample_xlsx_bytes,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_my_profile_route(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me/profile", response_model=UserOut)
async def update_my_profile_route(
    data: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await update_user_profile(db, current_user, data.email, data.name, data.notifications_enabled)


@router.post("/me/verify-password")
async def verify_my_password_route(
    data: UserVerifyPassword,
    current_user: User = Depends(get_current_user),
):
    rate_key = f"verify_pw:{current_user.id}"
    _check_rate_limit(rate_key)
    try:
        await verify_user_old_password(current_user, data.old_password)
    except HTTPException:
        _record_failed_attempt(rate_key)
        raise
    _clear_failed_attempts(rate_key)
    return {"valid": True}


@router.put("/me/change-password", response_model=UserOut)
async def change_my_password_route(
    data: UserChangePassword,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rate_key = f"change_pw:{current_user.id}"
    _check_rate_limit(rate_key)
    try:
        res = await change_user_own_password(db, current_user, data.old_password, data.new_password)
    except HTTPException:
        _record_failed_attempt(rate_key)
        raise
    _clear_failed_attempts(rate_key)
    return res


@router.post("/bulk-import", response_model=BulkImportResult)
async def bulk_import_users_route(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    content = await file.read()
    return await bulk_import_users(db, content, file.filename or "users.xlsx", requester)


@router.get("/excel-template")
async def download_excel_template_route(requester: User = Depends(require_manager)):
    xlsx_bytes = generate_sample_xlsx_bytes()
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=users_template.xlsx"},
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user_route(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    return await create_user(db, user, requester)


@router.get("", response_model=list[UserOut])
@router.get("/", response_model=list[UserOut])
async def list_users_route(
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    return await list_users(db)


@router.put("/{user_id}/reset-password", response_model=UserOut)
@router.post("/{user_id}/reset-password", response_model=UserOut)
async def reset_password_route(
    user_id: str,
    data: UserResetPassword,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    return await reset_user_password(db, user_id, data.password, requester)


@router.delete("/{user_id}", response_model=UserOut)
async def delete_user_route(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    return await deactivate_user(db, user_id, requester)


@router.delete("/{user_id}/hard")
async def hard_delete_user_route(
    user_id: str,
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    requester: User = Depends(require_manager),
):
    return await hard_delete_user(db, user_id, requester, force=force)
