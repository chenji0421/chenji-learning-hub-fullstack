"""数据库模型。

没有浏览量字段——不生成假浏览量、假阅读时间，只有真实内容。
"""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, Date, DateTime, Float, Integer, String, Text

from app.database import Base


def utcnow() -> datetime:
    """返回 UTC 时间的 naive datetime（SQLite 不存时区，统一用 naive 避免不一致）。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Article(Base):
    """文章。status 控制可见性：published 访客可读，draft 仅管理员可见。"""

    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    summary = Column(String(500), default="")
    content = Column(Text, default="")
    category = Column(String(100), default="")
    tags = Column(JSON, default=list)  # 数组，如 ["GitHub Pages", "前端"]
    status = Column(String(20), default="draft")  # draft / published
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class Plan(Base):
    """每日计划。访客可读，管理员可增删改。"""

    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, nullable=False)  # 一天一条计划
    title = Column(String(200), nullable=False)
    goal = Column(String(500), default="")
    morning = Column(Text, default="")
    afternoon = Column(Text, default="")
    evening = Column(Text, default="")
    review = Column(Text, default="")
    status = Column(String(50), default="进行中")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class User(Base):
    """GitHub 登录用户。管理员判定看 username 是否等于配置的管理员用户名。"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(Integer, unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(200), default="")
    avatar_url = Column(String(500), default="")
    created_at = Column(DateTime, default=utcnow)


class NoteSection(Base):
    """学习笔记分区。parent_id 为空表示大分区，非空表示挂在某大分区下的子分区。"""

    __tablename__ = "note_sections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(500), default="")
    parent_id = Column(Integer, nullable=True, index=True)  # 父分区 id，null = 大分区
    sort_order = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class NoteItem(Base):
    """学习笔记条目，一般对应一个 PDF 文件。"""

    __tablename__ = "note_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500), default="")
    section_id = Column(Integer, nullable=False, index=True)
    file_name = Column(String(255), default="")  # 原始文件名（展示用）
    file_path = Column(String(500), default="")  # 服务端存储路径（不对外暴露）
    file_size = Column(Integer, default=0)  # 字节
    file_type = Column(String(20), default="pdf")
    tags = Column(JSON, default=list)  # 数组，如 ["高等数学", "极限"]
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class PlanTimeBlock(Base):
    """阶段冲刺计划：每日时间段安排。

    一天可以有多条时间段（早上 / 上午 / 下午 / 晚上…），用 sort_order 控制顺序。
    访客只读公开数据；管理员登录后可以增删改。
    """

    __tablename__ = "plan_time_blocks"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    time_range = Column(String(100), default="")  # 时间段，如 "08:00-09:00"
    task = Column(String(500), default="")  # 要做什么
    note = Column(String(500), default="")  # 重点 / 说明
    category = Column(String(100), default="")  # 类型，如 学习 / 生活
    sort_order = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class PlanCompletionRecord(Base):
    """阶段冲刺计划：完成记录。

    status 取值：完成 / 部分 / 未完成。完成度按真实记录计算，不做假统计。
    """

    __tablename__ = "plan_completion_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    time_range = Column(String(100), default="")
    planned_task = Column(String(500), default="")  # 计划做什么
    actual_done = Column(String(500), default="")  # 实际做了什么
    status = Column(String(20), default="未完成")  # 完成 / 部分 / 未完成
    note = Column(String(500), default="")
    sort_order = Column(Integer, default=0)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)


class SleepRecord(Base):
    """阶段冲刺计划：睡眠记录。

    一天一条，按入睡日期 date 记录入睡 / 起床时间和睡眠时长，不做假数据。
    """

    __tablename__ = "sleep_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)  # 入睡日期
    sleep_time = Column(String(50), default="")  # 入睡时间，如 "23:30"
    wake_time = Column(String(50), default="")  # 起床时间，如 "07:00"
    duration_hours = Column(Float, default=0.0)  # 睡眠时长（小时）
    quality = Column(String(100), default="")  # 睡眠质量 / 备注
    note = Column(String(500), default="")
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
