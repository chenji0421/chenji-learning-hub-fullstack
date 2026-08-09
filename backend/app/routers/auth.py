"""认证接口：GitHub OAuth 入口、回调、当前用户、登出。"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginResponse, LogoutResponse, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/github/start", response_model=LoginResponse)
def github_start():
    """返回 GitHub 授权地址，前端跳转过去开始 OAuth 流程。"""
    return LoginResponse(authorize_url=auth_service.get_github_authorize_url())


@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """GitHub 授权后回跳到这里：换 token、取用户、签发 JWT，再跳回前端。"""
    try:
        access_token = await auth_service.exchange_code_for_token(code)
        github_user = await auth_service.get_github_user(access_token)
    except Exception:
        raise HTTPException(status_code=400, detail="GitHub 登录失败，请重试")

    user = (
        db.query(User).filter(User.github_id == github_user["github_id"]).first()
    )
    if user is None:
        user = User(
            github_id=github_user["github_id"],
            username=github_user["username"],
            name=github_user["name"],
            avatar_url=github_user["avatar_url"],
        )
        db.add(user)
    else:
        # 每次登录更新一下资料，避免头像/昵称过期
        user.username = github_user["username"]
        user.name = github_user["name"]
        user.avatar_url = github_user["avatar_url"]
    db.commit()
    db.refresh(user)

    jwt_token = auth_service.create_access_token(user)
    redirect_url = f"{settings.frontend_url}/#/login?token={jwt_token}"
    return RedirectResponse(url=redirect_url)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(auth_service.get_current_user)):
    """返回当前登录用户信息（含 role，前端用来判断是否管理员）。"""
    return UserRead(
        id=user.id,
        github_id=user.github_id,
        username=user.username,
        name=user.name,
        avatar_url=user.avatar_url,
        role=auth_service.role_for(user.username),
        is_admin=user.username == settings.admin_github_login,
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        auth_service.bearer_scheme
    ),
):
    """登出：把当前 JWT 的 jti 加入吊销名单，该 token 立即失效。

    前端同时清掉 localStorage 里的 token。没有 token 时也返回成功（幂等）。
    """
    auth_service.revoke_token(credentials)
    return LogoutResponse(ok=True)
