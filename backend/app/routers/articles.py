"""文章接口。

访客：只能读 status=published 的文章。
管理员：能看全部（含草稿），并能增删改（/api/admin/articles）。
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth as auth_service
from app.config import settings
from app.database import get_db
from app.models import Article, User
from app.schemas import ArticleCreate, ArticleRead, ArticleUpdate

router = APIRouter(prefix="/api", tags=["articles"])


def _is_admin(user: User | None) -> bool:
    """带 token 且是配置的管理员才返回 True。"""
    return user is not None and user.username == settings.admin_github_login


@router.get("/articles", response_model=list[ArticleRead])
def list_articles(
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """文章列表：管理员（带 token）能看到全部含草稿，访客只看已发布。"""
    query = db.query(Article)
    if not _is_admin(user):
        query = query.filter(Article.status == "published")
    return query.order_by(Article.created_at.desc()).all()


@router.get("/articles/{article_id}", response_model=ArticleRead)
def get_article(
    article_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """文章详情：管理员能看到草稿，访客看草稿视为不存在（404，不泄露存在）。"""
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    if article.status != "published" and not _is_admin(user):
        raise HTTPException(status_code=404, detail="文章不存在")
    return article


@router.post("/admin/articles", response_model=ArticleRead, status_code=201)
def create_article(
    payload: ArticleCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    article = Article(**payload.model_dump())
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.put("/admin/articles/{article_id}", response_model=ArticleRead)
def update_article(
    article_id: int,
    payload: ArticleUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(article, field, value)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/admin/articles/{article_id}", status_code=204)
def delete_article(
    article_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    article = db.get(Article, article_id)
    if article is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    db.delete(article)
    db.commit()
