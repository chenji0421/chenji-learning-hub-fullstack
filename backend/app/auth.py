"""GitHub OAuth + JWT 认证逻辑。

流程：
1. GET /api/auth/github/start 返回 GitHub 授权地址，前端跳转过去
2. 用户在 GitHub 授权后回跳到 /api/auth/github/callback?code=...
3. 后端用 code 换 access_token，再用 access_token 拉取用户信息
4. 签发 JWT（含 role 和 jti），跳回前端，前端保存 token 后请求头带 Bearer
5. POST /api/auth/logout 把 jti 加入吊销名单，该 token 立即失效

角色判定：GitHub 用户名等于 ADMIN_GITHUB_LOGIN（默认 chenji0421）→ admin，
其余登录用户 → reader。访客不登录也能看文章和计划。
"""
import uuid
from datetime import datetime, timedelta

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"

bearer_scheme = HTTPBearer(auto_error=False)

# 已登出的 JWT jti 黑名单（内存版，进程重启后清空）。
# 第一版单进程部署够用；以后多进程部署要换成 Redis 之类的共享存储。
_revoked_jti: set[str] = set()


def role_for(username: str) -> str:
    """按 GitHub 用户名判定角色：管理员 / 普通读者。"""
    return "admin" if username == settings.admin_github_login else "reader"


def create_access_token(user: User) -> str:
    """为登录用户签发 JWT，payload 带 role（前端展示用）和 jti（登出吊销用）。"""
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": role_for(user.username),
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + timedelta(minutes=settings.auth_expire_minutes),
    }
    return jwt.encode(payload, settings.auth_secret, algorithm=settings.auth_algorithm)


def revoke_token(credentials: HTTPAuthorizationCredentials | None) -> None:
    """把当前 token 的 jti 加入吊销名单。token 缺失或无效时静默返回（幂等登出）。"""
    if credentials is None:
        return
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.auth_secret,
            algorithms=[settings.auth_algorithm],
        )
    except jwt.PyJWTError:
        return
    _revoked_jti.add(payload.get("jti", ""))


def get_github_authorize_url() -> str:
    """拼出引导用户去 GitHub 授权的地址。"""
    return (
        f"{GITHUB_AUTHORIZE_URL}"
        f"?client_id={settings.github_client_id}"
        "&scope=read:user"
        f"&redirect_uri={settings.github_oauth_callback_url}"
    )


async def exchange_code_for_token(code: str) -> str:
    """用 GitHub 回调的 code 换取 access_token。"""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GITHUB_ACCESS_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_client_id,
                "client_secret": settings.github_client_secret,
                "code": code,
                "redirect_uri": settings.github_oauth_callback_url,
            },
        )
        resp.raise_for_status()
        return resp.json().get("access_token", "")


async def get_github_user(access_token: str) -> dict:
    """用 access_token 拉取 GitHub 用户信息。"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GITHUB_USER_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        resp.raise_for_status()
        data = resp.json()
    return {
        "github_id": data.get("id"),
        "username": data.get("login"),
        "name": data.get("name") or "",
        "avatar_url": data.get("avatar_url") or "",
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """解析请求头里的 JWT，返回当前登录用户。"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录"
        )
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.auth_secret,
            algorithms=[settings.auth_algorithm],
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录",
        )
    if payload.get("jti") in _revoked_jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="已登出，请重新登录"
        )
    user = db.get(User, int(payload.get("sub", 0)))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="用户不存在"
        )
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """解析 JWT，但未登录 / token 无效时返回 None 而不是报错。

    用于「访客可访问、管理员有更多权限」的接口，例如文章详情——
    admin 带 token 能看草稿，访客没 token 也能看已发布文章。
    """
    if credentials is None:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.auth_secret,
            algorithms=[settings.auth_algorithm],
        )
    except jwt.PyJWTError:
        return None
    if payload.get("jti") in _revoked_jti:
        return None
    return db.get(User, int(payload.get("sub", 0)))


def require_admin(user: User = Depends(get_current_user)) -> User:
    """只有配置的管理员（默认 chenji0421）可以通过。"""
    if user.username != settings.admin_github_login:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="只有管理员可以执行此操作",
        )
    return user
