import { FormEvent, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { ApiError } from "@/api/client";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);

  if (!user) return null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Профиль</h1>
          <p>
            Роль: <span className="badge">{user.role === "master" ? "Мастер" : "Игрок"}</span>
          </p>
        </div>
      </header>

      <div className="stack" style={{ maxWidth: 560 }}>
        <ProfileForm user={user} onSubmit={updateProfile} />
        <PasswordForm onSubmit={changePassword} />
      </div>
    </>
  );
}

interface ProfileFormProps {
  user: { email: string; username: string };
  onSubmit: (payload: { email?: string; username?: string }) => Promise<unknown>;
}

function ProfileForm({ user, onSubmit }: ProfileFormProps) {
  const [email, setEmail] = useState(user.email);
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dirty = email !== user.email || username !== user.username;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const payload: { email?: string; username?: string } = {};
      if (email !== user.email) payload.email = email;
      if (username !== user.username) payload.username = username;
      await onSubmit(payload);
      setMessage("Сохранено");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <header style={{ marginBottom: 16 }}>
        <h2 className="card-title">Основное</h2>
        <p className="card-subtitle">Email и отображаемое имя.</p>
      </header>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="prof-email">Email</label>
          <input
            id="prof-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="prof-username">Имя пользователя</label>
          <input
            id="prof-username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={64}
            pattern="[a-zA-Z0-9_-]+"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <div className="row">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!dirty || submitting}
          >
            {submitting ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </form>
    </section>
  );
}

interface PasswordFormProps {
  onSubmit: (payload: { current_password: string; new_password: string }) => Promise<void>;
}

function PasswordForm({ onSubmit }: PasswordFormProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (next !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ current_password: current, new_password: next });
      setMessage("Пароль обновлён");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <header style={{ marginBottom: 16 }}>
        <h2 className="card-title">Смена пароля</h2>
        <p className="card-subtitle">Введите текущий пароль и новый.</p>
      </header>

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="pw-cur">Текущий пароль</label>
          <input
            id="pw-cur"
            className="input"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw-new">Новый пароль</label>
          <input
            id="pw-new"
            className="input"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw-confirm">Повторите новый пароль</label>
          <input
            id="pw-confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Сохраняем…" : "Сменить пароль"}
          </button>
        </div>
      </form>
    </section>
  );
}
