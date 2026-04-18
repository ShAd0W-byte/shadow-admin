# =========================================
# app/auth.py
# Fake Authentication (INTENTIONAL)
# =========================================

from uuid import UUID
from fastapi import Depends

from app.db import get_db
from app.models import User

PLAYER_ID = UUID("11111111-1111-1111-1111-111111111111")


def get_current_user(db=Depends(get_db)) -> User:
    """
    Fake authentication.
    Always returns the dev user.

    IMPORTANT:
    - No Session type annotation
    - Uses Depends(get_db)
    - Required for Python 3.13 + FastAPI
    """

    user = db.query(User).filter(User.id == PLAYER_ID).first()

    if not user:
        raise RuntimeError("Player user not found in database")

    return user

