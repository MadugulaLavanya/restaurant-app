from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from datetime import datetime
from database.db import Base
import enum

class TableStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"

class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, unique=True, index=True)
    capacity = Column(Integer)
    status = Column(SQLEnum(TableStatus), default=TableStatus.AVAILABLE)
    occupied_since = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QueueEntry(Base):
    __tablename__ = "queue"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    party_size = Column(Integer)
    phone = Column(String, nullable=True)
    position = Column(Integer)
    estimated_wait_time = Column(Integer)  # in minutes
    joined_at = Column(DateTime, default=datetime.utcnow)
    notified = Column(Integer, default=0)  # 0 = not notified, 1 = notified

class PerformanceMetric(Base):
    __tablename__ = "performance_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    metric_type = Column(String)  # e.g., "avg_wait_time", "table_turnover", "queue_length"
    value = Column(Integer)
    metadata_json = Column(String, nullable=True) # Optional extra data
