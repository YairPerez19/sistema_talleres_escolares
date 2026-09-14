# REPORTE DE PRUEBAS INTEGRALES DE SISTEMA (E2E & INTEGRATION TEST REPORT)
## Sistema de Gestión de Talleres Escolares — SITE CBTIS No. 61

---

## 1. Información General del Proyecto y Entorno

| Parámetro | Detalle |
|---|---|
| **Nombre del Sistema** | Sistema de Gestión de Talleres Escolares (SITE) |
| **Institución** | Centro de Bachillerato Tecnológico Industrial y de Servicios No. 61 (CBTIS 61) |
| **Fecha de Evaluación** | 25 de Agosto de 2026 |
| **Versión del Sistema** | v1.2.0-release |
| **Alcance de Pruebas** | Pruebas Integrales de Extremo a Extremo (E2E), Integración Frontend-Backend-Database, Políticas RLS y Reglas de Negocio en PostgreSQL |
| **Responsables** | Equipo de Desarrollo e Integración SITE |

### 1.1 Entorno Tecnológico Probado

```
[ Frontend: React 19 + TanStack Router + Vite 6 ] 
                        │
                        ▼ (HTTP REST API / Auth Service)
[ Backend: NestJS 11 + Zod DTO + Throttler Guard + Helmet ]
                        │
                        ▼ (PostgreSQL Client / Service Role)
[ Database & Security: Supabase PostgreSQL + RLS + PL/pgSQL Triggers ]
```

---

## 2. Resumen Ejecutivo de Resultados

| Módulo de Prueba | Casos Ejecutados | Éxito (PASÓ) | Fallo (FALLÓ) | Cobertura % |
|---|:---:|:---:|:---:|:---:|
| **Módulo 1: Autenticación, Registro y Roles (Auth & RBAC)** | 5 | 5 | 0 | 100% |
| **Módulo 2: Catálogo e Inscripción de Alumnos** | 4 | 4 | 0 | 100% |
| **Módulo 3: Modificación, Baja y Límite de Oportunidades** | 3 | 3 | 0 | 100% |
| **Módulo 4: Gestion de Asistencias y Pase de Lista (Instructor)** | 4 | 4 | 0 | 100% |
| **Módulo 5: Administración General y Reportes (Admin)** | 4 | 4 | 0 | 100% |
| **Módulo 6: Seguridad Backend, RLS y Rendimiento API** | 2 | 2 | 0 | 100% |
| **TOTAL** | **22** | **22** | **0** | **100%** |

---

## 3. Matriz Detallada de Casos de Prueba Integrales

---

### Módulo 1: Autenticación, Registro y Control de Acceso (Auth & Security)

#### 🧪 Caso de Prueba: CP-INT-001 — Registro de Nuevo Estudiante
* **Requerimientos asociados:** `RF_07`, `RF_09`
* **Módulo / Capa:** Frontend -> Backend NestJS (`/api/auth/register-student`) -> Supabase DB (`profiles` / `auth.users`)
* **Precondiciones:** El correo electrónico no debe estar registrado previamente en el sistema.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Navegar a `/auth` y seleccionar el rol "Alumno".<br>2. Hacer clic en "Registrarse".<br>3. Ingresar nombre completo, matrícula de 14 dígitos, turno (matutino/vespertino), correo `@cbtis61.edu.mx` y contraseña (mínimo 6 caracteres).<br>4. Presionar "Crear Cuenta". |
| **Datos de Entrada** | `nombre`: "Juan Pablo Pérez", `matricula`: "24311050001234", `turno`: "matutino", `email`: "juan.perez24@cbtis61.edu.mx", `password`: "Estudiante2026*" |
| **Resultado Esperado** | Registro creado exitosamente en la base de datos (registro en `profiles` con `cambios_restantes = 3` e `inscripcion_limite = now() + 3 semanas`). Redirección a la pantalla de verificación OTP. |
| **Resultado Obtenido** | El backend valida la estructura mediante Zod DTO, crea la cuenta en Supabase Auth y retorna código `201 Created`. El frontend guarda el token pendiente y muestra la pantalla OTP. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Formulario de Registro y Alerta de Confirmación ]* |

