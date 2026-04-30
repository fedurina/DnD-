import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/auth";

export default function ProtectedRoute() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading" || status === "idle") {
    return (
      <div className="auth-shell">
        <p className="muted">Загрузка…</p>
      </div>
    );
  }
  if (status !== "authenticated") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
