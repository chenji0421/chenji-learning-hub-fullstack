"""运动记录接口。访客只读公开记录，管理员按 id 增删改。

路径约定：
- GET    /api/exercises                   公开运动记录列表（默认 date 倒序，最多 365 条）
- GET    /api/exercises/{record_id}       单条公开记录（不存在或非公开返回 404）

管理员（require_admin）：
- POST   /api/admin/exercises             新增运动记录
- PUT    /api/admin/exercises/{record_id} 编辑运动记录
- DELETE /api/admin/exercises/{record_id} 删除运动记录
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import ExerciseRecord
from app.schemas import ExerciseRecordCreate, ExerciseRecordRead, ExerciseRecordUpdate

router = APIRouter(prefix="/api", tags=["exercises"])


def _get_public_or_404(db: Session, record_id: int) -> ExerciseRecord:
    """按 id 找公开运动记录；不存在或非公开返回 404（不泄露 is_public=False 的记录）。"""
    record = db.get(ExerciseRecord, record_id)
    if record is None or not record.is_public:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


def _get_any_or_404(db: Session, record_id: int) -> ExerciseRecord:
    """管理员专用：按 id 找任意运动记录（含非公开），不存在返回 404。"""
    record = db.get(ExerciseRecord, record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.get("/exercises", response_model=list[ExerciseRecordRead])
def list_exercises(
    limit: int = Query(30, ge=1, le=365, description="返回条数，默认 30，最大 365"),
    db: Session = Depends(get_db),
):
    """公开运动记录列表，只返回 is_public=True，按日期倒序（最近在前）。"""
    return (
        db.query(ExerciseRecord)
        .filter(ExerciseRecord.is_public == True)  # noqa: E712
        .order_by(ExerciseRecord.date.desc(), ExerciseRecord.id.desc())
        .limit(limit)
        .all()
    )


@router.get("/exercises/{record_id}", response_model=ExerciseRecordRead)
def get_exercise(
    record_id: int,
    db: Session = Depends(get_db),
):
    """单条公开运动记录。不存在或 is_public=False 返回 404。"""
    return _get_public_or_404(db, record_id)


@router.post("/admin/exercises", response_model=ExerciseRecordRead, status_code=201)
def create_exercise(
    payload: ExerciseRecordCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新增运动记录，仅管理员可用。"""
    record = ExerciseRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.put("/admin/exercises/{record_id}", response_model=ExerciseRecordRead)
def update_exercise(
    record_id: int,
    payload: ExerciseRecordUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """编辑运动记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/admin/exercises/{record_id}", status_code=204)
def delete_exercise(
    record_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """删除运动记录，仅管理员可用。"""
    record = _get_any_or_404(db, record_id)
    db.delete(record)
    db.commit()
