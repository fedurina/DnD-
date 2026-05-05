import { useEffect, useState } from "react";

/**
 * Captures the deferred `beforeinstallprompt` event on Chromium-based browsers
 * and exposes a function to trigger the native install dialog.
 *
 * Returns null when the prompt is not available — either because:
 * - the app is already installed (running in standalone mode),
 * - the browser doesn't support PWA installation (Firefox, iOS Safari),
 * - the install criteria haven't been met yet.
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