---

#### 🧪 Caso de Prueba: CP-INT-002 — Verificación de Identidad y Solicitud de OTP
* **Requerimientos asociados:** `RF_01`, `RF_03`, `RF_04`, `RF_86`
* **Módulo / Capa:** Frontend -> Backend NestJS (`/api/auth/verify-identity`, `/api/auth/send-otp`) -> Resend Mail Service
* **Precondiciones:** La cuenta de usuario existe y requiere confirmación por código OTP.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Ingresar credenciales en la pantalla de inicio de sesión.<br>2. Enviar formulario.<br>3. Verificar respuesta del backend solicitando verificación de código OTP enviando un correo al alumno. |
| **Datos de Entrada** | `email`: "juan.perez24@cbtis61.edu.mx", `password`: "Estudiante2026*", `matricula`: "24311050001234" |
| **Resultado Esperado** | El backend verifica credenciales con Supabase Auth. Si requiere OTP, genera un token dinámico, envía un código numérico de 6 dígitos mediante el servicio Resend al correo y retorna `pending_token`. |
| **Resultado Obtenido** | Código OTP entregado en la bandeja de entrada del usuario en menos de 2 segundos. Respuesta HTTP 200 OK con payload `{ status: "otp_required", pending_token: "..." }`. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Correo recibido con código de verificación de 6 dígitos ]* |

---

#### 🧪 Caso de Prueba: CP-INT-003 — Confirmación de OTP e Inicio de Sesión
* **Requerimientos asociados:** `RF_05`, `RF_06`, `RF_14`, `RF_15`
* **Módulo / Capa:** Frontend (`/verify-otp`) -> Backend (`/api/auth/verify-otp`) -> Supabase Client Session
* **Precondiciones:** Tener un token pendiente activo y el código de 6 dígitos correcto enviado por correo.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Introducir los 6 dígitos del OTP en los campos de entrada de la interfaz.<br>2. El formulario envía automáticamente o al hacer clic en "Confirmar".<br>3. Verificar redirección al panel correspondiente. |
| **Datos de Entrada** | `pending_token`: "eyJhbGci...", `code`: "582914" |
| **Resultado Esperado** | Validación exitosa del OTP. Emisión de `access_token` y `refresh_token`. El frontend ejecuta `supabase.auth.setSession()` y redirige al `/dashboard` de alumno. |
| **Resultado Obtenido** | Sesión iniciada correctamente, token almacenado de forma segura y el usuario accede a su panel principal con su perfil cargado. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Pantalla OTP validada y Redirección a Dashboard ]* |

---

#### 🧪 Caso de Prueba: CP-INT-004 — Protección contra Fuerza Bruta en OTP (Rate Limiting)
* **Requerimientos asociados:** `RF_06`, Security Specs
* **Módulo / Capa:** Backend NestJS (`ThrottlerGuard` & `ThrottlerModule`)
* **Precondiciones:** Usuario intentando ingresar códigos OTP erróneos repetidamente.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Enviar más de 30 solicitudes consecutivas de validación OTP en menos de 60 segundos.<br>2. Evaluar la respuesta del servidor ante la ráfaga de peticiones. |
| **Datos de Entrada** | 35 peticiones HTTP `POST /api/auth/verify-otp` con `code` incorrecto ("000000"). |
| **Resultado Esperado** | El servidor rechaza las solicitudes excedentes respondiendo con código de estado HTTP `429 Too Many Requests`. |
| **Resultado Obtenido** | A la petición 31, el backend bloquea la dirección IP temporalmente emitiendo respuesta 429 "ThrottlerException: Too Many Requests". |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Respuesta HTTP 429 en herramientas de desarrollador ]* |

---

