"""Pydantic 请求 / 响应模型。

注意：date 字段与 datetime.date 类型同名时，Pydantic 会把类 dict 里的字段默认值
当成注解求值的局部命名空间，导致 `date: date | None` 里的 date 被解析成 None。
所以这里给类型起别名 date_type，避免与计划系统的 date 字段名冲突。
"""
from datetime import date as date_type
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_serializer


def _utc_aware(dt: datetime) -> datetime:
    """把 naive UTC 时间补上 UTC 时区。

    数据库按 UTC 存 naive datetime，序列化时不带时区会导致前端
    new Date() 按本地时区解析，早晨 8 点前发布的文章日期差一天。
    补上时区后输出形如 2026-08-09T12:31:30Z，前端能正确转本地时间。
    """
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


# ---------------- 文章 ----------------
# 文章状态：published 对访客可见，draft 仅管理员可见
ArticleStatus = Literal["draft", "published"]


class ArticleBase(BaseModel):
    title: str
    summary: str = ""
    content: str = ""
    category: str = ""
    tags: list[str] = []
    status: ArticleStatus = "draft"


class ArticleCreate(ArticleBase):
    pass


class ArticleUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    status: ArticleStatus | None = None


class ArticleRead(ArticleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _ser_utc(self, dt: datetime) -> datetime:
        return _utc_aware(dt)


# ---------------- 计划 ----------------
class PlanBase(BaseModel):
    date: date_type
    title: str
    goal: str = ""
    morning: str = ""
    afternoon: str = ""
    evening: str = ""
    review: str = ""
    status: str = "进行中"


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    date: date_type | None = None
    title: str | None = None
    goal: str | None = None
    morning: str | None = None
    afternoon: str | None = None
    evening: str | None = None
    review: str | None = None
    status: str | None = None


class PlanRead(PlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def _ser_utc(self, dt: datetime) -> datetime:
        return _utc_aware(dt)


# ---------------- 认证 / 用户 ----------------
class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_id: int
    username: str
    name: str
    avatar_url: str
    role: str = "reader"  # admin / reader
    is_admin: bool = False


class LoginResponse(BaseModel):
    authorize_url: str


class LogoutResponse(BaseModel):
    ok: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
