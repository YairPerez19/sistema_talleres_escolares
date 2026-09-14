# Documentación de Requerimientos Funcionales — SITE CBTIS No. 61

---

## 4.4.1 RF_01 — Iniciar sesión

> **Descripción:** El sistema permite iniciar sesión con correo y contraseña.
> **Mecanismo:** `usuario_correo`, `usuario_contraseña`, `validacion_credenciales`.
> **Prioridad:** Alta.

### 1. Elaboración de la función

El inicio de sesión se desarrolló con una arquitectura de tres capas:

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | React 19 + TanStack Router | Formulario de acceso, validación visual y redirección por rol |
| Backend | NestJS 11 (`/api/auth/verify-identity`) | Validación de credenciales y control de identidad |
| Base de datos | Supabase Auth + PostgreSQL | Autenticación (`auth.users`), perfil (`profiles`) y rol (`user_roles`) |

**Flujo de elaboración (paso a paso):**

1. **Pantalla de selección de rol** (`frontend/src/routes/-RoleSelectionScreen.tsx`): el usuario elige si es Alumno, Instructor o Administrador. Esto permite al sistema validar después que la cuenta corresponde al rol seleccionado (RF_02).
2. **Formulario de acceso** (`frontend/src/components/LoginSite.tsx`, componente `LoginForm`): captura `usuario_correo` (campo `type="email"` con validación HTML5), `usuario_contraseña` (mínimo 6 caracteres, con botón mostrar/ocultar) y, para alumnos e instructores, la matrícula como factor adicional de verificación.
3. **Envío de credenciales** (`frontend/src/routes/auth.tsx`, función `handleSubmit`): el formulario invoca `verifyIdentity()` del servicio de autenticación (`frontend/src/services/authService.ts`), que hace un `POST` al endpoint `/api/auth/verify-identity` del backend NestJS. El navegador nunca llama directamente a Supabase Auth por seguridad.
4. **Validación de credenciales** (`backend/api/src/auth/auth.service.ts`, método `verifyIdentity`):
   - El backend autentica contra Supabase con `signInWithPassword({ email, password })`.
   - Si las credenciales son incorrectas devuelve `401 Credenciales inválidas`.
   - Si el correo no ha sido confirmado, deriva al flujo OTP (RF_03 a RF_06).
   - Si la contraseña es correcta, el método `validateCredentials` verifica en la base de datos: (a) que el rol guardado en `user_roles` coincida con el rol seleccionado, (b) que exista el perfil en `profiles`, y (c) que la matrícula capturada coincida con la matrícula registrada.
5. **Generación de sesión**: el backend devuelve los tokens de Supabase (`access_token` y `refresh_token`). El frontend instala la sesión con `supabase.auth.setSession()` y guarda el rol en `localStorage` como caché (RF_15).
6. **Redirección por rol** (RF_14): la función `getRedirectPath()` dirige al usuario a su panel: `/admin` (administrador), `/instructor` (instructor) o `/dashboard` (alumno).
7. **Protección de rutas** (`frontend/src/routes/__root.tsx`, componente `AuthGuard`): cualquier ruta privada exige sesión activa; si no la hay, redirige a `/auth`. Cada panel además verifica el rol con el hook `useRole` y muestra "Acceso Denegado" si no corresponde (RF_12).

### 2. Pantalla de código fuente

**Frontend — formulario de inicio de sesión** (`frontend/src/components/LoginSite.tsx:297-366`):

```tsx
<form className="mt-7 space-y-3.5" onSubmit={handleSubmit} autoComplete="off">
  <Field
    label={role === "admin" ? "Correo" : "Correo o matrícula"}
    icon={<Mail className="h-4 w-4" />}
    type="email"
    value={form.email}
    onChange={(v) => setField("email", v)}
    placeholder={role === "admin" ? "admin@cbtis61.edu.mx" : "nombre@cbtis61.edu.mx"}
    required
  />
  {role !== "admin" && (
    <Field label="Matrícula" type="text" value={form.matricula} required />
  )}
  <Field
    label="Contraseña"
    type={form.showPassword ? "text" : "password"}
    value={form.password}
    onChange={(v) => setField("password", v)}
    placeholder="Al menos 6 caracteres"
    required
    minLength={6}
  />
  <SubmitButton loading={loading}>Iniciar sesión</SubmitButton>
</form>
```

