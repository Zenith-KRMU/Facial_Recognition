import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from backend.config import Config
from backend.database.models import Base, Camera, EnrolledFace

logger = logging.getLogger(__name__)

engine = None
SessionLocal = None

def init_db():
    global engine, SessionLocal
    database_url = Config.DATABASE_URL

    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        logger.info(f"[DB] Initializing SQLite database engine: {database_url}")
    else:
        logger.info(f"[DB] Initializing PostgreSQL database engine: {database_url}")

    try:
        engine = create_engine(
            database_url,
            connect_args=connect_args,
            pool_pre_ping=True,
        )
        Base.metadata.create_all(bind=engine)
        SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
        logger.info("[DB] Database schema and tables created/verified successfully.")
        
        # Seed default cameras if empty
        seed_defaults()
    except Exception as e:
        logger.warning(f"[DB] Failed to connect to configured DB ({database_url}): {e}. Falling back to SQLite.")
        fallback_url = "sqlite:///crowd_vision.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)
        SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
        seed_defaults()

def seed_defaults():
    session = get_session()
    try:
        count = session.query(Camera).count()
        if count == 0:
            default_cams = [
                Camera(
                    id="CAM-01",
                    name="North Gate Concourse",
                    zone="Entry Zone A",
                    resolution="1920x1080 30FPS",
                    fps=30.0,
                    status="ONLINE",
                    tripwire_enabled=True,
                ),
                Camera(
                    id="CAM-02",
                    name="Central Transit Junction",
                    zone="Main Concourse Corridor",
                    resolution="1920x1080 30FPS",
                    fps=30.0,
                    status="ONLINE",
                    tripwire_enabled=True,
                ),
                Camera(
                    id="CAM-03",
                    name="Security Checkpoint Bravo",
                    zone="Screening Area",
                    resolution="1280x720 30FPS",
                    fps=30.0,
                    status="ONLINE",
                    tripwire_enabled=True,
                ),
                Camera(
                    id="CAM-04",
                    name="South Platform Egress",
                    zone="Platform Exit Gates",
                    resolution="1920x1080 30FPS",
                    fps=30.0,
                    status="ONLINE",
                    tripwire_enabled=True,
                ),
            ]
            session.add_all(default_cams)
            session.commit()
            logger.info("[DB] Seeded 4 default CCTV cameras into database.")
    except Exception as e:
        session.rollback()
        logger.error(f"[DB] Seeding failed: {e}")
    finally:
        session.close()

def get_session():
    if SessionLocal is None:
        init_db()
    return SessionLocal()
