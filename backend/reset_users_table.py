from sqlalchemy import text

from app.db.session import engine
from app.models.user import User

with engine.begin() as conn:
    conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))

User.__table__.create(bind=engine)

print("users table recreated successfully.")
