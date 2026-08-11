"""饮食记录接口。访客只读公开记录，管理员按 id 增删改。

路径约定：
- GET    /api/diet-records                 公开饮食记录列表（默认 date 倒序，最多 365 条）
- GET    /api/diet-records/{record_id}     单条公开记录（不存在或非公开返回 404）

管理员（require_admin）：
- POST   /api/admin/diet-records             新增饮食记录
- PUT    /api/admin/diet-records/{record_id} 编辑饮食记录
- DELETE /api/admin/diet-records/{record_id} 删除饮食记录
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import DietRecord
from app.schemas import DietRecordCreate, DietRecordRead, DietRecordUpdate

router = APIRouter(prefix="/api", tags=["diet-records"])


def _get_public_or_404(db: Session, record_id: int) -> DietRecord:
    """按 id 找公开饮食记录；不存在或非公开返回 404（不泄露 is_public=False 的记录）。"""
    record = db.get(DietRecord, record_id)
    if record is None or not record.is_public:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


def _get_any_or_404(db: Session, record_id: int) -> DietRecord:
    """管理员专用：按 id 找任意饮食记录（含非公开），不存在返回 404。"""
    record = db.get(DietRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.get("/diet-records", response_model=list[DietRecordRead])
def list_diet_records(
    limit: int = Query(30, ge=1, le=365, description="返回条数，默认 30，最大 365"),
    db: Session = Depends(get_db),
):
    """公开饮食记录列表，只返回 is_public=True，按日期倒序（最近在前）。"""
    return (
        db.query(DietRecord)
        .filter(DietRecord.is_public == True)  # noqa: E712
        .order_by(DietRecord.date.desc(), DietRecord.id.desc())
        .limit(limit)
        .all()
    )


@router.get("/diet-records/{record_id}", response_model=DietRecordRead)
def get_diet_record(
    record_id: int,
    db: Session = Depends(get_db),
):
    """单条公开饮食记录。不存在或 is_public=False 返回 404。"""
    return _get_public_or_404(db, record_id)


@router.post("/admin/diet-records", response_model=DietRecordRead, status_code=201)
def create_diet_record(
    payload: DietRecordCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新增饮食记录，仅管理员可用。"""
    record = DietRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/admin/diet-records/{record_id}", response_model=DietRecordRead)
def update_diet_record(
    record_id: int,
    payload: DietRecordUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """编辑饮食记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/admin/diet-records/{record_id}", status_code=204)
def delete_diet_record(
    record_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """删除饮食记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    db.delete(record)
    db.commit()
