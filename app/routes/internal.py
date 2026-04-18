# app/routes/internal.py
# Internal / Prod-only Endpoints

from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Server
from app.auth import get_current_user
from app.abac import User as ABACUser, Server as ABACServer, can_access

router = APIRouter(prefix="/prod/internal", tags=["internal"])


@router.get("/backup", response_model=None)
def get_production_backup(
    server_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(404, "Server not found")

    abac_user = ABACUser(user.id, user.role)
    abac_server = ABACServer(
        server.id,
        server.owner_id,
        server.environment,
        server.status,
    )

    if not can_access(abac_user, abac_server):
        raise HTTPException(403, "Access denied")

    if server.environment != "Prod":
        raise HTTPException(403, "Not a production server")

    return {
        "backup": "FLAG{shadow_admin_prod_backup_access}"
    }

