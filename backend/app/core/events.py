"""In-memory pub/sub для SSE-уведомлений.

Подходит для одного процесса uvicorn (dev). В многопроцессном/много-инстансном
продакшене нужно заменить на Redis Pub/Sub или подобное — сейчас события не
выходят за границы текущего процесса.
"""
import asyncio
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator


class EventBus:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)

    @asynccontextmanager
    async def subscribe(self, topic: str) -> AsyncIterator[asyncio.Queue]:
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers[topic].add(queue)
        try:
            yield queue
        finally:
            self._subscribers[topic].discard(queue)
            if not self._subscribers[topic]:
                self._subscribers.pop(topic, None)

    async def publish(self, topic: str, data: Any) -> None:
        for queue in list(self._subscribers.get(topic, ())):
            queue.put_nowait(data)


bus = EventBus()
