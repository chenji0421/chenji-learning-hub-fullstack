"""睡眠记录接口。访客只读公开记录，管理员按 id 增删改。

注意：这是生活记录里的睡眠模块，复用阶段冲刺计划已有的 sleep_records 表
（字段一致），但走独立的 /api/sleep-records 路径，不与 /api/sprint/sleep 混用。

路径约定：
- GET    /api/sleep-records                 公开睡眠记录列表（默认 date 倒序，最多 365 条）
- GET    /api/sleep-records/{record_id}     单条公开记录（不存在或非公开返回 404）

管理员（require_admin）：
- POST   /api/admin/sleep-records             新增睡眠记录
- PUT    /api/admin/sleep-records/{record_id} 编辑睡眠记录
- DELETE /api/admin/sleep-records/{record_id} 删除睡眠记录
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import SleepRecord
from app.schemas import SleepRecordCreate, SleepRecordRead, SleepRecordUpdate

router = APIRouter(prefix="/api", tags=["sleep-records"])


def _get_public_or_404(db: Session, record_id: int) -> SleepRecord:
    """按 id 找公开睡眠记录；不存在或非公开返回 404（不泄露 is_public=False 的记录）。"""
    record = db.get(SleepRecord, record_id)
    if record is None or not record.is_public:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


def _get_any_or_404(db: Session, record_id: int) -> SleepRecord:
    """管理员专用：按 id 找任意睡眠记录（含非公开），不存在返回 404。"""
    record = db.get(SleepRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.get("/sleep-records", response_model=list[SleepRecordRead])
def list_sleep_records(
    limit: int = Query(30, ge=1, le=365, description="返回条数，默认 30，最大 365"),
    db: Session = Depends(get_db),
):
    """公开睡眠记录列表，只返回 is_public=True，按日期倒序（最近在前）。"""
    return (
        db.query(SleepRecord)
        .filter(SleepRecord.is_public == True)  # noqa: E712
        .order_by(SleepRecord.date.desc(), SleepRecord.id.desc())
        .limit(limit)
        .all()
    )


@router.get("/sleep-records/{record_id}", response_model=SleepRecordRead)
def get_sleep_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    """单条公开睡眠记录。不存在或 is_public=False 返回 404。"""
    return _get_public_or_404(db, record_id)


@router.post("/admin/sleep-records", response_model=SleepRecordRead, status_code=201)
def create_sleep_record(
    payload: SleepRecordCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新增睡眠记录，仅管理员可用。"""
    record = SleepRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/admin/sleep-records/{record_id}", response_model=SleepRecordRead)
def update_sleep_record(
    record_id: int,
    payload: SleepRecordUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """编辑睡眠记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/admin/sleep-records/{record_id}", status_code=204)
def delete_sleep_record(
    record_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """删除睡眠记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    db.delete(record)
    db.commit()
