import { type ReactNode } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Hash,
  User,
  Sun,
  GraduationCap,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowLeft,
} from "lucide-react";
import officialLogo from "@/assets/cbtis61-official.png";
import { BrandLogo } from "@/components/BrandLogo";
import type { Role } from "@/services/authService";
import type { TallerOption } from "@/routes/auth";
import type { AuthFormState } from "@/routes/-AuthForm";

export type { AuthFormState };

export interface LoginSiteProps {
  authMode: "login" | "register";
  setAuthMode: (mode: "login" | "register") => void;
  role: Role;
  onBack: () => void;
  loading: boolean;
  form: AuthFormState;
  setField: (field: keyof AuthFormState, value: string | boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  talleres: TallerOption[];
  loadingTalleres: boolean;
}

export default function LoginSite({
  authMode,
  setAuthMode,
  role,
  onBack,
  loading,
  form,
  setField,
  handleSubmit,
  talleres,
  loadingTalleres,
}: LoginSiteProps) {
  const isRegister = authMode === "register";
  const canRegister = role === "student";

  return (
    <div className="auth-page relative flex min-h-screen w-full flex-col overflow-hidden font-sans text-white">
      <BackgroundAmbience />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-start px-4 py-7 sm:px-6 lg:py-10">
        <div className="flex w-full flex-col items-center">
          <BrandHeader />

          <ModePill
            mode={authMode}
            canRegister={canRegister}
            onChange={setAuthMode}
          />

          <RolePill role={role} onBack={onBack} />
        </div>

        <div className="relative mt-5 w-full max-w-5xl">
          <div className="relative grid overflow-hidden rounded-[24px] border border-[#d47b91]/20 bg-[#4b1027]/72 shadow-[0_22px_60px_-28px_rgba(0,0,0,0.75)] backdrop-blur-md md:grid-cols-2">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/[0.08]" />

            {/* Form column */}
            <div
              className={`relative flex flex-col justify-center bg-gradient-to-br from-[#52132b]/40 via-[#3f0c22]/25 to-[#290817]/20 px-7 py-9 sm:px-12 sm:py-12 ${
                isRegister ? "md:order-2" : "md:order-1"
              }`}
            >
              <div key={authMode} className="form-fade-in">
                {isRegister ? (
                  <RegisterForm
                    form={form}
                    setField={setField}
                    handleSubmit={handleSubmit}
                    loading={loading}
                  />
                ) : (
                  <LoginForm
                    form={form}
                    setField={setField}
                    handleSubmit={handleSubmit}
                    role={role}
                    loading={loading}
                    talleres={talleres}
                    loadingTalleres={loadingTalleres}
                  />
                )}
              </div>
            </div>

            {/* Eagle column */}
            <div
              className={`relative m-2 hidden min-h-[500px] overflow-hidden rounded-[20px] border border-white/[0.07] md:block ${
                isRegister ? "md:order-1" : "md:order-2"
              }`}
            >
              <EaglePanel mode={authMode} role={role} />
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <style>{`
        @keyframes formFadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .form-fade-in { animation: formFadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); }
        @keyframes authWaveDrift {
          0%, 100% { transform: rotate(34deg) translate3d(0, 0, 0) scale(1); }
          50% { transform: rotate(36deg) translate3d(2%, -1%, 0) scale(1.03); }
        }
        .auth-wave-one { animation: authWaveDrift 16s ease-in-out infinite; }
        @keyframes authWaveDriftReverse {
          0%, 100% { transform: rotate(-29deg) translate3d(0, 0, 0); }
          50% { transform: rotate(-27deg) translate3d(-2%, 1%, 0); }
        }
        .auth-wave-two { animation: authWaveDriftReverse 20s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ---------- Brand & Pills ---------- */

function BrandHeader() {
  return (
    <BrandLogo mode="dark" className="mb-6" markClassName="h-11 w-11 rounded-2xl" />
  );
}

function ModePill({
  mode,
  canRegister,
  onChange,
}: {
  mode: "login" | "register";
  canRegister: boolean;
  onChange: (m: "login" | "register") => void;
}) {
  return (
    <div
      role="tablist"
      className="relative mb-3 inline-flex rounded-full border border-[#d47b91]/20 bg-[#5b1632]/45 p-1 shadow-[0_6px_18px_rgba(0,0,0,0.16)] backdrop-blur-md"
    >
      <div
        className="absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-[#8B1A32] to-[#B8354D] shadow-md shadow-[#8B1A32]/40 transition-all duration-500 ease-out"
        style={
          canRegister
            ? {
                left: mode === "login" ? "4px" : "50%",
                right: mode === "login" ? "50%" : "4px",
              }
            : { left: "4px", right: "4px" }
        }
        aria-hidden
      />
      <ModeTab
        active={mode === "login"}
        onClick={() => onChange("login")}
        label="Iniciar sesión"
      />
      {canRegister && (
        <ModeTab
          active={mode === "register"}
          onClick={() => onChange("register")}
          label="Registrarse"
        />
      )}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
        className={`relative z-10 rounded-full px-6 py-2 text-[13px] font-semibold transition-colors duration-300 ${
        active ? "text-white" : "text-white/50 hover:text-white/80"
      }`}
    >
      {label}
    </button>
  );
}

function RolePill({ role, onBack }: { role: Role; onBack: () => void }) {
  const config = {
    student: { label: "Alumno", icon: GraduationCap },
    instructor: { label: "Instructor", icon: UserCheck },
    admin: { label: "Administrador", icon: ShieldCheck },
  }[role];

  const Icon = config.icon;

  return (
    <div className="mb-5 flex w-full max-w-md items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver a selección de rol"
        className="group flex items-center gap-2 rounded-full border border-[#d47b91]/20 bg-[#5b1632]/35 px-3 py-1.5 text-[11px] font-semibold text-white/70 backdrop-blur-md transition hover:bg-[#741c3d]/60 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Cambiar rol
      </button>
      <div className="flex items-center gap-2 rounded-full border border-[#d47b91]/20 bg-[#5b1632]/35 px-3 py-1.5 backdrop-blur-md">
        <Icon className="h-3.5 w-3.5 text-[#f4d78e]" strokeWidth={2.4} />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          {config.label}
        </span>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <p className="mt-6 text-center text-[11px] font-medium text-white/35">
      © {new Date().getFullYear()} Sistema Integral de Talleres Escolares — CBTis
      No. 61
    </p>
  );
}

/* ---------- Background ---------- */

function BackgroundAmbience() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#350019]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#420020_0%,#260013_55%,#350019_100%)]" />
      <div className="auth-wave auth-wave-one absolute -left-[20%] -top-[30%] h-[150%] w-[78%] rotate-[34deg] rounded-[42%] bg-[#6c0030]/25" />
      <div className="auth-wave auth-wave-two absolute -right-[24%] -top-[20%] h-[145%] w-[72%] rotate-[-29deg] rounded-[45%] border border-[#91033e]/18 bg-[#4c0025]/20" />
    </div>
  );
}

/* ---------- Forms ---------- */

function LoginForm({
  form,
  setField,
  handleSubmit,
  role,
  loading,
  talleres,
  loadingTalleres,
}: {
  form: AuthFormState;
  setField: (field: keyof AuthFormState, value: string | boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  role: Role;
  loading: boolean;
  talleres: TallerOption[];
  loadingTalleres: boolean;
}) {
  return (
    <>
      <h1 className="text-[30px] font-black leading-[1.1] tracking-tight text-white">
        Bienvenido de
        <br />
        <span className="bg-gradient-to-r from-[#f4d78e] to-[#B8354D] bg-clip-text text-transparent">
          vuelta
        </span>
      </h1>
      <p className="mt-2 text-sm font-medium text-white/50">
        Ingresa tus datos para continuar con tus talleres.
      </p>

      <form
        className="mt-7 space-y-3.5"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <Field
          label={role === "admin" ? "Correo" : "Correo o matrícula"}
          icon={<Mail className="h-4 w-4" />}
          type={role === "admin" ? "email" : "text"}
          value={form.email}
          onChange={(v) => setField("email", v)}
          placeholder={
            role === "admin"
              ? "admin@cbtis61.edu.mx"
              : "correo o matrícula"
          }
          required
        />

        {role !== "admin" && (
          <Field
            label="Matrícula"
            icon={<Hash className="h-4 w-4" />}
            type="text"
            value={form.matricula}
            onChange={(v) => setField("matricula", v)}
            placeholder="Número de control"
            required
          />
        )}

        {role === "instructor" && (
          <TallerSelect
            value={form.tallerId}
            onChange={(v) => setField("tallerId", v)}
            talleres={talleres}
            loading={loadingTalleres}
            required
          />
        )}

        <Field
          label="Contraseña"
          icon={<Lock className="h-4 w-4" />}
          type={form.showPassword ? "text" : "password"}
          value={form.password}
          onChange={(v) => setField("password", v)}
          placeholder="Al menos 6 caracteres"
          required
          minLength={6}
          rightSlot={
            <button
              type="button"
              onClick={() => setField("showPassword", !form.showPassword)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.08] hover:text-[#f4d78e]"
              aria-label={
                form.showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
              }
            >
              {form.showPassword ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          }
        />

        <SubmitButton loading={loading}>Iniciar sesión</SubmitButton>
      </form>
    </>
  );
}

function RegisterForm({
  form,
  setField,
  handleSubmit,
  loading,
}: {
  form: AuthFormState;
  setField: (field: keyof AuthFormState, value: string | boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <>
      <h1 className="text-[30px] font-black leading-[1.1] tracking-tight text-white">
        Crea tu
        <br />
        <span className="bg-gradient-to-r from-[#f4d78e] to-[#B8354D] bg-clip-text text-transparent">
          cuenta
        </span>
      </h1>
      <p className="mt-2 text-sm font-medium text-white/50">
        Únete a los talleres del CBTis No. 61 en menos de un minuto.
      </p>

      <form
        className="mt-6 space-y-3.5"
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <Field
          label="Nombre completo"
          icon={<User className="h-4 w-4" />}
          type="text"
          value={form.nombre}
          onChange={(v) => setField("nombre", v)}
          placeholder="Juan Pérez"
          required
          minLength={3}
        />

        <TurnoSelect
          value={form.turno}
          onChange={(v) => setField("turno", v)}
        />

        <Field
          label="Correo institucional"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={form.email}
          onChange={(v) => setField("email", v)}
          placeholder="nombre@cbtis61.edu.mx"
          required
        />

        <Field
          label="Matrícula"
          icon={<Hash className="h-4 w-4" />}
          type="text"
          value={form.matricula}
          onChange={(v) => setField("matricula", v)}
          placeholder="Número de control"
          required
        />

        <Field
          label="Contraseña"
          icon={<Lock className="h-4 w-4" />}
          type={form.showPassword ? "text" : "password"}
          value={form.password}
          onChange={(v) => setField("password", v)}
          placeholder="Mínimo 6 caracteres"
          required
          minLength={6}
          rightSlot={
            <button
              type="button"
              onClick={() => setField("showPassword", !form.showPassword)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.08] hover:text-[#f4d78e]"
              aria-label="Mostrar u ocultar contraseña"
            >
              {form.showPassword ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          }
        />

        <SubmitButton loading={loading}>Crear cuenta</SubmitButton>

        <p className="pt-1 text-center text-xs text-white/40">
          Al crear tu cuenta aceptas los términos del CBTis No. 61.
        </p>
      </form>
    </>
  );
}

/* ---------- Form Primitives ---------- */

function Field({
  label,
  icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  minLength,
  rightSlot,
}: {
  label: string;
  icon: ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  rightSlot?: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/65">
        {label}
      </label>
      <div className="group relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-[#f4d78e]">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="w-full rounded-xl border border-[#d47b91]/18 bg-[#260716]/35 py-3 pl-10 pr-12 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-[#f4d78e]/55 focus:bg-[#3c0d20]/55 focus:ring-2 focus:ring-[#f4d78e]/12 backdrop-blur-sm"
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

function TurnoSelect({
  value,
  onChange,
}: {
  value: "matutino" | "vespertino";
  onChange: (v: "matutino" | "vespertino") => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/65">
        Turno
      </label>
      <div className="grid grid-cols-2 gap-2">
        <TurnoOption
          active={value === "matutino"}
          value="matutino"
          onClick={() => onChange("matutino")}
          label="Matutino"
          icon={<Sun className="h-3.5 w-3.5" />}
        />
        <TurnoOption
          active={value === "vespertino"}
          value="vespertino"
          onClick={() => onChange("vespertino")}
          label="Vespertino"
          icon={<Sun className="h-3.5 w-3.5 rotate-180" />}
        />
      </div>
    </div>
  );
}

function TurnoOption({
  active,
  value,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  value: "matutino" | "vespertino";
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition backdrop-blur-sm ${
        active
          ? "border-[#8B1A32]/60 bg-gradient-to-br from-[#8B1A32] to-[#B8354D] text-white shadow-md shadow-[#8B1A32]/30"
          : "border-[#d47b91]/18 bg-[#260716]/35 text-white/60 hover:bg-[#3c0d20]/55 hover:text-white"
      }`}
    >
      {icon}
      {label}
      <input
        type="radio"
        name="turno"
        value={value}
        checked={active}
        readOnly
        className="sr-only"
      />
    </button>
  );
}

function TallerSelect({
  value,
  onChange,
  talleres,
  loading,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  talleres: TallerOption[];
  loading: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-white/65">
        Taller asignado
      </label>
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#d47b91]/18 bg-[#260716]/35 px-4 py-3 text-sm text-white/50 backdrop-blur-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#f4d78e]" />
          Cargando talleres...
        </div>
      ) : (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="w-full appearance-none rounded-xl border border-[#d47b91]/18 bg-[#260716]/35 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-[#f4d78e]/55 focus:bg-[#3c0d20]/55 focus:ring-2 focus:ring-[#f4d78e]/12 backdrop-blur-sm"
          >
            <option value="" className="bg-[#0C0810]">
              Seleccionar taller
            </option>
            {talleres.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0C0810]">
                {t.nombre} — {t.categoria}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative mt-1 w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#6b1530] via-[#8a1f42] to-[#6b1530] py-3 text-sm font-bold text-white shadow-lg shadow-[#6b1530]/30 transition hover:shadow-xl hover:shadow-[#6b1530]/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg"
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
        {!loading && (
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        )}
      </span>
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </button>
  );
}

/* ---------- Eagle Panel ---------- */

function EaglePanel({
  mode,
  role,
}: {
  mode: "login" | "register";
  role: Role;
}) {
  const textByMode = {
    login: {
      badge: "Sistema académico",
      title: "Tu camino, tus talleres.",
      sub: "Culturales, cívicos y deportivos en un solo lugar.",
    },
    register: {
      badge: "Comunidad SITE",
      title: "Conecta con tu red.",
      sub: "Forma parte de más de 20 talleres activos.",
    },
  }[mode];

  const roleTag = {
    student: "Estudiante",
    instructor: "Docente",
    admin: "Administración",
  }[role];

  return (
    <div className="relative h-full min-h-[560px] w-full overflow-hidden rounded-[24px]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #6b1530 0%, #3a0d1e 60%, #1a0409 100%)",
        }}
      />
      <Stars />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(244,215,142,0.18) 0%, transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, #f4d78e 0%, transparent 70%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <EagleLogo />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f4d78e]" />
          {textByMode.badge} · {roleTag}
        </div>
        <h2 className="text-2xl font-black leading-tight tracking-tight">
          {textByMode.title}
        </h2>
        <p className="mt-1.5 text-sm font-medium text-white/80">
          {textByMode.sub}
        </p>
      </div>
    </div>
  );
}

