"""SQLite 数据库连接与会话管理。

第一版按需求使用 SQLite，不需要额外数据库服务。
后续要换 PostgreSQL 时，只需要改 settings.database_url 和 connect_args。
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

# SQLite 需要 check_same_thread=False 才能在 FastAPI 的多线程环境使用
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI 依赖：每个请求一个数据库会话，用完关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
