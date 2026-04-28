import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import {
  BookIcon,
  ChevronRightIcon,
  SwordIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";

const CARDS = [
  { to: "/characters", title: "Персонажи", hint: "Список ваших героев", icon: SwordIcon },
  { to: "/campaigns", title: "Кампании", hint: "Игры, в которых участвуете", icon: UsersIcon },
  { to: "/references", title: "Справочник", hint: "Расы, классы, предыстории", icon: BookIcon },
  { to: "/profile", title: "Профиль", hint: "Email, имя, пароль", icon: UserIcon },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Привет, {user.username}</h1>
          <p>Это ваш кабинет — отсюда вы попадёте во все разделы.</p>
        </div>
      </header>

      <div className="grid-cards">
        {CARDS.map(({ to, title, hint, icon: Icon }) => (
          <Link key={to} to={to} className="card" style={{ display: "block" }}>
            <div className="row-between">
              <div className="row">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--surface-2)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div className="card-title">{title}</div>
                  <div className="card-subtitle">{hint}</div>
                </div>
              </div>
              <span className="muted" style={{ display: "grid", placeItems: "center" }}>
                <ChevronRightIcon size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