function Stars() {
  const stars = [
    [40, 60, 1.5],
    [120, 40, 1],
    [200, 90, 2],
    [320, 50, 1.2],
    [380, 110, 1.5],
    [60, 150, 1],
    [260, 30, 1.8],
    [410, 180, 1.2],
    [150, 20, 1.5],
    [350, 210, 1],
    [80, 200, 1.3],
    [300, 160, 1.5],
    [220, 130, 1],
    [170, 80, 1.2],
    [380, 280, 1.5],
    [30, 280, 1],
    [100, 320, 1.3],
    [420, 380, 1.2],
    [240, 50, 1.5],
  ] as const;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 460 600"
      preserveAspectRatio="xMidYMid slice"
    >
      {stars.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill="#f4d78e" opacity={0.85} />
          <circle
            cx={x}
            cy={y}
            r={r * 2.5}
            fill="#f4d78e"
            opacity={0.15}
            filter="url(#starGlow)"
          />
        </g>
      ))}
      <defs>
        <filter id="starGlow">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
    </svg>
  );
}

/* ---------- Eagle animation ---------- */

function OrbitalAnimation() {
  return (
    <div className="relative h-[88%] w-[88%]">
      <style>{`
        @keyframes orbitRing1 {
          0% { transform: rotateX(75deg) rotateZ(0deg); }
          100% { transform: rotateX(75deg) rotateZ(360deg); }
        }
        @keyframes orbitRing2 {
          0% { transform: rotateX(70deg) rotateZ(360deg); }
          100% { transform: rotateX(70deg) rotateZ(0deg); }
        }
        @keyframes orbitRing3 {
          0% { transform: rotateX(80deg) rotateZ(0deg); }
          100% { transform: rotateX(80deg) rotateZ(-360deg); }
        }
        .ring-1 { animation: orbitRing1 24s linear infinite; }
        .ring-2 { animation: orbitRing2 18s linear infinite; }
        .ring-3 { animation: orbitRing3 14s linear infinite; }

        @keyframes corePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.12); opacity: 0.85; }
        }
        .core-pulse { animation: corePulse 3s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

        @keyframes coreGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.25); }
        }
        .core-glow { animation: coreGlow 4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }

        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-260px) translateX(var(--drift, 20px)); opacity: 0; }
        }
        .particle { animation: particleFloat var(--dur, 8s) ease-in-out infinite; animation-delay: var(--delay, 0s); }

        @keyframes dashFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -200; }
        }
        .ring-dash { stroke-dasharray: 4 6; animation: dashFlow 12s linear infinite; }
      `}</style>

      <svg viewBox="0 0 400 400" className="h-full w-full" style={{ perspective: "1000px" }}>
        <defs>
          <linearGradient id="ringGrad1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4d78e" stopOpacity="0" />
            <stop offset="20%" stopColor="#f4d78e" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#B8354D" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#f4d78e" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f4d78e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ringGrad2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B8354D" stopOpacity="0" />
            <stop offset="50%" stopColor="#8B1A32" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#B8354D" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="ringGrad3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4d78e" stopOpacity="0" />
            <stop offset="50%" stopColor="#f4d78e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f4d78e" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="coreGrad" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="#fff5d0" />
            <stop offset="35%" stopColor="#f4d78e" />
            <stop offset="75%" stopColor="#B8354D" />
            <stop offset="100%" stopColor="#3a0d1e" />
          </radialGradient>
          <radialGradient id="coreGlowGrad" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#f4d78e" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#B8354D" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#B8354D" stopOpacity="0" />
          </radialGradient>
          <filter id="nodeGlow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ambient glow */}
        <ellipse
          cx="200"
          cy="200"
          rx="180"
          ry="120"
          fill="url(#coreGlowGrad)"
          className="core-glow"
        />

        {/* Ring 1 - largest, slow */}
        <g className="ring-1" style={{ transformOrigin: "200px 200px" }}>
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="60"
            fill="none"
            stroke="url(#ringGrad1)"
            strokeWidth="1.2"
            className="ring-dash"
          />
          <circle cx="370" cy="200" r="5" fill="#f4d78e" filter="url(#nodeGlow)" />
          <circle cx="30" cy="200" r="4" fill="#B8354D" filter="url(#nodeGlow)" />
          <circle cx="200" cy="140" r="3" fill="#f4d78e" opacity="0.8" />
          <circle cx="200" cy="260" r="3" fill="#f4d78e" opacity="0.8" />
        </g>

        {/* Ring 2 - medium, opposite direction */}
        <g className="ring-2" style={{ transformOrigin: "200px 200px" }}>
          <ellipse
            cx="200"
            cy="200"
            rx="130"
            ry="48"
            fill="none"
            stroke="url(#ringGrad2)"
            strokeWidth="1.2"
          />
          <circle cx="330" cy="200" r="4" fill="#8B1A32" filter="url(#nodeGlow)" />
          <circle cx="70" cy="200" r="3.5" fill="#f4d78e" filter="url(#nodeGlow)" />
          <circle cx="200" cy="152" r="3" fill="#B8354D" opacity="0.8" />
          <circle cx="200" cy="248" r="3" fill="#B8354D" opacity="0.8" />
        </g>

        {/* Ring 3 - innermost, fastest */}
        <g className="ring-3" style={{ transformOrigin: "200px 200px" }}>
          <ellipse
            cx="200"
            cy="200"
            rx="90"
            ry="34"
            fill="none"
            stroke="url(#ringGrad3)"
            strokeWidth="1"
            className="ring-dash"
          />
          <circle cx="290" cy="200" r="3" fill="#f4d78e" filter="url(#nodeGlow)" />
          <circle cx="110" cy="200" r="2.5" fill="#f4d78e" opacity="0.7" />
        </g>

        {/* Central core */}
        <g className="core-pulse" style={{ transformOrigin: "200px 200px" }}>
          <circle cx="200" cy="200" r="28" fill="url(#coreGrad)" />
          <circle
            cx="200"
            cy="200"
            r="28"
            fill="none"
            stroke="#f4d78e"
            strokeWidth="0.5"
            opacity="0.6"
          />
          <circle cx="192" cy="192" r="6" fill="#fff5d0" opacity="0.5" />
        </g>

        {/* Static spec on core */}
        <circle cx="200" cy="200" r="2" fill="#fff" />
      </svg>

      {/* Floating particles rising */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { left: "20%", delay: "0s", dur: "9s", drift: "15px" },
          { left: "35%", delay: "2s", dur: "11s", drift: "-20px" },
          { left: "50%", delay: "1s", dur: "8s", drift: "10px" },
          { left: "65%", delay: "3s", dur: "10s", drift: "-15px" },
          { left: "80%", delay: "0.5s", dur: "12s", drift: "20px" },
          { left: "28%", delay: "4s", dur: "9s", drift: "-10px" },
          { left: "72%", delay: "1.5s", dur: "11s", drift: "15px" },
          { left: "45%", delay: "2.5s", dur: "10s", drift: "-20px" },
        ].map((p, i) => (
          <span
            key={i}
            className="particle absolute bottom-0 h-1 w-1 rounded-full bg-[#f4d78e]"
            style={
              {
                left: p.left,
                "--delay": p.delay,
                "--dur": p.dur,
                "--drift": p.drift,
                boxShadow: "0 0 8px #f4d78e",
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}

void OrbitalAnimation;

function EagleLogo() {
  return (
    <div className="relative flex h-[76%] w-[86%] items-center justify-center pb-20">
      <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,215,142,0.24)_0%,rgba(184,53,77,0.16)_42%,transparent_72%)] blur-2xl" />
      <div className="relative flex h-full w-full items-center justify-center">
        <img
          alt="Logotipo oficial CBTIS 61"
          className="relative z-10 h-auto w-[72%] max-w-[330px] rounded-[28px] bg-white p-3 object-contain drop-shadow-[0_22px_22px_rgba(20,0,10,0.38)]"
          src={officialLogo}
        />
      </div>
    </div>
  );
}
