"""Abstração de gateway de pagamento (seção 12 da especificação).

Nenhuma credencial real do Mercado Pago existe neste projeto — sem
`MERCADOPAGO_ACCESS_TOKEN` configurado, `get_payment_gateway()` devolve
`SandboxPaymentGateway`, que simula um checkout já aprovado (sem falar com
nenhum provedor externo), permitindo testar o fluxo completo
checkout → webhook → assinatura ativa sem credenciais. Quando o token for
configurado, `MercadoPagoGateway` assume — a implementação segue a API
documentada do Mercado Pago (Checkout Pro / Preferences + validação de
assinatura de webhook), mas não foi exercida contra o ambiente real (não há
como, sem uma conta de produção/sandbox do Mercado Pago disponível aqui).

Nunca processa nem armazena número de cartão/CVV — o pagamento acontece
inteiramente na página hospedada do gateway (`checkout_url`); o backend só
recebe o resultado via webhook.
"""

import hashlib
import hmac
import logging
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

import httpx

from app.core.config import settings

logger = logging.getLogger("barberflow.payment_gateway")


@dataclass
class CheckoutResult:
    external_reference: str
    checkout_url: str | None
    external_payment_id: str | None


@dataclass
class WebhookEvent:
    external_payment_id: str
    status: str
    """Status cru do gateway (ex.: "approved", "pending", "rejected")."""


class PaymentGateway(Protocol):
    def create_checkout(
        self, *, amount: Decimal, description: str, external_reference: str, payer_email: str
    ) -> CheckoutResult: ...

    def handle_webhook(self, *, headers: dict[str, str], payload: dict) -> WebhookEvent | None:
        """Valida a assinatura ANTES de fazer qualquer coisa com o payload —
        um único método em vez de dois para impedir que quem chama use o
        conteúdo do webhook sem checar a assinatura primeiro. Devolve
        `None` quando não há nada a processar (evento irrelevante) e deve
        recusar (retornar `None` ou levantar) uma assinatura inválida."""
        ...


class SandboxPaymentGateway:
    """Sem gateway real configurado. `create_checkout` já devolve o
    pagamento como aprovado — não existe "esperar o cliente pagar" numa
    página que não existe. Serve para desenvolvimento/demo e para os
    testes automatizados."""

    def create_checkout(
        self, *, amount: Decimal, description: str, external_reference: str, payer_email: str
    ) -> CheckoutResult:
        return CheckoutResult(
            external_reference=external_reference,
            checkout_url=None,
            external_payment_id=f"sandbox_{uuid.uuid4().hex}",
        )

    def handle_webhook(self, *, headers: dict[str, str], payload: dict) -> WebhookEvent | None:
        # Sem provedor real, não existe webhook de verdade — o checkout já
        # resolve o pagamento na hora (ver `create_checkout`).
        return None


class MercadoPagoGateway:
    """Checkout Pro (Preferences API) + validação de assinatura de webhook
    conforme documentação do Mercado Pago. Requer `MERCADOPAGO_ACCESS_TOKEN`;
    `MERCADOPAGO_WEBHOOK_SECRET` é necessário para validar webhooks (sem
    ele, `verify_webhook_signature` sempre recusa — nunca aceita um webhook
    não assinado só porque o secret não foi configurado)."""

    _BASE_URL = "https://api.mercadopago.com"

    def __init__(self, access_token: str, webhook_secret: str | None):
        self._access_token = access_token
        self._webhook_secret = webhook_secret

    def create_checkout(
        self, *, amount: Decimal, description: str, external_reference: str, payer_email: str
    ) -> CheckoutResult:
        response = httpx.post(
            f"{self._BASE_URL}/checkout/preferences",
            headers={"Authorization": f"Bearer {self._access_token}"},
            json={
                "items": [
                    {
                        "title": description,
                        "quantity": 1,
                        "unit_price": float(amount),
                        "currency_id": "BRL",
                    }
                ],
                "external_reference": external_reference,
                "payer": {"email": payer_email},
            },
            timeout=15.0,
        )
        response.raise_for_status()
        body = response.json()
        return CheckoutResult(
            external_reference=external_reference,
            checkout_url=body.get("init_point"),
            external_payment_id=body.get("id"),
        )

    def _verify_signature(self, *, headers: dict[str, str], data_id: str) -> bool:
        if not self._webhook_secret:
            logger.warning("MERCADOPAGO_WEBHOOK_SECRET não configurado — webhook recusado.")
            return False

        signature_header = headers.get("x-signature", "")
        request_id = headers.get("x-request-id", "")
        parts = dict(part.split("=", 1) for part in signature_header.split(",") if "=" in part)
        ts, received_hash = parts.get("ts"), parts.get("v1")
        if not ts or not received_hash:
            return False

        manifest = f"id:{data_id.lower()};request-id:{request_id};ts:{ts};"
        expected_hash = hmac.new(
            self._webhook_secret.encode("utf-8"), manifest.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_hash, received_hash)

    def handle_webhook(self, *, headers: dict[str, str], payload: dict) -> WebhookEvent | None:
        data_id = payload.get("data", {}).get("id")
        if not data_id or payload.get("type") != "payment":
            return None

        if not self._verify_signature(headers=headers, data_id=str(data_id)):
            logger.warning("Webhook do Mercado Pago com assinatura inválida — descartado.")
            return None

        response = httpx.get(
            f"{self._BASE_URL}/v1/payments/{data_id}",
            headers={"Authorization": f"Bearer {self._access_token}"},
            timeout=15.0,
        )
        response.raise_for_status()
        body = response.json()
        return WebhookEvent(external_payment_id=str(data_id), status=body.get("status", "unknown"))


def get_payment_gateway() -> PaymentGateway:
    if settings.MERCADOPAGO_ACCESS_TOKEN:
        return MercadoPagoGateway(
            settings.MERCADOPAGO_ACCESS_TOKEN, settings.MERCADOPAGO_WEBHOOK_SECRET
        )
    return SandboxPaymentGateway()
