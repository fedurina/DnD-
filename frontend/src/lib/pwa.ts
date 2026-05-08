import { useEffect, useState } from "react";

/**
 * Перехватывает отложенное событие `beforeinstallprompt` в браузерах на Chromium
 * и предоставляет функцию для вызова нативного диалога установки.
 *
 * Возвращает null, когда диалог недоступен — например, потому что:
 * - приложение уже установлено (запущено в standalone-режиме),
 * - браузер не поддерживает установку PWA (Firefox, iOS Safari),
 * - критерии установки ещё не выполнены.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const installed = () => setEvent(null);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const promptInstall = async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  };

  return { canInstall: event !== null, promptInstall };
}
