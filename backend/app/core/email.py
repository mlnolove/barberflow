"""Envio de e-mail transacional (reset de senha, futuramente notificações).

Nenhum provedor de e-mail está configurado neste projeto ainda — não há
credenciais SMTP/API key de nenhum serviço nos arquivos `.env`. Em vez de
inventar uma integração com um provedor que o time não escolheu, o backend
define a interface (`EmailBackend`) e usa por padrão `LoggingEmailBackend`,
que registra o conteúdo do e-mail (incluindo o link de reset) no log da
aplicação. Isso mantém o fluxo de reset de senha funcional de ponta a ponta
em desenvolvimento/staging sem bloquear a fase atual — trocar por um
provedor real (SMTP, Resend, SES etc.) é implementar `EmailBackend.send` uma
vez e apontar `get_email_backend()` para ele.
"""

import logging
from typing import Protocol

logger = logging.getLogger("barberflow.email")


class EmailBackend(Protocol):
    def send(self, *, to: str, subject: str, body: str) -> None: ...


class LoggingEmailBackend:
    def send(self, *, to: str, subject: str, body: str) -> None:
        logger.info(
            "E-mail (backend de log, nenhum provedor configurado) para %s: %s\n%s",
            to,
            subject,
            body,
        )


def get_email_backend() -> EmailBackend:
    return LoggingEmailBackend()


def send_password_reset_email(*, to: str, full_name: str, reset_link: str) -> None:
    backend = get_email_backend()
    backend.send(
        to=to,
        subject="Redefinição de senha — BarberFlow",
        body=(
            f"Olá, {full_name}.\n\n"
            "Recebemos uma solicitação para redefinir sua senha. Se foi você, "
            f"use o link abaixo (válido por tempo limitado):\n{reset_link}\n\n"
            "Se você não solicitou isso, pode ignorar este e-mail."
        ),
    )
