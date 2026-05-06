import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-mark">D</span>
          <span>D&D Manager</span>
        </div>

        <h1 style={{ marginTop: 16 }}>Страница не найдена</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Похоже, по этому адресу ничего нет. Возможно, вы перешли по
          устаревшей ссылке или ошиблись в URL.
        </p>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => navigate(-1)}
        >
          Вернуться назад
        </button>

        <p className="muted" style={{ marginTop: 20, fontSize: 13.5 }}>
          Или <Link to="/">на главную</Link>
        </p>
      </div>
    </div>
  );
}
