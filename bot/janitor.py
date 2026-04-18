# =========================================
# bot/janitor.py
# =========================================

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Server, ServerMetadata, QuarantineLog
import json
import time
import threading


def run_once():
    db: Session = SessionLocal()
    try:
        orphaned_servers = db.query(Server).filter(
            Server.owner_id.is_(None),
            Server.status == "orphaned"
        ).all()

        for server in orphaned_servers:
            log_lines = []

            metadata = db.query(ServerMetadata).filter(
                ServerMetadata.server_id == server.id
            ).all()

            for meta in metadata:
                decoded_value = meta.meta_value

                if decoded_value.startswith('"') and decoded_value.endswith('"'):
                    try:
                        decoded_value = json.loads(decoded_value)
                    except json.JSONDecodeError:
                        pass
                else:
                    try:
                        decoded_value = json.loads(f'"{decoded_value}"')
                    except (json.JSONDecodeError, ValueError):
                        pass

                value_lines = str(decoded_value).splitlines()

                if not value_lines:
                    log_lines.append(f"{meta.meta_key}:")
                else:
                    log_lines.append(f"{meta.meta_key}: {value_lines[0]}")
                    for extra_line in value_lines[1:]:
                        log_lines.append(extra_line)

            log_lines.append(f"X-Original-Env: {server.environment}")
            log_lines.append("system_status: quarantined")

            log_text = "\n".join(log_lines)

            existing_log = db.query(QuarantineLog).filter(
                QuarantineLog.server_id == server.id
            ).first()

            if existing_log:
                existing_log.log_text = log_text
            else:
                db.add(
                    QuarantineLog(
                        server_id=server.id,
                        log_text=log_text
                    )
                )

            server.status = "quarantined"

        db.commit()

    finally:
        db.close()


# -----------------------------
# BACKGROUND LOOP
# -----------------------------

def janitor_loop(interval=20):
    while True:
        try:
            run_once()
        except Exception as e:
            print("Janitor error:", e)
        time.sleep(interval)


def start_background_janitor():
    thread = threading.Thread(target=janitor_loop, daemon=True)
    thread.start()

