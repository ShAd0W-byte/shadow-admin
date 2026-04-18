# app/models.py
from sqlalchemy import Column, String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db import Base
from sqlalchemy import Integer


class User(Base):
    __tablename__ = "users"

    id = Column(UUID, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class Server(Base):
    __tablename__ = "servers"

    id = Column(UUID, primary_key=True)
    name = Column(String, nullable=False)

    owner_id = Column(UUID, ForeignKey("users.id"), nullable=True)

    environment = Column(String, nullable=False)
    status = Column(String, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())


class ServerMetadata(Base):
    __tablename__ = "server_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(UUID, ForeignKey("servers.id"), nullable=False)
    meta_key = Column(String, nullable=False)
    meta_value = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())


class QuarantineLog(Base):
    __tablename__ = "quarantine_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(UUID, ForeignKey("servers.id"), nullable=False)
    log_text = Column(Text, nullable=False)

    created_at = Column(TIMESTAMP, server_default=func.now())

