import os
import psycopg2
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
    JSON,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from loguru import logger


DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://mise_user:mise_password@postgres:5432/mise_db"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, nullable=True)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UploadedFileMeta(Base):
    __tablename__ = "uploaded_file_meta"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    label = Column(String(255), index=True, nullable=False)
    filename = Column(String(1024), nullable=False)
    original_name = Column(String(1024), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(Text, nullable=True)
    content_hash = Column(String(64), index=True, nullable=True)


class KitchenLogRow(Base):
    __tablename__ = "kitchen_log_rows"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    uploaded_file_id = Column(
        Integer, ForeignKey("uploaded_file_meta.id"), index=True, nullable=False
    )
    label = Column(String(255), index=True, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow, index=True)
    row_data = Column(JSON, nullable=False)


class LLMInsight(Base):
    __tablename__ = "llm_insights"
    id = Column(Integer, primary_key=True, index=True)
    uploaded_file_id = Column(
        Integer, ForeignKey("uploaded_file_meta.id"), nullable=False, index=True
    )
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    label = Column(String(255), index=True, nullable=True)
    insights_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LLMJob(Base):
    __tablename__ = "llm_jobs"
    id = Column(Integer, primary_key=True, index=True)
    label = Column(String(255), index=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    uploaded_file_id = Column(
        Integer, ForeignKey("uploaded_file_meta.id"), index=True, nullable=True
    )
    status = Column(String(32), index=True, nullable=False, default="queued")
    result_json = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class PredictionResult(Base):
    __tablename__ = "prediction_results"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(255), unique=True, nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    prediction_data = Column(JSON, nullable=False, default={})
    status = Column(String(50), nullable=False, default="pending", index=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db_connection():
    """Get a direct database connection for raw SQL operations"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None


def get_db_session():
    """Get a SQLAlchemy database session"""
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        logger.error(f"Failed to create database session: {e}")
        db.close()
        return None
