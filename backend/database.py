"""
database.py
-----------
Sets up the SQLite database connection using SQLAlchemy.
Call `init_db()` once at startup to create all tables automatically.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite file lives next to this script
DATABASE_URL = "sqlite:///./roboops.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite + FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a DB session and closes it when done.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables defined in models.py if they don't already exist."""
    # Import models here so SQLAlchemy knows about them before creating tables
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
