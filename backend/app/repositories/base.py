import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class TenantScopedRepository(Generic[ModelType]):
    """Repositório base para entidades pertencentes a um tenant.

    O construtor exige `tenant_id` e toda query filtra por ele — isso torna
    estruturalmente impossível esquecer o filtro de isolamento multi-tenant
    (seção 28 da especificação): não existe forma de instanciar este
    repositório sem tenant, nem de consultar sem o filtro aplicado.
    """

    model: type[ModelType]

    def __init__(self, db: Session, tenant_id: uuid.UUID):
        self.db = db
        self.tenant_id = tenant_id

    def _scoped(self):
        return select(self.model).where(self.model.tenant_id == self.tenant_id)

    def get_by_id(self, entity_id: uuid.UUID) -> ModelType | None:
        stmt = self._scoped().where(self.model.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[ModelType]:
        return list(self.db.execute(self._scoped()).scalars().all())

    def add(self, entity: ModelType) -> ModelType:
        entity.tenant_id = self.tenant_id
        self.db.add(entity)
        self.db.flush()
        return entity

    def delete(self, entity: ModelType) -> None:
        self.db.delete(entity)
        self.db.flush()
