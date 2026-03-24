from sqlalchemy.orm import Session
from app.models import User


def ensure_user_exists(db: Session, user_id: int) -> User:
    """Ensure a user record exists for demo user_id-based flows."""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user

    user = User(
        id=user_id,
        username=f"demo_user_{user_id}",
        email=f"demo_user_{user_id}@example.local",
        hashed_password="demo-password",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
