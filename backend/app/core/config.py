from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "BarberFlow API"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://barberflow:barberflow_dev@localhost:5432/barberflow"
    )

    # Security / JWT
    JWT_SECRET_KEY: str = Field(default="change-me-in-env")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Rate limiting
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 5

    # Password reset
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30

    # Criptografia de dados financeiros sensíveis em repouso (chave de PIX
    # etc. — ver core/crypto.py). Chave Fernet (32 bytes urlsafe-base64).
    # O default só serve para dev local; produção PRECISA sobrescrever via
    # env, senão os dados ficam protegidos apenas por um segredo público.
    FIELD_ENCRYPTION_KEY: str = Field(default="8ZqPh_XEYxTGPPhmM760_HQi7KpkJk4MEpaO2AoZ6jI=")

    # Gateway de pagamento (Mercado Pago). Sem essas variáveis configuradas,
    # o backend usa um gateway "sandbox" que nunca fala com um provedor real
    # — ver core/payment_gateway.py.
    MERCADOPAGO_ACCESS_TOKEN: str | None = None
    MERCADOPAGO_WEBHOOK_SECRET: str | None = None

    # E-mail transacional (reset de senha). Sem SMTP_HOST configurado, o
    # backend usa um backend "de log" (não envia de verdade) — ver
    # core/email.py. Funciona com qualquer provedor SMTP (Gmail, Brevo,
    # SendGrid, Amazon SES, um servidor próprio etc.).
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "no-reply@barberflow.app"
    SMTP_USE_TLS: bool = True

    @property
    def is_production(self) -> bool:
        # Normalizado — algumas plataformas de deploy gravam "Production"
        # em vez de "production", e uma comparação exata deixaria passar
        # segredos padrão e endpoints de debug expostos em produção sem
        # nenhum aviso.
        return self.ENVIRONMENT.strip().lower() == "production"


_INSECURE_PRODUCTION_DEFAULTS = {
    "JWT_SECRET_KEY": "change-me-in-env",
    # A chave Fernet default em código (não a string-placeholder do
    # .env.example) — se ninguém sobrescrever FIELD_ENCRYPTION_KEY, os dados
    # "criptografados" no banco ficam protegidos por um segredo público,
    # visível em qualquer clone deste repositório.
    "FIELD_ENCRYPTION_KEY": "8ZqPh_XEYxTGPPhmM760_HQi7KpkJk4MEpaO2AoZ6jI=",
}


@lru_cache
def get_settings() -> Settings:
    loaded = Settings()
    if loaded.is_production:
        insecure = [
            name
            for name, default in _INSECURE_PRODUCTION_DEFAULTS.items()
            if getattr(loaded, name) == default
        ]
        if insecure:
            raise RuntimeError(
                "Variáveis de ambiente ainda no valor padrão de desenvolvimento em "
                f"produção: {', '.join(insecure)}. Defina valores próprios (nunca "
                "reaproveite os defaults deste código) antes de subir o serviço."
            )
    return loaded


settings = get_settings()
