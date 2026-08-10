"""Chenji Learning Hub API 入口。

启动：
    cd backend
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import NOTES_UPLOAD_DIR, settings
from app.database import Base, engine
from app.routers import articles, auth, health, notes, plans, sprint

# 第一版直接建表即可；内容变复杂后再引入 Alembic 做迁移
Base.metadata.create_all(bind=engine)

# 确保学习笔记 PDF 上传目录存在（本地 backend/data/uploads/notes，Docker 里是 /app/data/uploads/notes）
NOTES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Chenji Learning Hub API",
    description="访客看文章和计划，管理员（chenji0421）登录后管理内容。",
    version="0.1.0",
)

# CORS 白名单：开发默认放行 localhost；部署时通过 FRONTEND_URL 添加线上前端域名
allow_origins = list(settings.cors_origins)
if settings.frontend_url and settings.frontend_url not in allow_origins:
    allow_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(plans.router)
app.include_router(notes.router)
app.include_router(sprint.router)


@app.get("/")
def root():
    return {"message": "Chenji Learning Hub API 运行中", "docs": "/docs"}
