"""Push notification (seção 15): sem provedor real configurado (nenhuma
credencial de FCM/APNs existe neste projeto, e não há tabela de device
tokens para registrar aparelhos), `LoggingPushBackend` apenas loga o envio
— mesma estratégia usada em `core/email.py` para não fabricar uma
integração que o time não escolheu. Toda notificação criada em
`services/notification_service.py` já passa por aqui, então plugar um
provedor real depois é implementar `PushBackend.send` uma vez.
"""

import logging
from typing import Protocol

logger = logging.getLogger("barberflow.push")


class PushBackend(Protocol):
    def send(self, *, title: str, body: str, data: dict | None = None) -> None: ...


class LoggingPushBackend:
    def send(self, *, title: str, body: str, data: dict | None = None) -> None:
        logger.info("Push (backend de log, nenhum provedor configurado): %s — %s", title, body)


def get_push_backend() -> PushBackend:
    return LoggingPushBackend()
