from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker
from app.models import Base

DATABASE_URL = "mysql+aiomysql://root:password@mariadb:3306/nlp"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
)

# ❗ No type args – avoids Pylance bug
AsyncSessionLocal = sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_all_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
