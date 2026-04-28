import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import {
  BookIcon,
  ChevronRightIcon,
  HomeIcon,
  LogoutIcon,
  SwordIcon,
  UserIcon,
  UsersIcon,
} from "./icons";

const NAV = [
  { to: "/", label: "Кабинет", icon: HomeIcon, end: true },
  { to: "/characters", label: "Персонажи", icon: SwordIcon },
  { to: "/campaigns", label: "Кампании", icon: UsersIcon },
  { to: "/references", label: "Справочник", icon: BookIcon },
  { to: "/profile", label: "Профиль", icon: UserIcon },
];

const STORAGE_KEY = "sidebar-collapsed";

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [collapsed]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user ? user.username.slice(0, 2).toUpperCase() : "?";

  return (
    <div className={`app-shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`sidebar${collapsed ? " is-collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark">D</span>
            <span className="sidebar-brand-text">D&D Manager</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Развернуть" : "Свернуть"}
            aria-label={collapsed ? "Развернуть боковую панель" : "Свернуть боковую панель"}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>

        <div>
          <div className="sidebar-section-label">Навигация</div>
          <nav className="sidebar-nav">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " is-active" : ""}`
                }
              >
                <Icon />
                <span className="sidebar-link-label">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {user && (
          <div className="sidebar-footer">
            <div className="avatar" title={collapsed ? user.username : undefined}>
              {initials}
            </div>
            <div className="sidebar-user">
              <div className="sidebar-user-name">{user.username}</div>
              <div className="sidebar-user-role">
                {user.role === "master" ? "Мастер" : "Игрок"}
              </div>
            </div>
            <button
              className="icon-btn"
              onClick={onLogout}
              title="Выйти"
              aria-label="Выйти"
            >
              <LogoutIcon size={16} />
            </button>
          </div>
        )}
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