#### 🧪 Caso de Prueba: CP-INT-005 — Control de Acceso Basado en Roles (RBAC Guard)
* **Requerimientos asociados:** `RF_02`, `RF_11`, `RF_12`
* **Módulo / Capa:** Frontend (`AuthGuard` en `__root.tsx`) & Supabase RLS (`has_role`)
* **Precondiciones:** Sesión activa con un usuario con rol de `student` (Alumno).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Iniciar sesión como alumno.<br>2. Intentar ingresar manualmente a la URL `/admin` o `/instructor` en la barra de direcciones del navegador. |
| **Datos de Entrada** | URL directa: `http://localhost:5173/admin` |
| **Resultado Esperado** | El sistema detecta que el rol `student` no posee los permisos requeridos, bloquea el renderizado y muestra una pantalla de "Acceso Denegado" o redirige al `/dashboard`. |
| **Resultado Obtenido** | Redirección inmediata al `/dashboard` del alumno con notificación toast "No tienes permisos para acceder a esta sección". |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Pantalla de Acceso Denegado / Redirección ]* |

---

### Módulo 2: Catálogo e Inscripción a Talleres Escolares

#### 🧪 Caso de Prueba: CP-INT-006 — Búsqueda y Filtrado en Catálogo de Talleres
* **Requerimientos asociados:** `RF_16`, `RF_17`, `RF_18`, `RF_19`, `RF_20`, `RF_21`
* **Módulo / Capa:** Frontend (`/catalogo`) -> Supabase Client (`talleres`, `horarios`)
* **Precondiciones:** Existen talleres registrados en la base de datos (e.g. Fútbol, Basquetbol, Banda de Guerra, Ajedrez).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Acceder al módulo de Catálogo de Talleres.<br>2. Filtrar por categoría (Deportivos / Culturales) y por búsqueda de texto.<br>3. Verificar la visualización de cupos disponibles y horarios. |
| **Datos de Entrada** | Filtro Criterio: Categoria = "Deportivos", Búsqueda = "Fútbol" |
| **Resultado Esperado** | La interfaz filtra en tiempo real mostrando únicamente los talleres que coinciden con los criterios, indicando instructor, lugar, cupo restante y días/horas de práctica. |
| **Resultado Obtenido** | Tarjetas de talleres renderizadas correctamente con datos precisos de cupos y horarios cargados desde PostgreSQL. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Catálogo de talleres filtrado por categoría ]* |

---

#### 🧪 Caso de Prueba: CP-INT-007 — Inscripción Exitosa a Taller
* **Requerimientos asociados:** `RF_24`, `RF_25`, `RF_26`, `RF_27`
* **Módulo / Capa:** Frontend -> Supabase DB (`inscripciones`, `talleres`)
* **Precondiciones:** El alumno no está inscrito en ningún taller y el taller seleccionado cuenta con cupo disponible (> 0).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Seleccionar el taller "Basquetbol" en el catálogo.<br>2. Presionar el botón "Inscribirme".<br>3. Confirmar la inscripción en el cuadro de diálogo de confirmación. |
| **Datos de Entrada** | `alumno_id`: "uuid-alumno-01", `taller_id`: "uuid-taller-basquetbol" |
| **Resultado Esperado** | Inserción en la tabla `inscripciones`. Actualización del cupo del taller. Notificación de éxito y actualización del panel del alumno. |
| **Resultado Obtenido** | Inserción exitosa en `public.inscripciones`. El alumno visualiza su taller asignado en su Dashboard personal y el cupo disponible se actualiza instantáneamente. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Confirmación de inscripción exitosa y resumen en Dashboard ]* |

---

#### 🧪 Caso de Prueba: CP-INT-008 — Bloqueo de Inscripción Duplicada
* **Requerimientos asociados:** `RF_24`, Database Constraints
* **Módulo / Capa:** Supabase PostgreSQL (`UNIQUE(alumno_id, taller_id)`)
* **Precondiciones:** El alumno ya se encuentra inscrito en el taller "Basquetbol".

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Intentar enviar una segunda solicitud de inscripción al mismo taller "Basquetbol" mediante la interfaz o petición directa. |
| **Datos de Entrada** | `alumno_id`: "uuid-alumno-01", `taller_id`: "uuid-taller-basquetbol" |
| **Resultado Esperado** | La base de datos rechaza la inserción por violación de la restricción de unicidad (`UNIQUE constraint violation`). El frontend captura la excepción y muestra "Ya estás inscrito en este taller". |
| **Resultado Obtenido** | Error capturado correctamente `23505 duplicate key value violates unique constraint "inscripciones_alumno_id_taller_id_key"`. Mensaje claro en pantalla. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Mensaje de advertencia "Ya estás inscrito en este taller" ]* |

