from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import KnowledgeBase, AppSetting
from ..schemas import (
    KnowledgeBaseCreate,
    KnowledgeBaseResponse,
    KnowledgeBaseUpdate,
    KnowledgeBaseSelection
)


router = APIRouter(
    prefix="/knowledge-base",
    tags=["Knowledge Base"],
)

@router.get("/selection")
def get_knowledge_base_selection(
    db: Session = Depends(get_db),
):
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.id == 1)
        .first()
    )

    if not setting:
        setting = AppSetting(
            id=1,
            knowledge_base_scope="all",
            knowledge_base_id=None,
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)

    knowledge_base_title = None

    if (
        setting.knowledge_base_scope == "single"
        and setting.knowledge_base_id
    ):
        kb = (
            db.query(KnowledgeBase)
            .filter(KnowledgeBase.id == setting.knowledge_base_id)
            .first()
        )

        if kb:
            knowledge_base_title = kb.title

    return {
        "scope": setting.knowledge_base_scope,
        "knowledge_base_id": setting.knowledge_base_id,
        "knowledge_base_title": knowledge_base_title,
    }


@router.put("/selection")
def update_knowledge_base_selection(
    data: KnowledgeBaseSelection,
    db: Session = Depends(get_db),
):
    if data.scope not in ["all", "single"]:
        raise HTTPException(
            status_code=400,
            detail="scope must be 'all' or 'single'",
        )

    if data.scope == "single":
        if data.knowledge_base_id is None:
            raise HTTPException(
                status_code=400,
                detail="knowledge_base_id is required for single selection",
            )

        kb = (
            db.query(KnowledgeBase)
            .filter(KnowledgeBase.id == data.knowledge_base_id)
            .first()
        )

        if not kb:
            raise HTTPException(
                status_code=404,
                detail="Knowledge Base not found",
            )

    setting = (
        db.query(AppSetting)
        .filter(AppSetting.id == 1)
        .first()
    )

    if not setting:
        setting = AppSetting(id=1)
        db.add(setting)

    setting.knowledge_base_scope = data.scope
    setting.knowledge_base_id = (
        data.knowledge_base_id
        if data.scope == "single"
        else None
    )

    db.commit()
    db.refresh(setting)

    knowledge_base_title = None

    if setting.knowledge_base_id:
        kb = (
            db.query(KnowledgeBase)
            .filter(KnowledgeBase.id == setting.knowledge_base_id)
            .first()
        )

        if kb:
            knowledge_base_title = kb.title

    return {
        "message": "Knowledge Base selection updated",
        "scope": setting.knowledge_base_scope,
        "knowledge_base_id": setting.knowledge_base_id,
        "knowledge_base_title": knowledge_base_title,
    }


@router.post(
    "",
    response_model=KnowledgeBaseResponse,
)
def create_knowledge_base(
    data: KnowledgeBaseCreate,
    db: Session = Depends(get_db),
):
    entry = KnowledgeBase(
        title=data.title,
        content=data.content,
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return entry


@router.get(
    "",
    response_model=list[KnowledgeBaseResponse],
)
def get_knowledge_base(
    db: Session = Depends(get_db),
):
    entries = (
        db.query(KnowledgeBase)
        .order_by(KnowledgeBase.id.desc())
        .all()
    )

    return entries


@router.put(
    "/{entry_id}",
    response_model=KnowledgeBaseResponse,
)
def update_knowledge_base(
    entry_id: int,
    data: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
):
    entry = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == entry_id)
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Knowledge base entry not found",
        )

    entry.title = data.title
    entry.content = data.content
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)

    return entry


@router.delete("/{entry_id}")
def delete_knowledge_base(
    entry_id: int,
    db: Session = Depends(get_db),
):
    entry = (
        db.query(KnowledgeBase)
        .filter(KnowledgeBase.id == entry_id)
        .first()
    )

    if not entry:
        raise HTTPException(
            status_code=404,
            detail="Knowledge base entry not found",
        )

    db.delete(entry)
    db.commit()

    return {
        "message": "Knowledge base entry deleted successfully"
    }
    