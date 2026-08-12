"""关于我内容管理接口。访客只读，管理员可编辑 / 恢复默认。

路径约定：
- GET  /api/about-profile              公开读取（只返回 is_public=True）
- GET  /api/admin/about-profile        管理员读取（含未公开状态）
- PUT  /api/admin/about-profile        管理员保存整页内容
- POST /api/admin/about-profile/reset  管理员恢复为安全默认值

About 内容整页存一条记录（id=1）。安全默认值只写确认过的真实信息
（名字 / 学校 / 年级 / 兴趣 / 正在学习等），不生成假经历、假荣誉、
假奖项、假论文、假比赛。
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.database import get_db
from app.models import AboutProfile
from app.schemas import AboutProfileRead, AboutProfileUpdate

router = APIRouter(prefix="/api", tags=["about-profile"])

# 安全默认值：与之前 frontend/src/data/profile.js 一致的真实信息。
# 管理员「恢复默认」时写入这些值；公开接口缺数据时也返回这份基础内容。
SAFE_DEFAULT_CONTENT = {
    "kicker": "About Me",
    "title": "你好，我是沉积",
    "subtitle": "浙江大学 25 级本科生，准大二。",
    "description": "我喜欢长跑和画画，也在慢慢学习编程、前端、数据分析和 AI 工具。这个网站是我的个人学习工作台，用来记录一点点真实的进步。",
    "name": "沉积",
    "school": "浙江大学",
    "grade": "25 级本科生",
    "stage": "准大二",
    "interests": "长跑、画画",
    "current_status": "学习中",
    "hobby_cards": [
        {"icon": "🏃", "title": "长跑", "desc": "用稳定的节奏训练身体，也训练耐心。"},
        {"icon": "🎨", "title": "画画", "desc": "用线条和颜色记录观察，也保留一点想象力。"},
        {"icon": "🧩", "title": "建站", "desc": "把文章、计划、笔记和工具慢慢整理成自己的长期系统。"},
    ],
    "learning_items": [
        {"name": "Python", "desc": "从写脚本开始，慢慢学着做小工具。"},
        {"name": "Web 前端", "desc": "用 React 把想法变成页面。"},
        {"name": "FastAPI", "desc": "学习写后端接口，让网站有真实数据。"},
        {"name": "数据分析", "desc": "学着从数据里看出一点规律。"},
        {"name": "AI 工具", "desc": "借助 AI 更高效地学习和做事。"},
        {"name": "GitHub / 自动部署", "desc": "让每次修改都能自动上线。"},
    ],
    "site_usage": ["记录学习过程", "保存学习笔记", "管理计划", "存放工具入口", "记录网站成长"],
    "site_desc": "沉积 Learning Hub 是我的个人学习工作台。它不是一个展示「完成品」的地方，而是记录学习过程、计划执行、笔记沉淀和网站迭代的地方。",
    "goal_items": [
        "把学习笔记慢慢整理进网站",
        "坚持记录计划和复盘",
        "继续优化文章和工具箱",
        "把音乐、友人和更新日志做得更实用",
    ],
}


def _get_profile(db: Session) -> AboutProfile:
    """取唯一的关于我记录；不存在则按安全默认值创建（id 恒为 1）。"""
    profile = db.get(AboutProfile, 1)
    if profile is None:
        profile = AboutProfile(id=1, **SAFE_DEFAULT_CONTENT)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _public_payload(profile: AboutProfile) -> dict:
    """未公开时返回最基础的安全内容：保留真实基本信息，不泄露私密草稿。"""
    return {
        "id": profile.id,
        "kicker": "About Me",
        "title": "关于我",
        "subtitle": "",
        "description": "关于我内容暂时没有公开。",
        "name": profile.name,
        "school": profile.school,
        "grade": profile.grade,
        "stage": profile.stage,
        "interests": profile.interests,
        "current_status": profile.current_status,
        "hobby_cards": [],
        "learning_items": [],
        "site_usage": [],
        "site_desc": "这个页面暂时没有公开内容。",
        "goal_items": [],
        "is_public": False,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


@router.get("/about-profile", response_model=AboutProfileRead)
def get_about_profile(db: Session = Depends(get_db)):
    """公开读取关于我。未公开时返回最基础的安全默认值。"""
    profile = _get_profile(db)
    if not profile.is_public:
        return _public_payload(profile)
    return profile


@router.get("/admin/about-profile", response_model=AboutProfileRead)
def get_admin_about_profile(
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """管理员读取完整关于我内容（含未公开状态）。"""
    return _get_profile(db)


@router.put("/admin/about-profile", response_model=AboutProfileRead)
def update_about_profile(
    payload: AboutProfileUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """管理员保存关于我内容。只更新提交的字段。"""
    profile = _get_profile(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/admin/about-profile/reset", response_model=AboutProfileRead)
def reset_about_profile(
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """管理员恢复为安全默认值（真实基本信息，不编造经历）。"""
    profile = _get_profile(db)
    for field, value in SAFE_DEFAULT_CONTENT.items():
        setattr(profile, field, value)
    profile.is_public = True
    db.commit()
    db.refresh(profile)
    return profile