**Frontend — envío y manejo de la respuesta** (`frontend/src/routes/auth.tsx:105-126`):

```tsx
const result = await verifyIdentity({
  email: form.email,
  password: form.password,
  role: nav.role,
  ...(nav.role !== 'admin' ? { matricula: form.matricula } : {}),
});

if (!result.needs_otp) {
  await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  localStorage.setItem(`role_${sessionData.session.user.id}`, result.role);
  toast.success(`¡Bienvenido${result.nombre ? ', ' + result.nombre : ''}!`);
  navigate({ to: getRedirectPath(result.role) });
}
```

**Backend — endpoint de verificación** (`backend/api/src/auth/auth.controller.ts:99-114`):

```ts
@Post('verify-identity')
@HttpCode(HttpStatus.OK)
async verifyIdentity(@Body() body: unknown) {
  try {
    const dto = VerifyIdentitySchema.parse(body); // validación Zod
    return await this.authService.verifyIdentity(dto);
  } catch (err) {
    if (err instanceof ZodError) {
      throw new BadRequestException('Datos inválidos.');
    }
    throw err;
  }
}
```

**Backend — lógica de validación de credenciales** (`backend/api/src/auth/auth.service.ts:124-198`):

```ts
async verifyIdentity(dto: VerifyIdentityDto) {
  const { email, password } = dto;

  const { data: authData, error: authError } =
    await this.supabaseAnon.auth.signInWithPassword({ email, password });

  if (authError || !authData.user) {
    if (authError?.message?.toLowerCase().includes('not confirmed')) {
      return await this.handleUnconfirmedLogin(dto); // deriva a OTP (RF_03)
    }
    throw new UnauthorizedException('Credenciales inválidas.');
  }

  const userId = authData.user.id;
  const { nombre } = await this.validateCredentials(userId, dto);

  return {
    verified: true,
    needs_otp: false,
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    role: dto.role,
    nombre,
  };
}

private async validateCredentials(userId: string, dto: VerifyIdentityDto) {
  // 1) El rol seleccionado debe coincidir con user_roles
  const { data: roleData } = await this.supabaseAdmin
    .from('user_roles').select('role').eq('user_id', userId).single();
  if (!roleData || roleData.role !== dto.role) {
    throw new UnauthorizedException('Credenciales inválidas.');
  }
  // 2) Debe existir perfil y la matrícula debe coincidir
  const { data: profile } = await this.supabaseAdmin
    .from('profiles').select('nombre, matricula').eq('id', userId).single();
  if (!profile) throw new UnauthorizedException('Credenciales inválidas.');
  if (dto.role === 'student' || dto.role === 'instructor') {
    if (profile.matricula !== dto.matricula) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }
  }
  return { nombre: profile.nombre };
}
```

> 📷 *Insertar aquí la captura de pantalla del editor mostrando `auth.service.ts` (método `verifyIdentity`).*

### 3. Consulta SQL

Tablas y objetos de base de datos que intervienen en el inicio de sesión (`setup_database.sql` y `backend/supabase/migrations/`):

**Tabla de perfiles** — datos del usuario autenticado:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  matricula text NOT NULL,
  turno text NOT NULL CHECK (turno IN ('matutino', 'vespertino')),
  cambios_restantes int DEFAULT 3,
  inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks'),
  created_at timestamptz DEFAULT now()
);
```

**Tabla de roles** — reconoce el tipo de usuario (RF_02 / RF_11):

```sql
CREATE TYPE app_role AS ENUM ('admin', 'student', 'instructor');

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
```

**Función auxiliar de verificación de rol** (usada por las políticas de seguridad):

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
```

**Consulta que ejecuta el backend al validar las credenciales:**

```sql
-- ¿El rol capturado corresponde al usuario?
SELECT role FROM public.user_roles WHERE user_id = :usuario_id;

-- ¿Existe el perfil y coincide la matrícula?
SELECT nombre, matricula FROM public.profiles WHERE id = :usuario_id;
```

