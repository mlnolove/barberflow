class DomainError(Exception):
    """Erro de regra de negócio com mensagem segura para exibir ao usuário."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class InvalidCredentialsError(DomainError):
    def __init__(self):
        super().__init__("E-mail ou senha inválidos.")


class EmailAlreadyExistsError(DomainError):
    def __init__(self):
        super().__init__("Este e-mail já está em uso.")


class InvalidOrExpiredTokenError(DomainError):
    def __init__(self):
        super().__init__("Sessão inválida ou expirada. Faça login novamente.")


class PermissionDeniedError(DomainError):
    def __init__(self):
        super().__init__("Você não tem permissão para realizar esta ação.")


class NotFoundError(DomainError):
    def __init__(self, message: str = "Registro não encontrado."):
        super().__init__(message)


class ConflictError(DomainError):
    def __init__(self, message: str):
        super().__init__(message)


class SubscriptionRequiredError(DomainError):
    def __init__(self):
        super().__init__(
            "A assinatura desta barbearia está inativa ou expirada. "
            "Regularize o pagamento em Configurações para continuar."
        )


class InvalidPlanError(DomainError):
    def __init__(self):
        super().__init__("Selecione um plano válido (mensal ou anual) para criar a barbearia.")
