"""Chenji Learning Hub API 入口。

启动：
    cd backend
    uvicorn app.main:app --reload
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import articles, auth, health, plans

# 第一版直接建表即可；内容变复杂后再引入 Alembic 做迁移
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chenji Learning Hub API",
    description="访客看文章和计划，管理员（chenji0421）登录后管理内容。",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(articles.router)
app.include_router(plans.router)


@app.get("/")
def root():
    return {"message": "Chenji Learning Hub API 运行中", "docs": "/docs"}