**Políticas RLS que protegen estos datos** (RF_13):

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by owner."
  ON public.profiles FOR SELECT USING (auth.uid() = id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instructor y admin ven roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
```

### 4. Interfaz final

La pantalla de inicio de sesión muestra:

- Selector previo de tipo de usuario (Alumno / Instructor / Administrador).
- Campo **Correo** con validación de formato de email.
- Campo **Matrícula** (solo alumnos e instructores).
- Campo **Contraseña** con botón para mostrar/ocultar.
- Botón **Iniciar sesión** con indicador de carga.
- Mensajes de error ("Credenciales inválidas.") mediante notificaciones `toast`.
- Al autenticarse correctamente, redirección automática al panel correspondiente según el rol: `/admin`, `/instructor` o `/dashboard`.

> 📷 *Insertar aquí la captura de pantalla de la interfaz final de inicio de sesión (ruta `/auth` del sistema en ejecución).*

---

## 4.4.2 RF_02 / RF_11 / RF_12 / RF_14 / RF_15 — Reconocimiento de rol y redirección

> **RF_02:** al iniciar sesión el sistema reconoce si el usuario es alumno, instructor o administrador. **RF_11:** tres roles. **RF_12:** verifica permisos antes de cada acción. **RF_14:** redirige al panel correspondiente. **RF_15:** el rol se guarda en caché local.

### 1. Elaboración

- El rol se modela en base de datos con el ENUM `app_role ('admin','student','instructor')` y la tabla `user_roles` (RF_11).
- Al autenticarse, el backend devuelve el rol y el frontend lo guarda en `localStorage` (`role_<uid>`) como caché (RF_15); el hook `useRole` lo lee primero de ahí y, si no existe, consulta `user_roles`.
- `getRedirectPath()` envía a cada usuario a su panel (RF_14) y los guards (`AuthGuard` en frontend, `RolesGuard` en backend) bloquean acciones no autorizadas (RF_12).

### 2. Código fuente

**Detección de rol** (`frontend/src/hooks/useRole.ts:24-48`):

```ts
const cachedRole = localStorage.getItem(`role_${uid}`);   // 1) caché (RF_15)
if (cachedRole) { setRole(cachedRole as AppRole); return; }
const { data } = await supabase
  .from('user_roles').select('role').eq('user_id', uid).maybeSingle();  // 2) BD
```

**Redirección por rol** (`frontend/src/services/authService.ts:147-153`):

```ts
export function getRedirectPath(role: Role): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'instructor': return '/instructor';
    case 'student': return '/dashboard';
  }
}
```

**Guard de backend** (`backend/api/src/common/roles.guard.ts:55-59`):

```ts
if (!required.includes(user.role)) {
  throw new ForbiddenException(`Rol "${user.role}" no autorizado. Requiere: ${required.join(', ')}.`);
}
```

Uso en endpoints: `@UseGuards(RolesGuard) @Roles('admin')` (`auth.controller.ts:67-68`).

### 3. Consulta SQL

```sql
CREATE TYPE app_role AS ENUM ('admin', 'student', 'instructor');   -- RF_11
CREATE TABLE public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL, PRIMARY KEY (user_id, role)
);
CREATE POLICY "Usuario ve su propio rol"
  ON public.user_roles FOR SELECT USING (auth.uid() = user_id);     -- RF_13
