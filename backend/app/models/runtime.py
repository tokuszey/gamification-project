"""
Persistent runtime / analytics tables (sessions, scored events).
Single `User` definition lives in app.models.user — do not duplicate.
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db.base_class import Base


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    spec_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=True)
    spec_id = Column(Integer, nullable=True, index=True)
    event_type = Column(String(120), nullable=True)
    kpi_key = Column(String(160), nullable=True)
    value = Column(Integer, default=0)
    payload = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Score(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    spec_id = Column(Integer, nullable=True, index=True)
    total_points = Column(Integer, default=0, nullable=True)


class UserGameState(Base):
    """
    Persisted player progress for Phase-2 realization (per username + spec).
    Frontend syncs from Player Runtime; complements ephemeral localStorage.
    """

    __tablename__ = "user_game_state"

    id = Column(Integer, primary_key=True, autoincrement=True)
    player_key = Column(String(128), nullable=False, index=True)
    spec_id = Column(Integer, nullable=False, index=True)
    xp = Column(Integer, default=0, nullable=False)
    level = Column(Integer, default=1, nullable=False)
    virtual_currency = Column(Integer, default=0, nullable=False)
    badges = Column(JSONB, nullable=True)
    shop_owned_ids = Column(JSONB, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
