"""Broadcast em tempo real para conversas (seção 10 da especificação:
"preparar a arquitetura para mensagens em tempo real, se a tecnologia
utilizada suportar isso"). FastAPI/Starlette suportam WebSocket nativamente,
então cada mensagem nova é transmitida às conexões abertas para a mesma
conversa — sem precisar de polling.

Limitação conhecida (mesma do rate limiter em `core/rate_limit.py`): o
registro de conexões é em memória, por processo. Funciona para o deploy
atual (uma instância no Railway); se a API escalar horizontalmente, isso
precisa migrar para um backend compartilhado (ex.: Redis pub/sub) para que
uma mensagem entregue por uma instância chegue às conexões abertas em
outra.
"""

import asyncio
import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConversationBroadcaster:
    def __init__(self):
        self._connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, conversation_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[conversation_id].add(websocket)

    async def disconnect(self, conversation_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections[conversation_id].discard(websocket)
            if not self._connections[conversation_id]:
                self._connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: uuid.UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(conversation_id, ()))
        for socket in sockets:
            try:
                await socket.send_json(payload)
            except Exception:
                await self.disconnect(conversation_id, socket)


broadcaster = ConversationBroadcaster()