```

### 4. Interfaz final

Cada rol ve su propio panel: `/admin` (estadísticas y gestión), `/instructor` (pase de lista), `/dashboard` (alumno). Si un usuario intenta entrar a un panel que no le corresponde, ve la pantalla "Acceso Denegado" (`frontend/src/routes/admin.lazy.tsx:103-118`).

> 📷 *Capturas: paneles de alumno, instructor y admin (rutas `/dashboard`, `/instructor`, `/admin`).*

---

## 4.4.3 RF_03 / RF_04 / RF_05 / RF_06 / RF_86 / RF_87 — Código de verificación (OTP)

> **RF_03:** si el correo no está confirmado se envía un código. **RF_04:** 6 dígitos, guardado con hash, caduca en 10 min. **RF_05:** máx. 5 intentos y espera de 60 s para reenvío. **RF_06:** al validar, inicia sesión automáticamente. **RF_86/87:** envío por correo con respaldo si no hay servidor configurado.

### 1. Elaboración

1. Si Supabase responde "not confirmed", el backend genera un `pending_token` JWT de 10 minutos (`auth.service.ts:217-229`) y el frontend navega a `/verify-otp`.
2. `sendOtp` genera un código de 6 dígitos, lo hashea con **bcrypt (costo 10)**, lo guarda en `verification_codes` con `expires_at = ahora + 10 min` y lo envía por correo (SMTP/nodemailer; si no hay servidor configurado lo registra en logs como respaldo — RF_87). Aplica cooldown de 60 s.
3. `verifyOtp` valida expiración, contador de intentos (máx. 5) y compara con bcrypt. Al acertar, confirma el correo y genera tokens de sesión (inicio de sesión automático, RF_06).
4. La tabla `verification_codes` está blindada con RLS: solo el backend (service role) puede accederla.

### 2. Código fuente

**Generación y seguridad del código** (`backend/api/src/auth/auth.service.ts:407-442`):

```ts
if (elapsed < 60000) {                       // RF_05: cooldown de reenvío
  return { sent: false, cooldown_until: ... };
}
const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
const codeHash = await bcrypt.hash(otpCode, 10);                        // hash seguro
await supabaseAdmin.from('verification_codes').insert({
  user_id, code_hash: codeHash, email,
  expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),      // 10 minutos
  attempts: 0, used: false,
});
```

**Límite de intentos** (`auth.service.ts:500-519`):

```ts
if (verificationCode.attempts >= 5) {
  throw new BadRequestException('Demasiados intentos fallidos. Solicita un nuevo código.');
}
const isValid = await bcrypt.compare(code, verificationCode.code_hash);
if (!isValid) {
  ... update({ attempts: verificationCode.attempts + 1 }) ...
  throw new BadRequestException(`Código incorrecto. Te quedan ${remaining} intento(s).`);
}
```

**Interfaz OTP** (`frontend/src/routes/verify-otp.tsx:226-247`): seis cajas de un dígito con auto-avance y pegado completo; contador de expiración de 10 min y botón "Reenviar en Ns".

### 3. Consulta SQL

```sql
CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,          -- nunca se guarda el código en texto plano
  email text NOT NULL,
  expires_at timestamptz NOT NULL,  -- caducidad 10 minutos
  attempts int DEFAULT 0,           -- contador de intentos
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only - verification_codes"
  ON public.verification_codes FOR ALL USING (false) WITH CHECK (false);
```

### 4. Interfaz final

Pantalla `/verify-otp`: seis casillas numéricas, cronómetro de expiración, mensaje de intentos restantes y botón de reenvío con cuenta regresiva de 60 s.

> 📷 *Captura: ruta `/verify-otp` con un código enviado.*

---

## 4.4.4 RF_07 / RF_09 — Registro de alumnos y correo único

> **RF_07:** cualquier persona puede registrarse como estudiante con nombre, correo, contraseña, matrícula y turno. **RF_09:** no se puede registrar dos veces el mismo correo.

### 1. Elaboración

El formulario de registro (`LoginSite.tsx:371-469`) valida nombre ≥ 3 caracteres, correo válido, contraseña ≥ 6, matrícula y turno (matutino/vespertino) con Zod en el backend (`register-student.dto.ts`). El backend crea el usuario **sin confirmar** en Supabase, inserta su `profiles` y le asigna rol `student`; si el correo ya existe responde "El correo ya está registrado" (RF_09). Después el alumno continúa al flujo OTP.

### 2. Código fuente

**Backend** (`backend/api/src/auth/auth.service.ts:237-256`):

```ts
const { data: authData, error: authError } =
  await this.supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: false,
    user_metadata: { nombre, matricula, turno },
  });
if (authError || !authData.user) {
  if (this.isEmailAlreadyRegistered(authError)) {
    throw new BadRequestException('El correo ya está registrado.');  // RF_09
  }
  ...
}
```

**Validación Zod** (`backend/api/src/auth/dto/register-student.dto.ts`):

```ts
export const RegisterStudentSchema = z.object({
  nombre: z.string().min(3), email: z.string().email(),
  password: z.string().min(6), matricula: z.string().min(4),
  turno: z.enum(['matutino', 'vespertino']),
});
```

### 3. Consulta SQL

Al crearse el usuario, un trigger genera su perfil y rol por defecto (`migrations/20260509000100_roles_default.sql`):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, matricula, turno, cambios_restantes, inscripcion_limite)
  VALUES (new.id, new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'matricula',
          new.raw_user_meta_data->>'turno', 3, now() + interval '3 weeks');
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'student');
  RETURN new;
END; $$;
```

