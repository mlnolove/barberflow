"""Rate limiting simples para endpoints sensíveis de autenticação.

`RATE_LIMIT_LOGIN_PER_MINUTE` já existia em `config.py` mas não era aplicado
em nenhum endpoint — este módulo fecha essa lacuna. Implementação em memória
(janela deslizante por IP + bucket), sem dependência nova: suficiente para o
deploy atual (uma única instância no Railway). Se a API escalar para múltiplas
instâncias, isso precisa migrar para um backend compartilhado (ex.: Redis) —
o estado aqui não é compartilhado entre processos.
"""

import threading
import time
from collections import defaultdict

from fastapi import Request

from app.core.config import settings
from app.core.exceptions import DomainError


class RateLimitExceededError(DomainError):
    def __init__(self):
        super().__init__("Muitas tentativas. Aguarde um instante antes de tentar novamente.")


_WINDOW_SECONDS = 60.0
_lock = threading.Lock()
_hits: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, max_per_minute: int | None = None):
    """Dependency factory do FastAPI: limita `max_per_minute` chamadas por
    IP, por `bucket`, numa janela deslizante de 60s."""

    limit = max_per_minute or settings.RATE_LIMIT_LOGIN_PER_MINUTE

    def _checker(request: Request) -> None:
        key = f"{bucket}:{_client_ip(request)}"
        now = time.monotonic()
        with _lock:
            hits = _hits[key]
            cutoff = now - _WINDOW_SECONDS
            while hits and hits[0] < cutoff:
                hits.pop(0)
            if len(hits) >= limit:
                raise RateLimitExceededError()
            hits.append(now)

    return _checker
