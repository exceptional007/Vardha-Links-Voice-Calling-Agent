from sqlalchemy.orm import Session

from ..models import AppSetting, KnowledgeBase


def get_selected_knowledge_base_text(db: Session) -> str:
    setting = (
        db.query(AppSetting)
        .filter(AppSetting.id == 1)
        .first()
    )

    if not setting or setting.knowledge_base_scope == "all":
        entries = (
            db.query(KnowledgeBase)
            .order_by(KnowledgeBase.id.asc())
            .all()
        )

    else:
        entry = (
            db.query(KnowledgeBase)
            .filter(
                KnowledgeBase.id == setting.knowledge_base_id
            )
            .first()
        )

        entries = [entry] if entry else []

    if not entries:
        return ""

    return "\n\n".join(
        f"{entry.title}\n{entry.content}"
        for entry in entries
    )
    

def get_selected_knowledge_base(db):
    setting = db.query(AppSetting).filter(AppSetting.id == 1).first()

    if not setting:
        return None

    if setting.knowledge_base_scope == "single":
        return (
            db.query(KnowledgeBase)
            .filter(KnowledgeBase.id == setting.knowledge_base_id)
            .first()
        )

    return None