### 4. Interfaz final

En `/auth`, al elegir rol Alumno aparece la pestaña "Crear cuenta" con campos Nombre, Turno, Correo, Matrícula y Contraseña.

> 📷 *Captura: formulario de registro de alumno en `/auth`.*

---

## 4.4.5 RF_10 — Cerrar sesión

> Al cerrar sesión se borra la información del usuario guardada en el dispositivo.

### 1. Elaboración y código

El hook `useAuth` recorre `localStorage`, elimina todas las claves `role_*` y `pending_auth_*`, y destruye la sesión de Supabase (`frontend/src/hooks/useAuth.tsx:20-32`); el encabezado redirige a `/auth` (`Header.tsx:13-16`).

```ts
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key?.startsWith('role_') || key?.startsWith('pending_auth_')) keysToRemove.push(key);
}
for (const key of keysToRemove) localStorage.removeItem(key);
await supabase.auth.signOut();   // destrucción de tokens
```

### 2. Interfaz final

Botón "Cerrar sesión" en el encabezado de cualquier panel; tras pulsarlo el usuario vuelve a la pantalla de acceso.

> 📷 *Captura: botón de cierre de sesión en el encabezado del panel.*

---

## 4.4.6 RF_16 a RF_23 — Catálogo de talleres

> Lista de talleres con nombre, categoría, lugar, instructor, cupo, imagen y horarios (RF_16); filtros por categoría (RF_17), búsqueda por nombre (RF_18), paginación de 9 (RF_20), modal de detalle (RF_21), imagen genérica de respaldo (RF_22) y 4 categorías oficiales (RF_23).

### 1. Elaboración

El catálogo (`frontend/src/routes/catalogo.lazy.tsx`) consulta `talleres` y `horarios` de Supabase (`hooks/useTalleres.ts:10-42`) y aplica en memoria los filtros: categoría (`:171-176`), búsqueda (`:174`), paginación con `ITEMS_PER_PAGE = 9` (`:21,178-179` con botón "Mostrar más"), y modal `TallerDetalleModal` (`:25-143`). La imagen de respaldo se resuelve con `imagenDeTaller()` (`lib/tallerImages.ts:34-48`): si `imagen_url` está vacío usa una imagen genérica. Las 4 categorías se definen en `lib/talleres.ts:22-27` y en el ENUM del backend (`taller.entity.ts:4-15`).

### 2. Código fuente (`catalogo.lazy.tsx:171-179`)

```ts
if (category) result = result.filter(t => t.categoria === category);          // RF_17
if (search) result = result.filter(t => t.nombre.toLowerCase().includes(search.toLowerCase())); // RF_18
const visibleTalleres = filtered.slice(0, visibleCount);                      // RF_20 (9 por página)
```

### 3. Consulta SQL

```sql
SELECT * FROM public.talleres;    -- visible para todos (política "Talleres are viewable by everyone")
SELECT * FROM public.horarios WHERE taller_id = :id;
```

### 4. Interfaz final

Página `/catalogo`: buscador, botones de categoría, tarjetas con imagen/cupo/horarios y modal de detalle al hacer clic.

> 📷 *Captura: página `/catalogo` con filtros y tarjetas.*

---

## 4.4.7 RF_24 a RF_27 / RF_32 — Inscripción a talleres

> Inscripción desde el catálogo (RF_24), bloqueo por empalme de horarios (RF_25), validación de cupo (RF_26), periodo de inscripción (RF_27) y sin inscripciones duplicadas (RF_32).

### 1. Elaboración

La inscripción inserta en `inscripciones` directamente contra Supabase (`catalogo.lazy.tsx:207-232`). Las reglas de negocio viven **en la base de datos** como triggers (autoridad final) y se pre-validan en el frontend para mejor experiencia:

