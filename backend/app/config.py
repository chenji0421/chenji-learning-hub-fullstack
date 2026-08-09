"""应用配置。

所有敏感信息（GitHub OAuth 密钥、JWT 密钥等）都从环境变量读取，
不会写死在代码里。本地开发时从项目根目录的 .env 文件加载。
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> backend -> 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # GitHub OAuth（在 https://github.com/settings/developers 创建 OAuth App）
    github_client_id: str = ""
    github_client_secret: str = ""
    github_oauth_callback_url: str = "http://localhost:8000/api/auth/github/callback"

    # 管理员 GitHub 用户名（只有该用户可以管理内容，登录后 role=admin）
    admin_github_login: str = "chenji0421"

    # 会话密钥（用于签发/验证 JWT，部署时务必改成随机长字符串，至少 32 字节）
    auth_secret: str = "dev-secret-change-me-please-use-a-long-random-string"
    auth_algorithm: str = "HS256"
    auth_expire_minutes: int = 60 * 24 * 7  # 7 天

    # 前端地址（用于 OAuth 回调跳转和 CORS）
    frontend_url: str = "http://localhost:5173"

    # SQLite 数据库文件路径
    database_url: str = "sqlite:///./chenji_hub.db"


settings = Settings()
