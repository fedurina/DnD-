import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/store/auth";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    // Удаляем остатки токенов от предыдущей версии авторизации (через localStorage).
    try {
      localStorage.removeItem("auth-storage");
    } catch {
      // игнорируем
    }
    bootstrap();
  }, [bootstrap]);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
