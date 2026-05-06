import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuthStore } from "@/store/auth";

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    // Drop any leftover tokens from the previous (localStorage-based) auth.
    try {
      localStorage.removeItem("auth-storage");
    } catch {
      // ignore
    }
    bootstrap();
  }, [bootstrap]);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
