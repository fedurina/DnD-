import { useAuthStore } from "@/store/auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface SseEvent {
  event: string;
  data: unknown;
}

/**
 * Подписка на SSE-стрим событий персонажа. Возвращает Promise, который
 * резолвится при штатном закрытии стрима или отменяется через AbortSignal.
 *
 * Используем fetch + ReadableStream вместо нативного EventSource, потому что
 * EventSource не умеет передавать заголовки авторизации, а access-токен у нас
 * в памяти, а не в куке.
 */
export async function streamCharacter(
  id: string,
  onEvent: (e: SseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${API_URL}/api/v1/characters/${id}/events`, {
    headers: token
      ? { Authorization: `Bearer ${token}`, Accept: "text/event-stream" }
      : { Accept: "text/event-stream" },
    credentials: "include",
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`SSE: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // По спецификации SSE события разделены пустой строкой ("\n\n").
  // Внутри события строки `event:`, `data:`, `id:` или `:`-комментарии.
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      if (!chunk || chunk.startsWith(":")) continue; // пустая строка или коммент

      let eventName = "message";
      let dataLines: string[] = [];
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      const dataRaw = dataLines.join("\n");
      if (!dataRaw) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(dataRaw);
      } catch {
        parsed = dataRaw;
      }
      onEvent({ event: eventName, data: parsed });
    }
  }
}
