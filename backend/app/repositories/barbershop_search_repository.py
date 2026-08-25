from dataclasses import dataclass
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.geo import bounding_box, haversine_km_expr
from app.models.employee import Employee
from app.models.service import Service
from app.models.tenant import Tenant

DEFAULT_SEARCH_RADIUS_KM = 50.0


@dataclass
class BarbershopSearchResult:
    tenant: Tenant
    distance_km: float | None
    min_price: Decimal | None
    max_price: Decimal | None


class BarbershopSearchRepository:
    """Busca entre barbearias (tenants) — por natureza cruza tenants, então
    deliberadamente não é `TenantScopedRepository`. Nunca expõe tenants
    inativos (`is_active=False`) — equivalente a uma barbearia que encerrou
    as atividades, não deve aparecer para clientes."""

    def __init__(self, db: Session):
        self.db = db

    def _price_range_by_tenant(self, tenant_ids: list) -> dict:
        if not tenant_ids:
            return {}
        stmt = (
            select(Service.tenant_id, func.min(Service.price), func.max(Service.price))
            .where(Service.tenant_id.in_(tenant_ids), Service.is_active.is_(True))
            .group_by(Service.tenant_id)
        )
        return {row[0]: (row[1], row[2]) for row in self.db.execute(stmt).all()}

    def search(
        self,
        *,
        query: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[BarbershopSearchResult], int]:
        stmt = select(Tenant).where(Tenant.is_active.is_(True))

        if query:
            like = f"%{query}%"
            service_match = (
                select(Service.tenant_id)
                .where(Service.is_active.is_(True))
                .where(or_(Service.name.ilike(like), Service.category.ilike(like)))
            )
            barber_match = (
                select(Employee.tenant_id)
                .where(Employee.is_active.is_(True))
                .where(Employee.full_name.ilike(like))
            )
            stmt = stmt.where(
                or_(
                    Tenant.name.ilike(like),
                    Tenant.city.ilike(like),
                    Tenant.id.in_(service_match),
                    Tenant.id.in_(barber_match),
                )
            )

        distance_expr = None
        if latitude is not None and longitude is not None:
            effective_radius = radius_km or DEFAULT_SEARCH_RADIUS_KM
            lat_min, lat_max, lng_min, lng_max = bounding_box(latitude, longitude, effective_radius)
            stmt = stmt.where(
                Tenant.latitude.isnot(None),
                Tenant.longitude.isnot(None),
                Tenant.latitude.between(lat_min, lat_max),
                Tenant.longitude.between(lng_min, lng_max),
            )
            distance_expr = haversine_km_expr(
                Tenant.latitude, Tenant.longitude, latitude, longitude
            )
            stmt = stmt.where(distance_expr <= effective_radius)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        offset = (page - 1) * limit
        if distance_expr is not None:
            paged_stmt = (
                stmt.add_columns(distance_expr.label("distance_km"))
                .order_by("distance_km")
                .offset(offset)
                .limit(limit)
            )
            rows = [(row[0], float(row[1])) for row in self.db.execute(paged_stmt).all()]
        else:
            paged_stmt = stmt.order_by(Tenant.name).offset(offset).limit(limit)
            rows = [(tenant, None) for tenant in self.db.execute(paged_stmt).scalars().all()]

        price_ranges = self._price_range_by_tenant([tenant.id for tenant, _ in rows])
        results = [
            BarbershopSearchResult(
                tenant=tenant,
                distance_km=distance_km,
                min_price=price_ranges.get(tenant.id, (None, None))[0],
                max_price=price_ranges.get(tenant.id, (None, None))[1],
            )
            for tenant, distance_km in rows
        ]
        return results, total
