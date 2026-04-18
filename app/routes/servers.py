# app/routes/servers.py
# Server Lifecycle API Endpoints

from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4, UUID
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.models import Server, ServerMetadata, QuarantineLog
from app.auth import get_current_user
from app.abac import User as ABACUser, Server as ABACServer, can_access
from restore.restore import restore_server as restore_engine

router = APIRouter(prefix="/servers", tags=["servers"])


# =========================
# Pydantic input models
# =========================

class MetadataInput(BaseModel):
    key: str
    value: str


# =========================
# CREATE SERVER (Dev only)
# =========================

@router.post("")
def create_server(
    name: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    server = Server(
        id=uuid4(),
        name=name,
        owner_id=user.id,
        environment="Dev",
        status="active",
    )
    db.add(server)
    db.commit()

    return {
        "id": server.id,
        "environment": server.environment,
        "status": server.status,
    }


# =========================
# LIST SERVERS (including decoys)
# =========================

@router.get("")
def list_servers(db: Session = Depends(get_db)):
    return db.query(Server).all()


# =========================
# ORPHAN SERVER
# =========================

@router.post("/{server_id}/orphan")
def orphan_server(
    server_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(404)

    abac_user = ABACUser(user.id, user.role)
    abac_server = ABACServer(
        server.id, server.owner_id, server.environment, server.status
    )

    if not can_access(abac_user, abac_server):
        raise HTTPException(403)

    server.owner_id = None
    server.status = "orphaned"
    db.commit()

    return {"status": "orphaned"}


# =========================
# ORPHANED / QUARANTINED VIEWS
# =========================

@router.get("/orphaned")
def view_orphaned(db: Session = Depends(get_db)):
    return db.query(Server).filter(Server.status == "orphaned").all()


@router.get("/quarantined")
def view_quarantined(db: Session = Depends(get_db)):
    return db.query(Server).filter(Server.status == "quarantined").all()


# =========================
# VIEW METADATA (ABAC only)
# =========================

@router.get("/{server_id}/metadata")
def view_metadata(
    server_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(404)

    abac_user = ABACUser(user.id, user.role)
    abac_server = ABACServer(
        server.id, server.owner_id, server.environment, server.status
    )

    if not can_access(abac_user, abac_server):
        raise HTTPException(403)

    return (
        db.query(ServerMetadata)
        .filter(ServerMetadata.server_id == server_id)
        .all()
    )


# =========================
# UPDATE METADATA (HARDENED)
# =========================

@router.post("/{server_id}/metadata")
def update_metadata(
    server_id: UUID,
    payload: MetadataInput,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    key = payload.key
    value = payload.value

    if key.startswith("X-"):
        raise HTTPException(400, "System keys are not allowed")

    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(404)

    # 🔒 HARD SECURITY BOUNDARY
    if (
        server.owner_id != user.id
        or server.environment != "Dev"
        or server.status != "active"
    ):
        raise HTTPException(
            status_code=403,
            detail="Metadata can only be edited on owned Dev servers",
        )

    meta = (
        db.query(ServerMetadata)
        .filter(
            ServerMetadata.server_id == server_id,
            ServerMetadata.meta_key == key,
        )
        .first()
    )

    if meta:
        meta.meta_value = value
    else:
        db.add(
            ServerMetadata(
                server_id=server_id,
                meta_key=key,
                meta_value=value,
            )
        )

    db.commit()
    return {"status": "metadata updated"}


# =========================
# QUARANTINE LOG
# =========================

@router.get("/{server_id}/quarantine-log")
def view_quarantine_log(
    server_id: UUID,
    db: Session = Depends(get_db),
):
    log = (
        db.query(QuarantineLog)
        .filter(QuarantineLog.server_id == server_id)
        .first()
    )
    if not log:
        raise HTTPException(404)

    return {"log": log.log_text}


# =========================
# RESTORE
# =========================

@router.post("/{server_id}/restore")
def restore_server_endpoint(
    server_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(404)

    if server.status != "quarantined":
        raise HTTPException(400, "Server is not quarantined")

    restore_engine(server_id)
    return {"status": "restored"}