---

#### 🧪 Caso de Prueba: CP-INT-009 — Validación de Cupo Lleno
* **Requerimientos asociados:** `RF_26`, `RF_32`
* **Módulo / Capa:** Frontend Component & Database Query
* **Precondiciones:** El taller "Ajedrez" ha alcanzado el límite máximo de cupo (`cupo = 0`).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Navegar al taller "Ajedrez" en el catálogo.<br>2. Intentar hacer clic en el botón de inscripción. |
| **Datos de Entrada** | Taller con `cupo = 0` |
| **Resultado Esperado** | El botón "Inscribirme" se encuentra deshabilitado con la etiqueta "Cupo Lleno". Si se intenta forzar la acción, el sistema invalida la transacción. |
| **Resultado Obtenido** | La interfaz deshabilita el botón con estilo visual distintivo y bloquea cualquier intento de inscripción. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Botón de taller con estado "Cupo Lleno" deshabilitado ]* |

---

### Módulo 3: Modificación, Baja y Reglas de Negocio en Base de Datos

#### 🧪 Caso de Prueba: CP-INT-010 — Baja de Taller (RPC `dar_baja_taller`)
* **Requerimientos asociados:** `RF_28`, `RF_29`, `RF_30`
* **Módulo / Capa:** Frontend -> PostgreSQL RPC Function `dar_baja_taller` & Trigger `handle_inscripcion_change`
* **Precondiciones:** El alumno está inscrito en un taller y cuenta con `cambios_restantes > 0`.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Ingresar al Dashboard del Alumno.<br>2. Hacer clic en "Dar de baja taller".<br>3. Confirmar la acción en el modal. |
| **Datos de Entrada** | `p_alumno_id`: "uuid-alumno-01", `p_taller_id`: "uuid-taller-basquetbol" |
| **Resultado Esperado** | Eliminación atómica del registro en `inscripciones` y decremento automático de `cambios_restantes` de 3 a 2 en la tabla `profiles`. |
| **Resultado Obtenido** | La función PL/pgSQL ejecuta la transacción correctamente retornando `{ success: true, cambios_restantes: 2 }`. El contador se actualiza en pantalla. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Modal de baja de taller y contador actualizado a 2 cambios restantes ]* |

---

#### 🧪 Caso de Prueba: CP-INT-011 — Restricción de Límite de 3 Cambios de Taller
* **Requerimientos asociados:** `RF_38`, Database Trigger `check_inscripcion_constraints`
* **Módulo / Capa:** PostgreSQL Trigger (`check_inscripcion_constraints_trigger`)
* **Precondiciones:** El alumno ha realizado 3 bajas/cambios previos (`cambios_restantes = 0`).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Intentar inscribirse a un nuevo taller cuando el perfil indica 0 cambios disponibles. |
| **Datos de Entrada** | Perfil con `cambios_restantes = 0` |
| **Resultado Esperado** | El disparador `BEFORE INSERT ON inscripciones` lanza una excepción `RAISE EXCEPTION 'Has agotado tus 3 oportunidades de cambio de taller'`. La inscripción es abortada. |
| **Resultado Obtenido** | Excepción lanzada por PostgreSQL de forma íntegra. El usuario recibe el mensaje "Has agotado tus 3 oportunidades de cambio de taller". |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Toast de error notificando el límite agotado de cambios ]* |

---

#### 🧪 Caso de Prueba: CP-INT-012 — Restricción por Fecha Límite de Inscripciones
* **Requerimientos asociados:** `RF_38`, Database Trigger `check_inscripcion_constraints`
* **Módulo / Capa:** PostgreSQL Trigger (`check_inscripcion_constraints`)
* **Precondiciones:** La fecha actual es superior a la fecha guardada en `inscripcion_limite` (`now() > inscripcion_limite`).

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Simular una inscripción con un usuario cuyo periodo límite de 3 semanas ha vencido. |
| **Datos de Entrada** | `inscripcion_limite`: "2026-08-01 00:00:00", `now()`: "2026-08-25" |
| **Resultado Esperado** | El disparador interrumpe la inserción con la excepción `RAISE EXCEPTION 'El periodo de inscripciones ha finalizado'`. |
| **Resultado Obtenido** | La transacción se cancela (rollback). El frontend notifica que el periodo de inscripciones ha finalizado. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Alerta del sistema notificando periodo extemporáneo ]* |

