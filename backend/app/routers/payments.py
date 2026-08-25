from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.repositories.payment_repository import PaymentRepository
from app.schemas.common import Page
from app.schemas.subscription import PaymentRead
from app.services import payment_service

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("", response_model=Page[PaymentRead])
def list_payments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
):
    items, total = PaymentRepository(db, current_user.tenant_id).list_paginated(
        page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.post("/webhook/mercadopago", status_code=204)
async def mercadopago_webhook(request: Request, db: Session = Depends(get_db)):
    """Sem autenticação de usuário — a confiança vem da assinatura HMAC do
    próprio Mercado Pago (`core/payment_gateway.MercadoPagoGateway.
    handle_webhook`), nunca de um token de sessão. Sempre responde 204,
    mesmo para eventos ignorados/inválidos — o Mercado Pago reenvia
    indefinidamente se receber algo diferente de 2xx, e não há nada de
    sensível a revelar na resposta de um webhook."""
    payload = await request.json()
    payment_service.process_webhook(db, headers=dict(request.headers), payload=payload)
