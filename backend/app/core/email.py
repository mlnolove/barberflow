"""Envio de e-mail transacional (reset de senha, futuramente notificações).

Duas implementações de `EmailBackend`:
- `SmtpEmailBackend`: envia de verdade via SMTP (funciona com Gmail, Brevo,
  SendGrid, Amazon SES ou qualquer servidor SMTP — só depende de
  `SMTP_HOST`/`SMTP_USERNAME`/`SMTP_PASSWORD` estarem configurados).
- `LoggingEmailBackend`: usada quando `SMTP_HOST` não está configurado —
  registra o conteúdo do e-mail (incluindo o link de reset) no log da
  aplicação, mantendo o fluxo de reset de senha testável em desenvolvimento
  sem exigir credenciais de um provedor real.

`get_email_backend()` escolhe entre as duas automaticamente conforme a
configuração presente.
"""

import logging
import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger("barberflow.email")


class EmailBackend(Protocol):
    def send(self, *, to: str, subject: str, body: str) -> None: ...


class LoggingEmailBackend:
    def send(self, *, to: str, subject: str, body: str) -> None:
        logger.info(
            "E-mail (backend de log, SMTP_HOST não configurado) para %s: %s\n%s",
            to,
            subject,
            body,
        )


class SmtpEmailBackend:
    def __init__(
        self, host: str, port: int, username: str | None, password: str | None, use_tls: bool
    ):
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._use_tls = use_tls

    def send(self, *, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM_EMAIL
        message["To"] = to
        message.set_content(body)

        # Porta 465 é sempre TLS implícito (a conexão já nasce criptografada)
        # — chamar STARTTLS nela quebra o handshake. É o padrão usado por
        # vários provedores (Gmail, Amazon SES, Outlook), então detectamos
        # pela porta em vez de exigir mais uma variável de configuração.
        if self._port == 465:
            with smtplib.SMTP_SSL(self._host, self._port, timeout=15) as server:
                if self._username and self._password:
                    server.login(self._username, self._password)
                server.send_message(message)
            return

        with smtplib.SMTP(self._host, self._port, timeout=15) as server:
            if self._use_tls:
                server.starttls()
            if self._username and self._password:
                server.login(self._username, self._password)
            server.send_message(message)


def get_email_backend() -> EmailBackend:
    if settings.SMTP_HOST:
        return SmtpEmailBackend(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=settings.SMTP_USE_TLS,
        )
    return LoggingEmailBackend()


def send_password_reset_email(*, to: str, full_name: str, reset_link: str) -> None:
    backend = get_email_backend()
    try:
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
    except Exception:
        # Nunca deixa uma falha no envio de e-mail vazar como erro 500 pro
        # usuário nem revelar se o endereço existe — o chamador
        # (password_reset_service) já responde sempre 204 independentemente.
        # Fica só o log pra investigar um provedor SMTP fora do ar.
        logger.exception("Falha ao enviar e-mail de redefinição de senha para %s", to)