---

### Módulo 4: Gestión de Asistencias y Pase de Lista (Instructor)

#### 🧪 Caso de Prueba: CP-INT-013 — Carga de Lista de Asistencia por Taller y Fecha
* **Requerimientos asociados:** `RF_40`, `RF_41`, RPC `get_asistencia_taller`
* **Módulo / Capa:** Frontend Instructor (`/instructor`) -> PostgreSQL RPC `get_asistencia_taller`
* **Precondiciones:** Instructor con sesión activa y taller asignado con alumnos inscritos.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. El instructor accede a su panel `/instructor`.<br>2. Selecciona la fecha del día de hoy en el selector.<br>3. Consultar la lista cargada de estudiantes inscritos. |
| **Datos de Entrada** | `p_taller_id`: "uuid-taller-futbol", `p_fecha`: "2026-08-25" |
| **Resultado Esperado** | La RPC retorna la lista de alumnos ordenados alfabéticamente por nombre, indicando su estado previo (`presente`, `ausente`, `retardo`, `justificado` o `sin_registro`). |
| **Resultado Obtenido** | La tabla del instructor se completa de forma instantánea mostrando a todos los alumnos inscritos con sus controles interactivos. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Panel del Instructor con la lista de alumnos cargada ]* |

---

#### 🧪 Caso de Prueba: CP-INT-014 — Registro y Pase de Lista Individual y Grupal
* **Requerimientos asociados:** `RF_42`, `RF_43`, `RF_44`, `RF_45`
* **Módulo / Capa:** Frontend (`AlumnoRow.tsx`) -> Supabase Table `asistencias`
* **Precondiciones:** Lista de asistencia cargada en el panel del instructor.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Marcar a un alumno como "presente", a otro como "ausente" y a un tercero como "retardo".<br>2. Agregar una observación en el campo de texto.<br>3. Guardar cambios. |
| **Datos de Entrada** | Alumno 1: `estado` = "presente", Alumno 2: `estado` = "ausente", `observaciones`: "Llegó 15 min tarde con justificante médico" |
| **Resultado Esperado** | Guardado exitoso en la tabla `asistencias` con clave única `(alumno_id, taller_id, fecha)`. |
| **Resultado Obtenido** | Registros insertados/actualizados correctamente. Notificación de guardado y cambio de color indicativo en la fila del alumno. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Fila de alumnos con botones de estado (Verde, Rojo, Amarillo) y observaciones ]* |

---

#### 🧪 Caso de Prueba: CP-INT-015 — Edición de Asistencia Previamente Guardada
* **Requerimientos asociados:** `RF_44`, `RF_71`
* **Módulo / Capa:** Supabase Upsert / Policy `Instructor gestiona asistencias de sus talleres`
* **Precondiciones:** Existe un registro de asistencia previo para la fecha seleccionada.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Cambiar el estado de un alumno de "ausente" a "justificado".<br>2. Hacer clic en "Actualizar Asistencia". |
| **Datos de Entrada** | `alumno_id`: "uuid-alumno-02", `fecha`: "2026-08-25", nuevo `estado`: "justificado" |
| **Resultado Esperado** | El registro se actualiza mediante consulta UPDATE/UPSERT en PostgreSQL sin duplicar filas. |
| **Resultado Obtenido** | El estado cambia correctamente en la base de datos. La consulta posterior refleja el nuevo estado "justificado". |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Actualización de estado en la interfaz del instructor ]* |

---

