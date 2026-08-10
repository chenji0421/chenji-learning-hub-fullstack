"""学习笔记接口。

公开（访客只读公开笔记）：
- GET  /api/notes/sections          分区列表（管理员全量，访客只看公开）
- GET  /api/notes/items              笔记列表（可带 ?section_id= 过滤）
- GET  /api/notes/items/{id}         笔记详情
- GET  /api/notes/items/{id}/file    PDF 文件（查看 / 下载）

管理（仅管理员，/api/admin/notes）：
- POST /api/admin/notes/sections                     新建分区
- PUT  /api/admin/notes/sections/{id}                编辑分区
- DELETE /api/admin/notes/sections/{id}              删除分区（含子分区和笔记）
- POST /api/admin/notes/items                        新建笔记条目（JSON）
- PUT  /api/admin/notes/items/{id}                   编辑笔记
- DELETE /api/admin/notes/items/{id}                 删除笔记
- POST /api/admin/notes/items/{id}/upload            给已有笔记上传 / 替换 PDF
- POST /api/admin/notes/items/upload                 新建笔记 + 上传 PDF（multipart）
"""
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from app import auth as auth_service
from app.config import NOTES_UPLOAD_DIR, settings
from app.database import get_db
from app.models import NoteItem, NoteSection, User
from app.schemas import (
    NoteItemCreate,
    NoteItemRead,
    NoteItemUpdate,
    NoteSectionCreate,
    NoteSectionRead,
    NoteSectionUpdate,
)

router = APIRouter(prefix="/api", tags=["notes"])

# PDF 上传大小上限：50MB
MAX_PDF_SIZE = 50 * 1024 * 1024


def _is_admin(user: User | None) -> bool:
    """带 token 且是配置的管理员才返回 True。"""
    return user is not None and user.username == settings.admin_github_login


def _delete_item_file(item: NoteItem) -> None:
    """删除笔记对应的 PDF 文件（文件不存在时静默忽略）。"""
    if item.file_path:
        try:
            Path(item.file_path).unlink(missing_ok=True)
        except OSError:
            pass


def _save_upload(item: NoteItem, file: UploadFile, db: Session) -> NoteItem:
    """把上传的 PDF 分块保存到上传目录，超过大小限制则拒绝并清理临时文件。

    新文件完整写入成功后才删除旧文件，避免上传失败把原文件也弄丢。
    """
    NOTES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    # 用「笔记 id + 随机串」命名，避免原始文件名冲突 / 路径穿越
    safe_name = f"{item.id}_{uuid4().hex[:8]}.pdf"
    dest = NOTES_UPLOAD_DIR / safe_name
    written = 0
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = file.file.read(1024 * 1024)  # 1MB 分块，避免一次性读入内存
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_PDF_SIZE:
                    raise HTTPException(status_code=413, detail="PDF 文件不能超过 50MB")
                out.write(chunk)
    except (HTTPException, OSError):
        # 超过限制或写入出错时，删除已写入的临时文件
        dest.unlink(missing_ok=True)
        raise
    # 新文件完整写入成功后才删除旧文件
    _delete_item_file(item)
    item.file_name = file.filename or ""
    item.file_path = str(dest)
    item.file_size = written
    item.file_type = "pdf"
    db.commit()
    db.refresh(item)
    return item


def _delete_section_recursive(db: Session, section: NoteSection) -> None:
    """递归删除分区：先删子分区和其笔记，再删当前分区。"""
    children = (
        db.query(NoteSection).filter(NoteSection.parent_id == section.id).all()
    )
    for child in children:
        _delete_section_recursive(db, child)
    items = db.query(NoteItem).filter(NoteItem.section_id == section.id).all()
    for item in items:
        _delete_item_file(item)
        db.delete(item)
    db.delete(section)


