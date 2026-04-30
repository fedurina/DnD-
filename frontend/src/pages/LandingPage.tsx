import { Suspense } from "react";
import { Link, Navigate } from "react-router-dom";
import { ShaderGradient, ShaderGradientCanvas } from "@shadergradient/react";
import { BookIcon, SwordIcon, UsersIcon } from "@/components/icons";
import { useAuthStore } from "@/store/auth";

export default function LandingPage() {
  const status = useAuthStore((s) => s.status);

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden>
        <Suspense fallback={null}>
          <ShaderGradientCanvas
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
            }}
          >
            <ShaderGradient
              animate="on"
              axesHelper="off"
              brightness={1.2}
              cAzimuthAngle={180}
              cDistance={3.6}
              cPolarAngle={90}
              cameraZoom={1}
              color1="#553c1b"
              color2="#dbba95"
              color3="#e1bfb9"
              destination="onCanvas"
              embedMode="off"
              envPreset="city"
              format="gif"
              fov={45}
              frameRate={10}
              gizmoHelper="hide"
              grain="on"
              lightType="3d"
              pixelDensity={0.9}
              positionX={-1.4}
              positionY={0}
              positionZ={0}
              range="disabled"
              rangeEnd={40}
              rangeStart={0}
              reflection={0.1}
              rotationX={0}
              rotationY={10}
              rotationZ={50}
              shader="defaults"
              type="waterPlane"
              uAmplitude={1}
              uDensity={2.3}
              uFrequency={5.5}
              uSpeed={0.2}
              uStrength={2.2}
              uTime={0}
              wireframe={false}
            />
          </ShaderGradientCanvas>
        </Suspense>
      </div>

      <header className="landing-topbar">
        <div className="landing-topbar-inner">
          <div className="auth-brand">
            <span className="auth-brand-mark">D</span>
            <span>D&D Manager</span>
          </div>
          <nav className="row">
            <Link to="/login" className="btn btn-secondary">Войти</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </nav>
        </div>
      </header>

      <div className="landing-content">
        <section className="landing-hero">
          <div className="landing-hero-card">
            <span className="badge">D&D 5.5e (2024)</span>
            <h1>Создавайте героев и ведите кампании в одном месте</h1>
            <p>
              Веб-приложение для пошаговой генерации персонажей по правилам Dungeons &amp; Dragons
              2024 и совместной работы мастера с игроками. Все ограничения системы проверяются
              автоматически — вам остаётся только выбирать.
            </p>
            <div className="row" style={{ marginTop: 24, flexWrap: "wrap" }}>
              <Link to="/register" className="btn btn-primary">Создать аккаунт</Link>
              <Link to="/login" className="btn btn-secondary">У меня уже есть</Link>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <Feature
            icon={<SwordIcon size={20} />}
            title="Генерация персонажей"
            hint="Пошаговый визард: раса, класс, предыстория, характеристики и навыки — всё с автопроверкой правил."
          />
          <Feature
            icon={<UsersIcon size={20} />}
            title="Кампании"
            hint="Мастер задаёт ограничения по расам, классам и уровню. Игроки вступают по коду приглашения."
          />
          <Feature
            icon={<BookIcon size={20} />}
            title="Справочник"
            hint="Расы, классы и предыстории на русском — для быстрой подсказки во время игры."
          />
        </section>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <article className="landing-feature">
      <div className="landing-feature-icon">{icon}</div>
      <div className="landing-feature-title">{title}</div>
      <div className="landing-feature-hint">{hint}</div>
    </article>
  );
}