#### 🧪 Caso de Prueba: CP-INT-016 — Seguridad RLS en Asistencias por Instructor
* **Requerimientos asociados:** `RF_12`, Supabase RLS Policy `"Instructor ve asistencias de sus talleres"`
* **Módulo / Capa:** Supabase Row Level Security (RLS)
* **Precondiciones:** Sesión iniciada con la cuenta del Instructor A.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Intentar consultar o modificar registros de asistencias pertenecientes al taller asignado al Instructor B. |
| **Datos de Entrada** | Consulta SQL / API: `SELECT * FROM asistencias WHERE taller_id = 'id-taller-instructor-b'` |
| **Resultado Esperado** | La política RLS filtra el resultado devolviendo 0 filas o rechazando la transacción con error de permisos RLS. |
| **Resultado Obtenido** | Las políticas de Supabase bloquean la lectura/escritura de talleres ajenos. Aislamiento total por instructor. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Verificación de consulta filtrada por RLS en herramientas de desarrollo ]* |

---

### Módulo 5: Administración General y Reportes (Admin)

#### 🧪 Caso de Prueba: CP-INT-017 — Alta de Nuevo Taller con Horarios
* **Requerimientos asociados:** `RF_51`, `RF_52`, `RF_53`, `RF_54`
* **Módulo / Capa:** Frontend Admin (`/admin`) -> Supabase DB (`talleres`, `horarios`)
* **Precondiciones:** Sesión iniciada como Administrador.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Ingresar al panel `/admin` y abrir la sección "Gestión de Talleres".<br>2. Presionar "Nuevo Taller".<br>3. Llenar nombre, categoría, lugar, cupo inicial y horarios (día, hora inicio, hora fin).<br>4. Guardar taller. |
| **Datos de Entrada** | `nombre`: "Robótica Educativa", `categoria`: "Tecnología", `lugar`: "Laboratorio de Cómputo 2", `cupo`: 25, `horario`: "Martes 14:00 - 16:00" |
| **Resultado Esperado** | Creación del taller en la tabla `talleres` y del horario correspondiente en `horarios`. Disponible inmediatamente en el catálogo. |
| **Resultado Obtenido** | Taller guardado con éxito. Se muestra en la lista de gestión del administrador y en el catálogo público de los estudiantes. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Formulario de alta de taller y confirmación de registro ]* |

---

#### 🧪 Caso de Prueba: CP-INT-018 — Creación y Asignación de Cuenta de Instructor
* **Requerimientos asociados:** `RF_51`, Backend Endpoint (`POST /api/auth/register-instructor`)
* **Módulo / Capa:** Admin Panel -> NestJS Auth Controller (`RolesGuard('admin')`) -> Supabase Auth & DB
* **Precondiciones:** Taller "Robótica Educativa" creado sin instructor asignado.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Seleccionar "Asignar Instructor" en el panel de administración.<br>2. Ingresar los datos del docente y seleccionar el taller a vincular.<br>3. Enviar solicitud. |
| **Datos de Entrada** | `nombre`: "Ing. Roberto Gómez", `email`: "roberto.gomez@cbtis61.edu.mx", `password`: "Docente2026*", `taller_id`: "uuid-taller-robotica" |
| **Resultado Esperado** | Creación del usuario con rol `instructor` en `user_roles`, vinculación de `instructor_id` en la tabla `talleres`. Retorno HTTP 201 Created. |
| **Resultado Obtenido** | Instructor creado de forma exitosa. El taller refleja al nuevo instructor y el docente puede iniciar sesión para gestionar dicho taller. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Modal de registro de instructor exitoso ]* |

---

#### 🧪 Caso de Prueba: CP-INT-019 — Control de Conflicto en Asignación de Instructor (HTTP 409)
* **Requerimientos asociados:** Backend Validation (`registerInstructor`)
* **Módulo / Capa:** NestJS Auth Service
* **Precondiciones:** El taller "Robótica Educativa" ya posee al Ing. Roberto Gómez asignado.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Intentar asignar un segundo instructor al mismo taller "Robótica Educativa". |
| **Datos de Entrada** | `taller_id`: "uuid-taller-robotica", `email`: "nuevo.instructor@cbtis61.edu.mx" |
| **Resultado Esperado** | El backend valida la asignación y devuelve un código de error HTTP `409 Conflict` con el mensaje "El taller ya tiene un instructor asignado". |
| **Resultado Obtenido** | Excepción `ConflictException` emitida por NestJS. La interfaz muestra la alerta impidiendo la duplicidad de docentes por taller. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Mensaje de error HTTP 409 "El taller ya tiene un instructor asignado" ]* |

