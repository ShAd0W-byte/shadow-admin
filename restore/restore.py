# =========================================
# restore/restore.py
# Restore Engine — Legacy Parser
# =========================================

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Server, QuarantineLog
from uuid import UUID


def restore_server(server_id: UUID):
    """
    Restores a quarantined server using
    line-based parsing of quarantine logs.

    TRUST ASSUMPTIONS:
    - Quarantine logs are system-generated
    - System keys appear once
    - First match is authoritative
    """

    db: Session = SessionLocal()

    try:
        # 1️⃣ Load server
        server = db.query(Server).filter(Server.id == server_id).first()
        if not server:
            raise RuntimeError("Server not found")

        if server.status != "quarantined":
            raise RuntimeError("Server is not quarantined")

        # 2️⃣ Load quarantine log
        qlog = db.query(QuarantineLog).filter(
            QuarantineLog.server_id == server_id
        ).first()

        if not qlog:
            raise RuntimeError("Quarantine log missing")

        restored_env = None

        # 3️⃣ Parse log line-by-line
        for line in qlog.log_text.splitlines():
            if line.startswith("X-Original-Env"):
                # ❌ First match wins
                restored_env = line.split(":", 1)[1].strip()
                break

        if not restored_env:
            raise RuntimeError("Original environment not found")

        # 4️⃣ Restore trusted state
        server.environment = restored_env
        server.status = "active"

        # Restore ownership to player (simplified model)
        server.owner_id = UUID("11111111-1111-1111-1111-111111111111")

        db.commit()

    finally:
        db.close()