# ==================== 公开接口 ====================
@router.get("/notes/sections", response_model=list[NoteSectionRead])
def list_note_sections(
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """分区列表：管理员全量，访客只看公开分区。"""
    query = db.query(NoteSection)
    if not _is_admin(user):
        query = query.filter(NoteSection.is_public == True)  # noqa: E712
    return query.order_by(NoteSection.sort_order.asc(), NoteSection.id.asc()).all()


@router.get("/notes/items", response_model=list[NoteItemRead])
def list_note_items(
    section_id: int | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """笔记列表：管理员全量，访客只看公开；可选 section_id 过滤。"""
    query = db.query(NoteItem)
    if section_id is not None:
        query = query.filter(NoteItem.section_id == section_id)
    if not _is_admin(user):
        query = query.filter(NoteItem.is_public == True)  # noqa: E712
    return query.order_by(NoteItem.updated_at.desc()).all()


@router.get("/notes/items/{item_id}", response_model=NoteItemRead)
def get_note_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """笔记详情：非公开笔记对访客视为不存在（404，不泄露存在）。"""
    item = db.get(NoteItem, item_id)
    if item is None or (not item.is_public and not _is_admin(user)):
        raise HTTPException(status_code=404, detail="笔记不存在")
    return item


@router.get("/notes/items/{item_id}/file")
def get_note_file(
    item_id: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(auth_service.get_optional_user),
):
    """返回笔记的 PDF 文件。非公开笔记只有管理员能访问。"""
    item = db.get(NoteItem, item_id)
    if item is None or (not item.is_public and not _is_admin(user)):
        raise HTTPException(status_code=404, detail="笔记不存在")
    if not item.file_path:
        raise HTTPException(status_code=404, detail="文件尚未上传")
    path = Path(item.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=item.file_name or "note.pdf",
    )


# ==================== 管理接口：分区 ====================
@router.post("/admin/notes/sections", response_model=NoteSectionRead, status_code=201)
def create_note_section(
    payload: NoteSectionCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新建分区。最多支持两级：大分区 → 子分区。"""
    if payload.parent_id is not None:
        parent = db.get(NoteSection, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=400, detail="父分区不存在")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="最多支持两级分区，子分区下不能再建子分区")
    section = NoteSection(**payload.model_dump())
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


@router.put("/admin/notes/sections/{section_id}", response_model=NoteSectionRead)
def update_note_section(
    section_id: int,
    payload: NoteSectionUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    section = db.get(NoteSection, section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="分区不存在")
    # 基本校验：不能把自己设为自己的父分区
    if payload.parent_id == section_id:
        raise HTTPException(status_code=400, detail="分区不能把自己设为父分区")
    if payload.parent_id is not None:
        parent = db.get(NoteSection, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=400, detail="父分区不存在")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="最多支持两级分区，子分区下不能再建子分区")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(section, field, value)
    db.commit()
    db.refresh(section)
    return section


@router.delete("/admin/notes/sections/{section_id}", status_code=204)
def delete_note_section(
    section_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """删除分区：会连带删除其子分区和所有笔记（含 PDF 文件）。"""
    section = db.get(NoteSection, section_id)
    if section is None:
        raise HTTPException(status_code=404, detail="分区不存在")
    _delete_section_recursive(db, section)
    db.commit()


# ==================== 管理接口：笔记条目 ====================
@router.post("/admin/notes/items", response_model=NoteItemRead, status_code=201)
def create_note_item(
    payload: NoteItemCreate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新建笔记条目（JSON，不含文件）。"""
    if db.get(NoteSection, payload.section_id) is None:
        raise HTTPException(status_code=400, detail="分区不存在")
    item = NoteItem(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/admin/notes/items/{item_id}", response_model=NoteItemRead)
def update_note_item(
    item_id: int,
    payload: NoteItemUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = db.get(NoteItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="笔记不存在")
    if payload.section_id is not None and db.get(NoteSection, payload.section_id) is None:
        raise HTTPException(status_code=400, detail="分区不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/admin/notes/items/{item_id}", status_code=204)
def delete_note_item(
    item_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    item = db.get(NoteItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="笔记不存在")
    _delete_item_file(item)
    db.delete(item)
    db.commit()


# ==================== PDF 上传 ====================
def _validate_pdf(file: UploadFile) -> None:
    """校验扩展名、MIME 类型和文件头魔数，确认是真正的 PDF 文件。"""
    name = (file.filename or "").lower()
    if not name.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="只允许上传 PDF 文件")
    if (file.content_type or "").lower() != "application/pdf":
        raise HTTPException(status_code=400, detail="只允许上传 PDF 文件")
    # 读取文件头校验 %PDF- 魔数，读完要 seek 回开头，避免后续保存丢内容
    head = file.file.read(5)
    file.file.seek(0)
    if not head.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="只允许上传 PDF 文件")


@router.post("/admin/notes/items/{item_id}/upload", response_model=NoteItemRead)
def upload_note_file(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """给已存在的笔记上传 / 替换 PDF。"""
    item = db.get(NoteItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="笔记不存在")
    _validate_pdf(file)
    return _save_upload(item, file, db)


@router.post("/admin/notes/items/upload", response_model=NoteItemRead, status_code=201)
def upload_note_item(
    section_id: int = Form(...),
    title: str = Form(...),
    description: str = Form(""),
    tags: str = Form(""),
    is_public: bool = Form(True),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(auth_service.require_admin),
):
    """新建笔记 + 上传 PDF 一步完成（multipart 表单）。"""
    if db.get(NoteSection, section_id) is None:
        raise HTTPException(status_code=400, detail="分区不存在")
    _validate_pdf(file)
    item = NoteItem(
        title=title,
        description=description,
        section_id=section_id,
        tags=[t.strip() for t in tags.split(",") if t.strip()],
        is_public=is_public,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    try:
        return _save_upload(item, file, db)
    except (HTTPException, OSError):
        # 上传失败（超限等）时，删除刚创建但没配上文件的笔记，避免留下空条目
        db.delete(item)
        db.commit()
        raise
