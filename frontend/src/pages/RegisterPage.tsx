import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { ApiError } from "@/api/client";
import type { UserRole } from "@/types/auth";

export default function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ email, username, password, role });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка регистрации");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <h1 style={{ marginTop: 16 }}>Регистрация</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Создайте аккаунт игрока или мастера.
      </p>

      <form className="form" onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="username">Имя пользователя</label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="например, alice"
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9_-]+"
            autoComplete="username"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">Пароль</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="минимум 8 символов"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="role">Роль</label>
          <select
            id="role"
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="player">Игрок</option>
            <option value="master">Мастер</option>
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Создаём…" : "Создать аккаунт"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: 20, fontSize: 13.5 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </>
  );
}
