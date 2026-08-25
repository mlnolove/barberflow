"""Criptografia simétrica em repouso para campos financeiros sensíveis
(seção 12: chave PIX, dados de conta de recebimento — "criptografar dados
sensíveis quando houver necessidade real de armazenamento").

Usa Fernet (AES-128-CBC + HMAC, autenticado) com uma chave única por
ambiente (`FIELD_ENCRYPTION_KEY`). Isso é ortogonal ao gateway de
pagamento: mesmo com Mercado Pago tokenizando cartão/PIX no checkout, a
barbearia ainda cadastra uma chave PIX/identificador de conta para
*receber* — esse dado precisa estar protegido no banco, nunca em texto
puro, e nunca é devolvido para clientes ou outras barbearias (ver
`services/financial_account_service.py`).
"""

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

_fernet = Fernet(settings.FIELD_ENCRYPTION_KEY.encode("utf-8"))


def encrypt_field(plain_value: str) -> str:
    return _fernet.encrypt(plain_value.encode("utf-8")).decode("utf-8")


def decrypt_field(encrypted_value: str) -> str:
    try:
        return _fernet.decrypt(encrypted_value.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Valor criptografado inválido ou chave incorreta.") from exc
