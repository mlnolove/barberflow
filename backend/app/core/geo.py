"""Busca por proximidade sem depender de PostGIS.

O Postgres gerenciado usado em produção (Railway) não garante a extensão
PostGIS disponível, então a busca geográfica usa uma abordagem padrão para
escala de cidade/região: um bounding box (retângulo) calculado em Python para
aproveitar o índice `(latitude, longitude)` e podar candidatos rapidamente,
seguido da fórmula de haversine em SQL para a distância exata e ordenação.
Se o volume um dia justificar, migrar para PostGIS/`geography` é o próximo
passo natural — nada aqui impede essa evolução.
"""

import math

from sqlalchemy import ColumnElement, func

EARTH_RADIUS_KM = 6371.0
_KM_PER_DEGREE_LAT = 111.32


def bounding_box(
    latitude: float, longitude: float, radius_km: float
) -> tuple[float, float, float, float]:
    """Retorna (lat_min, lat_max, lng_min, lng_max) que cobre com folga o
    círculo de raio `radius_km` ao redor do ponto informado."""
    lat_delta = radius_km / _KM_PER_DEGREE_LAT
    km_per_degree_lng = _KM_PER_DEGREE_LAT * math.cos(math.radians(latitude))
    lng_delta = radius_km / km_per_degree_lng if km_per_degree_lng > 0.01 else 180.0
    return (
        latitude - lat_delta,
        latitude + lat_delta,
        longitude - lng_delta,
        longitude + lng_delta,
    )


def haversine_km_expr(
    lat_col: ColumnElement, lng_col: ColumnElement, latitude: float, longitude: float
) -> ColumnElement:
    """Expressão SQL (SQLAlchemy) da distância em km entre `(lat_col,
    lng_col)` e o ponto fixo informado, via fórmula de haversine."""
    lat1 = func.radians(latitude)
    lat2 = func.radians(lat_col)
    delta_lng = func.radians(lng_col - longitude)

    clamped = func.least(
        1.0,
        func.greatest(
            -1.0,
            func.cos(lat1) * func.cos(lat2) * func.cos(delta_lng) + func.sin(lat1) * func.sin(lat2),
        ),
    )
    return EARTH_RADIUS_KM * func.acos(clamped)
