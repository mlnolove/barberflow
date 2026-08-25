import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.rate_limit import _hits as _rate_limit_hits
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.seed import _seed_permissions, _seed_roles, _seed_subscription_plans

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://barberflow:barberflow_dev@localhost:5432/barberflow_test",
)

engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with TestingSessionLocal() as db:
        permissions = _seed_permissions(db)
        _seed_roles(db, permissions)
        _seed_subscription_plans(db)
        db.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def db_session():
    """Sessão isolada por teste: roda dentro de uma transação externa que é
    revertida ao final, mesmo que o código da aplicação chame db.commit()
    (via SAVEPOINT reiniciado a cada commit interno)."""
    connection = engine.connect()
    outer_transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            connection.begin_nested()

    yield session

    session.close()
    outer_transaction.rollback()
    connection.close()


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    """O limiter em memória (`app.core.rate_limit`) é um estado global de
    processo, não do banco — sem isso, testes que fazem vários signup/login
    (a maioria da suíte) esbarrariam no limite uns nos outros, já que o
    TestClient sempre reporta o mesmo IP falso ("testclient")."""
    _rate_limit_hits.clear()
    yield


@pytest.fixture
def client(db_session):
    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
