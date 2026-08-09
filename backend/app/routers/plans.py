"""计划接口。访客只读，管理员按 date 增删改。

路径约定（date 格式 YYYY-MM-DD）：
- GET    /api/plans               计划列表（按日期升序，方便前端构建日历）
- GET    /api/plans/{date}        某天计划
- POST   /api/admin/plans         新增计划（同一天已有计划返回 409）
- PUT    /api/admin/plans/{date}  修改某天计划（可改日期，目标日期被占返回 409）
- DELETE /api/admin/plans/{date}  删除某天计划
"""
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import Plan
from app.schemas import PlanCreate, PlanRead, PlanUpdate

router = APIRouter(prefix="/api", tags=["plans"])


@router.get("/plans", response_model=list[PlanRead])
def list_plans(db: Session = Depends(get_db)):
    """计划列表（按日期升序）。"""
    return db.query(Plan).order_by(Plan.date.asc()).all()


@router.get("/plans/{date}", response_model=PlanRead)
def get_plan(
    date: date_type = Path(..., description="日期，格式 YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.date == date).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="这一天没有计划")
    return plan


@router.post("/admin/plans", response_model=PlanRead, status_code=201)
def create_plan(
    payload: PlanCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    existing = db.query(Plan).filter(Plan.date == payload.date).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="这一天已有计划，请用编辑")
    plan = Plan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/admin/plans/{date}", response_model=PlanRead)
def update_plan(
    date: date_type,
    payload: PlanUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    plan = db.query(Plan).filter(Plan.date == date).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="这一天没有计划")
    # 允许把计划挪到别的日期，但目标日期已有计划时返回 409
    new_date = payload.date
    if new_date is not None and new_date != date:
        clash = db.query(Plan).filter(Plan.date == new_date, Plan.id != plan.id).first()
        if clash is not None:
            raise HTTPException(status_code=409, detail="目标日期已有计划")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/admin/plans/{date}", status_code=204)
def delete_plan(
    date: date_type,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    plan = db.query(Plan).filter(Plan.date == date).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="这一天没有计划")
    db.delete(plan)
    db.commit()
