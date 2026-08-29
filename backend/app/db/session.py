from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# Fixa o fuso da SESSÃO em cada conexão pro mesmo valor de
# `app.core.business_time.BUSINESS_TZ` — sem isso, `func.date(...)` sobre
# colunas timestamptz (ex.: dashboard contando agendamentos "de hoje")
# extrai o dia no fuso padrão do servidor Postgres (tipicamente UTC), que
# diverge do "hoje" calculado em Python entre ~21h e 23h59 no horário de
# Brasília.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"options": "-c timezone=America/Sao_Paulo"},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