- **RF_25 horarios:** pre-validación con `tieneColision()` (`lib/talleres.ts:43-62`) que deshabilita el botón, y trigger `check_inscripcion_colision` que rechaza el INSERT.
- **RF_27 periodo:** compara `now()` contra `profiles.inscripcion_limite` (`catalogo.lazy.tsx:194-199`) y trigger que lanza `'El periodo de inscripciones ha finalizado'`.
- **RF_32 duplicados:** restricción `UNIQUE(alumno_id, taller_id)`; la UI muestra "Darse de baja" si ya está inscrito.

### 2. Código fuente (`catalogo.lazy.tsx:215-224`)

```ts
const { error } = await supabase.from('inscripciones').insert({
  alumno_id: user.id, taller_id: taller.id,
});
if (error.message.includes('Colisión')) toast.error('Colisión de horarios detectada');
```

### 3. Consulta SQL (`migrations/0000_initial.sql:80-110`)

```sql
CREATE OR REPLACE FUNCTION public.check_inscripcion_colision() RETURNS trigger AS $$
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.inscripciones i
    JOIN public.horarios h1 ON i.taller_id = h1.taller_id
    JOIN public.horarios h2 ON h2.taller_id = NEW.taller_id
    WHERE i.alumno_id = NEW.alumno_id AND h1.dia = h2.dia
      AND h1.hora_inicio < h2.hora_fin AND h1.hora_fin > h2.hora_inicio
  ) INTO v_colision;
  IF v_colision THEN RAISE EXCEPTION 'Colisión de horarios detectada con otro taller inscrito'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER prevent_horario_colision BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_colision();
```

### 4. Interfaz final

En la tarjeta o modal del taller, botón "Inscribirme"; si hay empalme aparece deshabilitado con el aviso "Choca con <taller>"; tras inscribirse la tarjeta muestra la insignia "Inscrito".

> 📷 *Captura: catálogo con botón Inscribirme y aviso de colisión.*

---

## 4.4.8 RF_28 / RF_29 / RF_30 / RF_38 — Baja de taller y límite de cambios

> Máximo 3 cambios de taller (RF_28), baja con motivo (RF_29), cada baja descuenta un cambio (RF_30) y la baja puede ejecutarse desde el panel del alumno (RF_38).

### 1. Elaboración

El alumno pulsa "Darse de baja" (catálogo o panel) y se abre `BajaDialog` (`components/BajaDialog.tsx`), que solicita el motivo y advierte si es su último cambio. Al confirmar se ejecuta la función SQL `dar_baja_taller()`, que elimina la inscripción y descuenta `cambios_restantes`; si el contador llega a 0, los triggers bloquean nuevas inscripciones con `'Has agotado tus 3 oportunidades de cambio de taller'`.

### 2. Código fuente

**RPC de baja** (`frontend/src/routes/dashboard.lazy.tsx:116-119`):

```ts
const { data, error } = await supabase.rpc('dar_baja_taller', {
  p_alumno_id: user.id, p_taller_id: tallerId,
});
```

**Formulario de motivo** (`components/BajaDialog.tsx:78-81`):

```tsx
<textarea value={motivo} onChange={(e) => setMotivo(e.target.value)}
  placeholder="Escribe el motivo por el cual te das de baja..." rows={3} />
```

### 3. Consulta SQL (`migrations/20260730000001_fix_cambios_restantes.sql`)

```sql
CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid) ...
  DELETE FROM public.inscripciones WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id;
  -- el trigger on_inscripcion_deleted descuenta:
  UPDATE public.profiles
  SET cambios_restantes = GREATEST(COALESCE(cambios_restantes, 3) - 1, 0)
  WHERE id = OLD.alumno_id;
```

Y el bloqueo al agotar cambios (`20260723000001_fix_asistencias_complete.sql:163-165`):

```sql
IF COALESCE(v_cambios, 0) <= 0 THEN
  RAISE EXCEPTION 'Has agotado tus 3 oportunidades de cambio de taller'; END IF;
```

### 4. Interfaz final

Diálogo modal con texto del taller, contador de cambios restantes, campo de motivo y botón de confirmación.

> 📷 *Captura: diálogo "Darse de baja" con el campo de motivo.*

---

## 4.4.9 RF_33 / RF_34 — Panel del alumno: talleres inscritos y horario semanal

> El alumno ve sus talleres activos (RF_33) y un calendario semanal con bloques por día y hora (RF_34).

