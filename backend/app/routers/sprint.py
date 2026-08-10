"""阶段冲刺计划接口。

三个真实记录模块（时间安排 / 完成记录 / 睡眠记录），
访客只读公开数据，管理员按 id 增删改。课程 / 应用 / 记账 / 饮食 / 身体暂未接入。

路径约定：
- GET    /api/sprint/time-blocks?date=YYYY-MM-DD        时间安排列表（可筛选某天）
- GET    /api/sprint/completions?date=YYYY-MM-DD        完成记录列表（可筛选某天）
- GET    /api/sprint/sleep?date=YYYY-MM-DD              睡眠记录列表（可筛选某天）

管理员（require_admin）：
- POST   /api/admin/sprint/time-blocks
- PUT    /api/admin/sprint/time-blocks/{id}
- DELETE /api/admin/sprint/time-blocks/{id}
- POST   /api/admin/sprint/completions
- PUT    /api/admin/sprint/completions/{id}
- DELETE /api/admin/sprint/completions/{id}
- POST   /api/admin/sprint/sleep
- PUT    /api/admin/sprint/sleep/{id}
- DELETE /api/admin/sprint/sleep/{id}
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import PlanCompletionRecord, PlanTimeBlock, SleepRecord
from app.schemas import (
    CompletionCreate,
    CompletionRead,
    CompletionUpdate,
    SleepCreate,
    SleepRead,
    SleepUpdate,
    TimeBlockCreate,
    TimeBlockRead,
    TimeBlockUpdate,
)

router = APIRouter(prefix="/api", tags=["sprint"])


def _get_or_404(db: Session, model, item_id: int):
    item = db.get(model, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return item


# ==================== 时间安排 ====================
@router.get("/sprint/time-blocks", response_model=list[TimeBlockRead])
def list_time_blocks(
    date: date_type | None = Query(None, description="可选，按日期筛选 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """时间安排列表，可按日期筛选，按 sort_order 再按 time_range 排序。"""
    query = db.query(PlanTimeBlock).filter(
        PlanTimeBlock.is_public == True  # noqa: E712
    ).order_by(
        PlanTimeBlock.date.asc(),
        PlanTimeBlock.sort_order.asc(),
        PlanTimeBlock.time_range.asc(),
    )
    if date is not None:
        query = query.filter(PlanTimeBlock.date == date)
    return query.all()


@router.post("/admin/sprint/time-blocks", response_model=TimeBlockRead, status_code=201)
def create_time_block(
    payload: TimeBlockCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = PlanTimeBlock(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/admin/sprint/time-blocks/{item_id}", response_model=TimeBlockRead)
def update_time_block(
    item_id: int,
    payload: TimeBlockUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, PlanTimeBlock, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/admin/sprint/time-blocks/{item_id}", status_code=204)
def delete_time_block(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, PlanTimeBlock, item_id)
    db.delete(item)
    db.commit()


# ==================== 完成记录 ====================
@router.get("/sprint/completions", response_model=list[CompletionRead])
def list_completions(
    date: date_type | None = Query(None, description="可选，按日期筛选 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """完成记录列表，可按日期筛选，按 sort_order 排序。"""
    query = db.query(PlanCompletionRecord).filter(
        PlanCompletionRecord.is_public == True  # noqa: E712
    ).order_by(
        PlanCompletionRecord.date.asc(),
        PlanCompletionRecord.sort_order.asc(),
        PlanCompletionRecord.time_range.asc(),
    )
    if date is not None:
        query = query.filter(PlanCompletionRecord.date == date)
    return query.all()


@router.post("/admin/sprint/completions", response_model=CompletionRead, status_code=201)
def create_completion(
    payload: CompletionCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = PlanCompletionRecord(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/admin/sprint/completions/{item_id}", response_model=CompletionRead)
def update_completion(
    item_id: int,
    payload: CompletionUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, PlanCompletionRecord, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/admin/sprint/completions/{item_id}", status_code=204)
def delete_completion(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, PlanCompletionRecord, item_id)
    db.delete(item)
    db.commit()


# ==================== 睡眠记录 ====================
@router.get("/sprint/sleep", response_model=list[SleepRead])
def list_sleep(
    date: date_type | None = Query(None, description="可选，按日期筛选 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    """睡眠记录列表，可按日期筛选，按日期倒序（最近在前）。"""
    query = db.query(SleepRecord).filter(
        SleepRecord.is_public == True  # noqa: E712
    ).order_by(SleepRecord.date.desc())
    if date is not None:
        query = query.filter(SleepRecord.date == date)
    return query.all()


@router.post("/admin/sprint/sleep", response_model=SleepRead, status_code=201)
def create_sleep(
    payload: SleepCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = SleepRecord(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/admin/sprint/sleep/{item_id}", response_model=SleepRead)
def update_sleep(
    item_id: int,
    payload: SleepUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, SleepRecord, item_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/admin/sprint/sleep/{item_id}", status_code=204)
def delete_sleep(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = _get_or_404(db, SleepRecord, item_id)
    db.delete(item)
    db.commit()
