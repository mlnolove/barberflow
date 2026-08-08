import re

_PHONE_DIGITS_RE = re.compile(r"\D+")


def normalize_br_phone(value: str) -> str:
    """Valida e normaliza um telefone brasileiro para apenas dígitos (DDD + número).

    Aceita 10 dígitos (fixo) ou 11 dígitos (celular com 9º dígito), com ou
    sem formatação. Levanta ValueError com mensagem segura para o usuário.
    """
    digits = _PHONE_DIGITS_RE.sub("", value)
    if len(digits) not in (10, 11):
        raise ValueError("Telefone inválido. Informe um número com DDD.")
    return digits