### 1. Elaboración y código

El dashboard filtra los talleres donde el alumno está inscrito (`dashboard.lazy.tsx:137`, sección "Mis Talleres Inscritos" `:232-262`) y monta `WeekCalendar` (`components/WeekCalendar.tsx`), que dibuja una cuadrícula de 7:00 a 18:00 (Lun–Sáb) y coloca cada taller como bloque posicionado según su hora:

```tsx
const top = `${(startMinutes / 60) * rowHeight}px`;      // WeekCalendar.tsx:12-36
const height = `${(duration / 60) * rowHeight}px`;
```

### 2. Consulta SQL

```sql
SELECT taller_id FROM public.inscripciones WHERE alumno_id = auth.uid();  -- política "viewable by owner"
```

### 3. Interfaz final

Panel `/dashboard`: tarjetas de talleres inscritos con opción de baja, calendario semanal con bloques de colores por taller y contador de días restantes del periodo.

> 📷 *Captura: `/dashboard` con "Mis Talleres Inscritos" y el calendario semanal.*

---

## 4.4.10 RF_40 a RF_45 / RF_69 a RF_73 — Pase de lista del instructor

> Talleres asignados con conteo de alumnos (RF_40); marcado presente/ausente/retardo/justificado (RF_41, RF_70); consulta de fechas anteriores (RF_42); filtro por estado (RF_43); observaciones (RF_44, RF_71); "marcar todos presente" (RF_45); hora automática (RF_72); un registro por alumno/taller/fecha que se actualiza en vez de duplicarse (RF_69, RF_73).

### 1. Elaboración

`useInstructorTalleres` carga los talleres con `instructor_id = uid` y el conteo de inscritos por taller (`hooks/useInstructor.ts:27-52`). El pase de lista (`components/asistencia/ListaAsistencia.tsx` + `AlumnoRow.tsx`) carga alumnos con la función SQL `get_asistencia_taller` y guarda con **upsert** sobre la clave `(alumno_id, taller_id, fecha)`: si ya existe el registro del día, lo actualiza (RF_73); la hora se captura al momento de guardar (RF_72).

### 2. Código fuente

**Cuatro estados** (`components/asistencia/AlumnoRow.tsx:9-14`):

```ts
const OPCIONES_RAPIDAS = [
  { estado: 'presente', ... }, { estado: 'ausente', ... },
  { estado: 'retardo', ... },  { estado: 'justificado', ... },
];
```

**Upsert sin duplicados** (`hooks/useAsistencias.ts:101-113`):

```ts
await supabase.from('asistencias').upsert(
  { alumno_id, taller_id, instructor_id: user?.id ?? null, fecha,
    hora: new Date().toTimeString().slice(0, 8),   // RF_72 hora automática
    estado, observaciones: observaciones ?? null },
  { onConflict: 'alumno_id,taller_id,fecha' }      // RF_69/RF_73
);
```

**Marcar todos presente** (`ListaAsistencia.tsx:45-55`) y **filtro por estado** (`:41-43, :132-160` con tarjetas clicables de Presentes/Ausentes/Retardos/Justificados).

### 3. Consulta SQL

```sql
CREATE TABLE public.asistencias (
  ...
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time DEFAULT CURRENT_TIME,
  estado text NOT NULL CHECK (estado IN ('presente','ausente','retardo','justificado')), -- RF_70
  observaciones text,
  UNIQUE(alumno_id, taller_id, fecha)   -- RF_69: una asistencia por día
);
```

### 4. Interfaz final

Panel `/instructor`: tarjetas de resumen (alumnos, talleres, asistencia 7 días), lista de talleres con conteo de alumnos/cupo, y al abrir un taller el pase de lista con selector de fecha, botones de estado por alumno, campo de observaciones expandible y botón "Todos Presente".

> 📷 *Captura: pase de lista con alumnos marcados y filtro por estado.*

---

## 4.4.11 RF_50 / RF_78 — Actualización en tiempo real

> La asistencia se refleja de inmediato sin recargar la página.

### 1. Elaboración y código