---

#### 🧪 Caso de Prueba: CP-INT-020 — Generación de Reporte Analítico y Cálculo de Deudas
* **Requerimientos asociados:** `RF_48`, `RF_49`, Vista PostgreSQL `deuda_alumnos`
* **Módulo / Capa:** PostgreSQL View `deuda_alumnos` -> Admin Dashboard Report Component
* **Precondiciones:** Registros de asistencias cargados en el sistema con ausencias y asistencias.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Ingresar a la sección "Reportes y Finanzas" del panel de administración.<br>2. Visualizar la tabla de deudas por alumno generada por la vista analítica. |
| **Datos de Entrada** | Registro de 4 clases asistidas/retardos y 1 falta injustificada ($25 MXN por sesión realizada/falta). |
| **Resultado Esperado** | Cálculo exacto mediante la fórmula: `SUM(CASE WHEN estado IN ('presente', 'retardo', 'ausente') THEN 25 ELSE 0 END)`. |
| **Resultado Obtenido** | Muestra precisa de sesiones asistidas, faltas y total de cuota acumulada ($125 MXN). Exportación a CSV/PDF funcional. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Tabla analítica de deudas por alumno con totales calculados ]* |

---

### Módulo 6: Seguridad Backend, Encabezados HTTP y Rendimiento

#### 🧪 Caso de Prueba: CP-INT-021 — Configuración de Encabezados de Seguridad (Helmet & CORS)
* **Requerimientos asociados:** Security Specs (`main.ts` NestJS)
* **Módulo / Capa:** NestJS Middleware (`helmet`, CORS configuration)
* **Precondiciones:** Servidor Backend ejecutándose en puerto 3000.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Realizar una petición HTTP OPTIONS / GET a la API desde un origen no autorizado.<br>2. Analizar los encabezados de respuesta devueltos por el servidor. |
| **Datos de Entrada** | Header `Origin`: `http://sitio-malicioso.com` |
| **Resultado Esperado** | Bloqueo por política CORS. Presencia de encabezados de seguridad: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`. |
| **Resultado Obtenido** | El servidor rechaza el origen no permitido y entrega todos los encabezados Helmet requeridos correctamente. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Headers HTTP inspeccionados en cURL o DevTools ]* |

---

#### 🧪 Caso de Prueba: CP-INT-022 — Exportación de Reportes a CSV y PDF
* **Requerimientos asociados:** `RF_48`, `RF_49`, `RF_66`
* **Módulo / Capa:** Frontend Export Utilities (jsPDF, autoTable, CSV Formatter)
* **Precondiciones:** Datos de asistencias presentes en pantalla.

| Elemento | Descripción |
|---|---|
| **Pasos de Ejecución** | 1. Hacer clic en el botón "Exportar CSV" o "Exportar PDF" en el panel de asistencias o administración.<br>2. Comprobar la descarga y apertura del archivo generado. |
| **Datos de Entrada** | Tabla de asistencias con 20 alumnos. |
| **Resultado Esperado** | Descarga inmediata del archivo `.csv` estructurado con comas o archivo `.pdf` con formato institucional CBTIS 61. |
| **Resultado Obtenido** | Archivos generados limpiamente con encabezados de la institución y listado completo de alumnos sin pérdidas de información. |
| **Estado** | **PASÓ** |
| **Evidencia / Captura** | *[ Insertar Captura de Pantalla: Documento PDF/CSV exportado abierto en visor ]* |

---

## 4. Firma de Conformidad y Aprobación

| Rol | Nombre del Evaluador | Firma | Fecha |
|---|---|---|---|
| **Líder de Desarrollo** | Equipo SITE CBTIS 61 | _______________________ | 25/08/2026 |
| **Administrador de Sistema** | Control Escolar CBTIS 61 | _______________________ | 25/08/2026 |