Se usa **Supabase Realtime**: el hook suscribe un canal a los cambios de la tabla `asistencias` del taller y, al recibir eventos, refresca la lista automáticamente (`hooks/useAsistencias.ts:63-83`); además la UI aplica actualización optimista inmediata al marcar (`:92-97`). El panel del admin tiene canales equivalentes (`:173-184, :432-443`).

```ts
const channel = supabase.channel(`asistencias:${tallerId}:${fecha}`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'asistencias', filter: `taller_id=eq.${tallerId}` },
    () => { fetchAlumnos(); })
  .subscribe();
```

### 2. Consulta SQL

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;  -- migrations/20260712000004
```

### 3. Interfaz final

Al marcar un estado, el cambio aparece al instante en la fila del alumno y en el panel del administrador sin recargar.

> 📷 *Captura: indicador "Guardado" y fila actualizada en el pase de lista.*

---

## 4.4.12 RF_48 / RF_49 / RF_66 — Exportación de asistencias (CSV y PDF)

> Descarga de listas de asistencia en CSV/Excel (RF_48, RF_66) y PDF con encabezado institucional (RF_49).

### 1. Elaboración y código

En `hooks/useAsistencias.ts` se implementan `exportarCSV` / `exportarCSVInstructor` (`:448-466`), que generan el archivo en el navegador con `Blob` de tipo `text/csv`, y `exportarPDFInstructor` (`:507-648`), que carga dinámicamente `jspdf` + `jspdf-autotable` y produce el PDF con encabezado CBTis 61. El admin exporta desde su panel (`admin.lazy.tsx:211`) y el instructor desde `/instructor` (reporte diario y mensual, `instructor.lazy.tsx:341-360`).

```ts
const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
const blob = new Blob([csv], { type: 'text/csv' });   // descarga directa
```

### 2. Interfaz final

Botones "Exportar CSV" y "Exportar PDF" en los paneles de instructor y administrador; el navegador descarga el archivo generado.

> 📷 *Captura: botones de exportación y un PDF/CSV generado.*

---

## 4.4.13 RF_51 a RF_54 — Gestión de talleres (administrador)

> Crear talleres con toda su información (RF_51), editarlos (RF_52), eliminarlos sin inscritos (RF_53) y modificar horarios (RF_54).

### 1. Elaboración y código

Todo el CRUD vive en el panel de administración (`frontend/src/routes/admin.lazy.tsx`): formulario con nombre, categoría, lugar, cupo, descripción, imagen e instructor (`:527-780`); al guardar se inserta/actualiza `talleres` y se reemplazan sus `horarios` (borrado + inserción, `:646-652`) con editor de días y horas (`:878-910`); la eliminación pide confirmación (`:344-357, :467-508`). El backend protege adicionalmente: no elimina talleres con inscritos (`talleres.service.ts:129-144`, responde 409) y rechaza cupos menores a los inscritos actuales (`:98-107`, RF_55).

### 2. Consulta SQL

```sql
INSERT INTO public.talleres (nombre, categoria, lugar, cupo, instructor_id, imagen_url) VALUES (...);
INSERT INTO public.horarios (taller_id, dia, hora_inicio, hora_fin) VALUES (...);
-- solo admin (RLS): "Admins can do everything with talleres"
```

### 3. Interfaz final

Panel `/admin` → sección Talleres: tabla con chips de horarios, botones editar/eliminar y modal de formulario con editor dinámico de horarios.

> 📷 *Captura: modal de creación/edición de taller con el editor de horarios.*

---

## 4.4.14 RF_67 — Bitácora de auditoría

> El sistema guarda registro de las acciones de los administradores.

### 1. Elaboración y SQL

La tabla `audit_log` (`migrations/20260730000000_improvements.sql:111-135`) registra evento, usuario y marca de tiempo; su RLS permite INSERT al sistema y lectura solo al administrador (bitácora de solo agregación). El panel muestra los últimos 6 movimientos (RF_65).

```sql
CREATE TABLE IF NOT EXISTS public.audit_log ( ... );
CREATE POLICY "Admin ve audit_log" ON public.audit_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Sistema inserta audit_log" ON public.audit_log FOR INSERT
  WITH CHECK (true);
```

### 2. Interfaz final

Panel `/admin`: sección "Actividad reciente" con los últimos eventos (acción, usuario y hora).

> 📷 *Captura: sección de actividad reciente del panel de administración.*

---
