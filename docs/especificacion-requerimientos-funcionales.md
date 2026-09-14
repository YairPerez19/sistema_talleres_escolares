# Especificación de Requerimientos Funcionales (RF)
**Sistema Integral de Talleres Escolares - CBTis No. 61**

Este documento contiene la lista detallada y formalizada de los 87 Requerimientos Funcionales del sistema, estructurados conforme a la sintaxis del estándar **RF_02**.

---

## Estructura de Especificación

Cada requerimiento se define mediante:
1. **ID y Nombre/Descripción General**
2. **Cláusula Formal de Ejecución:** *"El Sistema debe permitir al [Actor/Usuario] [Acción], mediante:"*
3. **Parámetros / Entradas / Criterios:** Componentes técnicos, datos y reglas involucradas.
4. **Prioridad:** Alta, Media o Baja.

---

### Lista Detallada de Requerimientos Funcionales

#### RF_01: Autenticación con Correo y Contraseña
El sistema permite iniciar sesión con correo y contraseña.

El Sistema debe permitir al Usuario autenticarse en la plataforma, mediante:
- `usuario_correo`
- `usuario_contraseña`
- `validacion_credenciales`

**Prioridad:** Alta

---

#### RF_02: Reconocimiento Automático de Rol
Al iniciar sesión, el sistema reconoce automáticamente si el usuario es alumno, instructor o administrador.

El Sistema debe permitir al Usuario validar su rol, mediante:
- `usuario[DLAR10.1]_usuario`
- `usuario_contraseña`
- `usuario_tipo`

**Prioridad:** Alta

---

#### RF_03: Envío de Código de Verificación OTP
Si el usuario no ha confirmado su correo, se le envía un código de verificación.

El Sistema debe permitir al Usuario recibir un código de verificación, mediante:
- `usuario_estado_confirmacion`
- `envio_correo_otp`
- `generacion_codigo_verificacion`

**Prioridad:** Alta

---

#### RF_04: Seguridad y Caducidad del Código OTP
El código de verificación tiene 6 dígitos, se guarda de forma segura y caduca a los 10 minutos.

El Sistema debe permitir al Sistema gestionar la caducidad y seguridad del código, mediante:
- `codigo_longitud` (6 dígitos)
- `codigo_hash` (almacenamiento seguro)
- `tiempo_expiracion` (10 minutos)

**Prioridad:** Alta

---

#### RF_05: Control de Intentos y Reenvío de OTP
El usuario puede intentar validar su código hasta 5 veces, y debe esperar 60 segundos para pedir uno nuevo.

El Sistema debe permitir al Usuario gestionar sus intentos de validación y reenvío, mediante:
- `contador_intentos` (máximo 5 intentos)
- `temporizador_reenvio` (espera de 60 segundos)
- `validacion_limite_intentos`

**Prioridad:** Alta

---

#### RF_06: Inicio de Sesión Automático tras Verificación
Una vez validado el código, el sistema inicia la sesión automáticamente.

El Sistema debe permitir al Usuario acceder a la plataforma tras la verificación, mediante:
- `verificacion_codigo_exitosa`
- `generacion_tokens_sesion`
- `redireccion_pantalla_inicio`

**Prioridad:** Alta

---

#### RF_07: Registro Público de Estudiantes
Cualquier persona puede registrarse como estudiante con su nombre, correo, contraseña, matrícula y turno.

El Sistema debe permitir al Alumno registrar su cuenta institucional, mediante:
- `alumno_nombre`
- `alumno_correo`
- `alumno_contraseña`
- `alumno_matricula`
- `alumno_turno`

**Prioridad:** Alta

---

#### RF_08: Creación y Asignación de Instructores por Administrador
El administrador puede crear cuentas para instructores y asignarles un taller.

El Sistema debe permitir al Administrador registrar instructores, mediante:
- `instructor_datos_personales`
- `asignacion_rol`
- `asignacion_taller_id`

**Prioridad:** Alta

---

#### RF_09: Prevención de Correos Duplicados
El sistema evita que se registre dos veces el mismo correo.

El Sistema debe permitir al Sistema verificar la unicidad de cuentas, mediante:
- `verificacion_correo_existente`
- `restriccion_unicidad_base_datos`
- `mensaje_error_usuario`

**Prioridad:** Media

---

#### RF_10: Limpieza de Datos al Cerrar Sesión
Al cerrar sesión, se borra la información del usuario guardada en el dispositivo.

El Sistema debe permitir al Usuario cerrar su sesión de forma segura, mediante:
- `destruccion_tokens_autenticacion`
- `limpieza_almacenamiento_local`
- `redireccion_login`

**Prioridad:** Media

---

#### RF_11: Gestión de Roles de Usuario
El sistema maneja tres tipos de usuario: administrador, alumno e instructor.

El Sistema debe permitir al Sistema clasificar los privilegios y accesos, mediante:
- `rol_administrador`
- `rol_alumno`
- `rol_instructor`

**Prioridad:** Alta

---

#### RF_12: Control y Verificación de Permisos
El sistema verifica que cada usuario tenga permiso antes de dejarlo realizar una acción.

El Sistema debe permitir al Sistema validar las autorizaciones de ejecución, mediante:
- `verificacion_rol_actual`
- `evaluacion_politica_acceso`
- `bloqueo_accion_no_autorizada`

**Prioridad:** Alta

---

#### RF_13: Seguridad de Datos a Nivel de Base de Datos (RLS)
La base de datos limita qué información puede ver cada usuario según su rol.

El Sistema debe permitir a la Base de Datos restringir las consultas de información, mediante:
- `politicas_seguridad_nivel_fila` (RLS)
- `filtro_consultas_por_rol`
- `aislacion_datos_sensibles`

**Prioridad:** Alta

---

#### RF_14: Enrutamiento a Panel Correspondiente
Tras iniciar sesión, cada usuario es dirigido a su panel correspondiente.

El Sistema debe permitir al Usuario acceder a su dashboard según su perfil, mediante:
- `identificacion_rol_usuario`
- `ruta_panel_alumno`
- `ruta_panel_instructor`
- `ruta_panel_admin`

**Prioridad:** Alta

---

#### RF_15: Caché Temporal del Rol de Usuario
El rol del usuario se guarda temporalmente para que el sistema responda más rápido.

El Sistema debe permitir al Sistema optimizar el tiempo de respuesta en la validación de permisos, mediante:
- `cache_rol_cliente`
- `almacenamiento_sesion_jwt`
- `reduccion_consultas_repetitivas`

**Prioridad:** Media

---

#### RF_16: Visualización del Catálogo de Talleres
Se muestra la lista de talleres con nombre, categoría, lugar, instructor, cupo, imagen y horarios.

El Sistema debe permitir al Usuario consultar el catálogo completo de talleres, mediante:
- `taller_informacion_basica`
- `taller_ubicacion_e_instructor`
- `taller_cupo_e_imagen`
- `taller_horarios_asignados`

**Prioridad:** Alta

---

#### RF_17: Filtrado de Talleres por Categoría
Los talleres se pueden filtrar por categoría (cultural, cívica, deportiva matutina o vespertina).

El Sistema debe permitir al Usuario clasificar la oferta de talleres, mediante:
- `filtro_categoria_cultural`
- `filtro_categoria_civica`
- `filtro_categoria_deportiva_matutina`
- `filtro_categoria_deportiva_vespertina`

**Prioridad:** Media

---

#### RF_18: Búsqueda de Talleres por Nombre
Se puede buscar un taller escribiendo su nombre.

El Sistema debe permitir al Usuario localizar un taller en el catálogo, mediante:
- `campo_busqueda_texto`
- `coincidencias_nombre_taller`
- `actualizacion_lista_dinamica`

**Prioridad:** Media

---

#### RF_19: Filtrado por Cupo Disponible
Se puede filtrar para ver solo los talleres con cupo disponible.

El Sistema debe permitir al Usuario identificar talleres con vacantes, mediante:
- `selector_filtro_disponibilidad`
- `calculo_cupo_restante`
- `ocultamiento_talleres_llenos`

**Prioridad:** Media

---

#### RF_20: Paginación de Talleres (9 por Página)
Los talleres se muestran en páginas de 9 en 9.

El Sistema debe permitir al Usuario navegar por la lista segmentada de talleres, mediante:
- `limite_elementos_por_pagina` (9 talleres)
- `controles_paginacion`
- `calculo_total_paginas`

**Prioridad:** Media

---

#### RF_21: Vista Detallada de Taller
Se puede abrir una ventana con los detalles de cada taller.

El Sistema debe permitir al Usuario inspeccionar la ficha completa de un taller, mediante:
- `ventana_modal_detalle`
- `desglose_horarios_y_lugar`
- `informacion_instructor_y_requisitos`

**Prioridad:** Media

---

#### RF_22: Imagen Genérica de Fallback para Talleres
Si un taller no tiene imagen propia, se muestra una imagen genérica.

El Sistema debe permitir al Sistema asegurar la presentación visual de las tarjetas, mediante:
- `verificacion_existencia_imagen_url`
- `fallback_imagen_predeterminada`
- `renderizado_tarjeta_taller`

**Prioridad:** Baja

---

#### RF_23: Estructura de Categorías de Talleres
Los talleres están organizados en 4 categorías: Difusión Cultural, Actividades Cívicas, Deportiva Matutina y Deportiva Vespertina.

El Sistema debe permitir al Sistema organizar la estructura del catálogo, mediante:
- `categoria_difusion_cultural`
- `categoria_actividades_civicas`
- `categoria_deportiva_matutina`
- `categoria_deportiva_vespertina`

**Prioridad:** Alta

---

#### RF_24: Inscripción a Taller desde el Catálogo
El alumno puede inscribirse a un taller desde el catálogo.

El Sistema debe permitir al Alumno registrar su participación en un taller, mediante:
- `seleccion_taller_catalogo`
- `boton_inscripcion`
- `creacion_registro_inscripcion`

**Prioridad:** Alta

---

#### RF_25: Validación de Empalme de Horarios
El sistema evita que un alumno se inscriba a dos talleres con el mismo horario.

El Sistema debe permitir al Sistema validar la compatibilidad de horarios del alumno, mediante:
- `comparacion_horarios_talleres_inscritos`
- `deteccion_empalme_dia_y_horas`
- `rechazo_inscripcion_con_alerta`

**Prioridad:** Alta

---

#### RF_26: Validación de Cupo Disponible previo a Inscripción
Se verifica que el taller tenga cupo antes de permitir la inscripción.

El Sistema debe permitir al Sistema garantizar el límite de capacidad, mediante:
- `conteo_alumnos_inscritos_actuales`
- `comparacion_con_cupo_maximo`
- `restriccion_inscripcion_si_cupo_cero`

**Prioridad:** Alta

---

#### RF_27: Periodo de Inscripciones Vigente
Las inscripciones solo se permiten durante el periodo definido.

El Sistema debe permitir al Sistema controlar la ventana temporal de registro, mediante:
- `fecha_limite_inscripcion`
- `validacion_fecha_actual`
- `bloqueo_inscripcion_fuera_de_tiempo`

**Prioridad:** Alta

---

#### RF_28: Límite de Cambios de Taller (Máximo 3)
Cada alumno puede cambiar de taller como máximo 3 veces.

El Sistema debe permitir al Sistema controlar el saldo de cambios permitidos, mediante:
- `contador_cambios_restantes` (máximo 3)
- `decremento_por_baja_reinscripcion`
- `bloqueo_al_agotar_3_cambios`

**Prioridad:** Media

---

#### RF_29: Solicitud de Baja de Taller con Motivo
El alumno puede darse de baja de un taller indicando el motivo.

El Sistema debe permitir al Alumno solicitar el retiro de un taller, mediante:
- `formulario_baja_taller`
- `campo_motivo_baja`
- `eliminacion_o_desactivacion_inscripcion`

**Prioridad:** Alta

---

#### RF_30: Descuento de Cambios por Baja
Cada baja resta uno de los cambios disponibles del alumno.

El Sistema debe permitir al Sistema actualizar la cuota de cambios del alumno, mediante:
- `reduccion_cambios_restantes` (cambios - 1)
- `registro_historial_movimientos`
- `notificacion_al_alumno`

**Prioridad:** Media

---

#### RF_31: Protección de Eliminación de Talleres con Inscritos
No se puede eliminar un taller si aún tiene alumnos inscritos.

El Sistema debe permitir al Sistema proteger los datos de alumnos activos, mediante:
- `verificacion_inscritos_asociados`
- `restriccion_eliminacion_si_conteo_gt_zero`
- `aviso_al_administrador`

**Prioridad:** Alta

---

#### RF_32: Prevención de Inscripciones Duplicadas al Mismo Taller
Un alumno no puede inscribirse dos veces al mismo taller.

El Sistema debe permitir al Sistema evitar registros redundantes, mediante:
- `verificacion_inscripcion_previa`
- `rechazo_solicitud_duplicada`
- `mensaje_informativo`

**Prioridad:** Alta

---

#### RF_33: Consulta de Talleres Inscritos por Alumno
El alumno puede ver los talleres en los que está inscrito.

El Sistema debe permitir al Alumno revisar su lista de talleres activos, mediante:
- `consulta_inscripciones_alumno`
- `desglose_tarjetas_talleres_inscritos`
- `estado_inscripcion`

**Prioridad:** Alta

---

#### RF_34: Calendario Semanal de Horarios del Alumno
Se muestra un calendario semanal con sus talleres acomodados por día y hora.

El Sistema debe permitir al Alumno consultar su horario semanal consolidado, mediante:
- `vista_cuadricula_semanal`
- `ubicacion_bloques_horario`
- `detalle_taller_en_bloque`

**Prioridad:** Media

---

#### RF_35: Consulta de Historial de Asistencias por Alumno
El alumno puede consultar su historial de asistencias por taller.

El Sistema debe permitir al Alumno dar seguimiento a sus asistencias, mediante:
- `selector_taller_inscrito`
- `tabla_historial_fechas_y_estados`
- `resumen_porcentaje_asistencia`

**Prioridad:** Media

---

#### RF_36: Cálculo de Adeudo por Sesiones Tomadas
El alumno puede ver cuánto debe pagar según las sesiones tomadas.

El Sistema debe permitir al Alumno conocer el monto a cubrir por sus asistencias, mediante:
- `conteo_sesiones_asistidas`
- `costo_configurado_por_sesion`
- `calculo_monto_total_deuda`

**Prioridad:** Media

---

#### RF_37: Indicador de Cambios Restantes
El alumno puede ver cuántos cambios de taller le quedan.

El Sistema debe permitir al Alumno consultar su contador de cambios disponibles, mediante:
- `indicador_cambios_restantes`
- `visualizacion_en_perfil_y_panel`

**Prioridad:** Baja

---

#### RF_38: Proceso de Baja desde el Panel del Alumno
El alumno puede darse de baja desde su panel.

El Sistema debe permitir al Alumno ejecutar la baja directa de un taller, mediante:
- `boton_baja_panel_alumno`
- `confirmacion_y_motivo`
- `procesamiento_solicitud`

**Prioridad:** Alta

---

#### RF_39: Configuración del Costo por Sesión
El costo por sesión se puede ajustar desde la configuración del sistema.

El Sistema debe permitir al Administrador modificar la tarifa aplicable por sesión, mediante:
- `clave_configuracion_costo`
- `campo_monto_monetario`
- `recalculo_automatico_deudas`

**Prioridad:** Media

---

#### RF_40: Dashboard del Instructor y Carga de Alumnos
El instructor ve los talleres asignados y cuántos alumnos tiene cada uno.

El Sistema debe permitir al Instructor consultar los talleres a su cargo y su matrícula, mediante:
- `lista_talleres_por_instructor_id`
- `conteo_alumnos_inscritos_por_taller`
- `resumen_horarios`

**Prioridad:** Alta

---

#### RF_41: Captura de Pase de Lista por Instructor
El instructor pasa lista marcando presente, ausente, retardo o justificado.

El Sistema debe permitir al Instructor registrar el estatus de asistencia diario, mediante:
- `seleccion_taller_y_fecha`
- `opciones_asistencia` (presente, ausente, retardo, justificado)
- `guardado_registro_asistencia`

**Prioridad:** Alta

---

#### RF_42: Consulta y Edición de Asistencias Anteriores
El instructor puede consultar y editar la asistencia de días anteriores.

El Sistema debe permitir al Instructor rectificar registros de fechas pasadas, mediante:
- `selector_fecha_anterior`
- `carga_asistencias_existentes`
- `edicion_y_actualizacion_registros`

**Prioridad:** Media

---

#### RF_43: Filtrado de Alumnos por Estado de Asistencia
El instructor puede filtrar alumnos según su estado de asistencia.

El Sistema debe permitir al Instructor filtrar la lista del grupo por estatus, mediante:
- `botones_filtro_estado`
- `filtrado_dinamico_tabla_alumnos`

**Prioridad:** Media

---

#### RF_44: Registro de Observaciones Individuales por Alumno
El instructor puede agregar observaciones sobre un alumno.

El Sistema debe permitir al Instructor redactar anotaciones específicas por estudiante, mediante:
- `campo_observaciones_alumno`
- `limite_texto` (hasta 500 caracteres)
- `guardado_junto_con_asistencia`

**Prioridad:** Baja

---

#### RF_45: Marcación Rápida "Todos Presentes"
El instructor puede marcar a todo el grupo como presente con un clic.

El Sistema debe permitir al Instructor agilizar la captura de asistencia, mediante:
- `accion_marcar_todos_presentes`
- `asignacion_masiva_estado_presente`
- `actualizacion_interfaz`

**Prioridad:** Baja

---

#### RF_46: Resumen Semanal de Asistencia para Instructor
El instructor ve un resumen de asistencia de los últimos 7 días.

El Sistema debe permitir al Instructor evaluar la asistencia reciente de sus talleres, mediante:
- `periodo_ultimos_7_dias`
- `desglose_conteo_presentes_faltas`
- `vista_resumen_dashboard`

**Prioridad:** Media

---

#### RF_47: Estadísticas Individuales del Alumno
El instructor consulta estadísticas individuales de cada alumno.

El Sistema debe permitir al Instructor analizar la constancia de cada estudiante, mediante:
- `seleccion_alumno`
- `porcentaje_asistencia_total`
- `desglose_retardos_y_justificaciones`

**Prioridad:** Media

---

#### RF_48: Exportación de Asistencia a Excel / CSV
El instructor puede descargar la lista de asistencia en Excel/CSV.

El Sistema debe permitir al Instructor exportar los registros de asistencia en formato editable, mediante:
- `generador_archivo_csv_excel`
- `estructura_columnas_asistencia`
- `descarga_directa_navegador`

**Prioridad:** Media

---

#### RF_49: Exportación de Reporte de Asistencia a PDF
El instructor puede descargar la lista de asistencia en PDF.

El Sistema debe permitir al Instructor emitir listas de asistencia en formato imprimible oficial, mediante:
- `generacion_documento_pdf`
- `encabezado_institucional_cbtis61`
- `descarga_o_impresion_directa`

**Prioridad:** Media

---

#### RF_50: Actualización Reactiva de Asistencias (Sin Recarga)
La información de asistencia se actualiza automáticamente sin recargar la página.

El Sistema debe permitir al Sistema mantener la interfaz de asistencia sincronizada, mediante:
- `suscripcion_tiempo_real_o_estado_reactivo`
- `actualizacion_dom_sin_refresh`

**Prioridad:** Alta

---

#### RF_51: Alta de Talleres por Administrador
El administrador crea talleres nuevos con toda su información.

El Sistema debe permitir al Administrador registrar nuevos talleres en el sistema, mediante:
- `formulario_taller` (nombre, categoría, lugar, cupo, descripción, imagen)
- `asignacion_instructor`
- `alta_en_base_de_datos`

**Prioridad:** Alta

---

#### RF_52: Modificación de Talleres por Administrador
El administrador puede editar un taller existente.

El Sistema debe permitir al Administrador actualizar los datos de los talleres creados, mediante:
- `seleccion_taller_edicion`
- `actualizacion_campos_permitidos`
- `guardado_cambios_base_datos`

**Prioridad:** Alta

---

#### RF_53: Bajas de Talleres Vacantes por Administrador
El administrador puede eliminar un taller si no tiene inscritos.

El Sistema debe permitir al Administrador suprimir un taller sin alumnos registrados, mediante:
- `verificacion_cero_inscritos`
- `confirmacion_eliminacion`
- `borrado_registro_taller`

**Prioridad:** Alta

---

#### RF_54: Gestión de Horarios de Talleres por Administrador
El administrador puede modificar los horarios de cada taller.

El Sistema debe permitir al Administrador configurar la agenda de cada taller, mediante:
- `seleccion_dias_semana`
- `definicion_hora_inicio_y_hora_fin`
- `actualizacion_tabla_horarios`

**Prioridad:** Alta

---

#### RF_55: Validación de Reducción de Cupo Mínimo
El cupo de un taller no puede ser menor a los alumnos ya inscritos.

El Sistema debe permitir al Sistema proteger el espacio de los alumnos ya registrados, mediante:
- `calculo_inscritos_actuales`
- `validacion_nuevo_cupo` (nuevo_cupo >= inscritos_actuales)
- `rechazo_si_es_inferior`

**Prioridad:** Alta

---

#### RF_56: Gestión de Imágenes de Talleres
El administrador puede subir imágenes para los talleres.

El Sistema debe permitir al Administrador cargar contenido visual para las portadas, mediante:
- `selector_archivo_imagen`
- `carga_a_almacenamiento` (Supabase Storage)
- `vinculacion_url_taller`

**Prioridad:** Media

---

#### RF_57: Generación de Descripciones con Inteligencia Artificial
El sistema puede generar automáticamente la descripción de un taller usando inteligencia artificial.

El Sistema debe permitir al Administrador autogenerar textos descriptivos asistidos por IA, mediante:
- `boton_generar_ia`
- `parametros_taller` (nombre, categoría)
- `servicio_ia_y_llenado_campo`

**Prioridad:** Baja

---

#### RF_58: Registro y Vinculación de Instructores por Administrador
El administrador puede registrar un instructor y asignarlo a un taller.

El Sistema debe permitir al Administrador crear cuentas docentes y vincularlas a un taller, mediante:
- `alta_usuario_instructor`
- `asignacion_taller_id`
- `actualizacion_relacion_instructor`

**Prioridad:** Alta

---

#### RF_59: Consulta de Asistencia Global con Filtros Avanzados
El administrador puede consultar asistencias de todos los talleres con filtros.

El Sistema debe permitir al Administrador auditar las asistencias de cualquier taller, mediante:
- `filtro_por_taller`
- `filtro_por_rango_fechas`
- `tabla_asistencias_generales`

**Prioridad:** Media

---

#### RF_60: Indicadores Clave en Dashboard Administrativo
El panel muestra estadísticas generales de sesiones, talleres activos y promedio de asistencia.

El Sistema debe permitir al Administrador monitorear el desempeño global del programa, mediante:
- `total_sesiones_impartidas`
- `total_talleres_activos`
- `promedio_porcentaje_asistencia_global`

**Prioridad:** Media

---

#### RF_61: Gráfica de Proporción de Estatus de Asistencia
Se muestra una gráfica con la proporción de presentes, ausentes, retardos y justificados.

El Sistema debe permitir al Administrador analizar visualmente la distribución de asistencias, mediante:
- `grafica_donas_o_pastel`
- `calculo_porcentajes_por_estado`
- `leyenda_y_tooltips_interactivos`

**Prioridad:** Media

---

#### RF_62: Gráfica de Tendencia Semanal de Asistencia
Se muestra una gráfica de asistencia día por día en la última semana.

El Sistema debe permitir al Administrador dar seguimiento a la afluencia diaria, mediante:
- `grafica_lineas_o_barras`
- `eje_tiempo_ultimos_7_dias`
- `conteo_asistencias_por_dia`

**Prioridad:** Media

---

#### RF_63: Ranking Top 5 Talleres más Concurridos
Se muestra un listado de los 5 talleres con más registros.

El Sistema debe permitir al Administrador identificar la oferta de mayor demanda, mediante:
- `ordenamiento_talleres_por_numero_inscritos`
- `limite_top_5`
- `despliegue_en_dashboard`

**Prioridad:** Baja

---

#### RF_64: Listado de Alumnos en Riesgo por Inasistencia
Se muestra un listado de los alumnos con más faltas.

El Sistema debe permitir al Administrador detectar estudiantes con inasistencia crítica, mediante:
- `conteo_faltas_por_alumno`
- `orden_descendente`
- `tabla_alumnos_inasistencias`

**Prioridad:** Media

---

#### RF_65: Bitácora Visual de Movimientos Recientes
Se muestra un historial con los últimos 6 movimientos del sistema.

El Sistema debe permitir al Administrador consultar la actividad reciente de la plataforma, mediante:
- `consulta_audit_log` (últimos 6 eventos)
- `descripcion_accion_y_usuario`
- `marca_de_tiempo`

**Prioridad:** Baja

---

#### RF_66: Exportación Consolidada de Asistencia por Administrador
El administrador puede descargar un reporte de asistencia en Excel/CSV.

El Sistema debe permitir al Administrador emitir reportes institucionales consolidados, mediante:
- `seleccion_filtros_exportacion`
- `generacion_csv_excel_general`
- `descarga_de_archivo`

**Prioridad:** Media

---

#### RF_67: Registro Auditado de Acciones Administrativas
El sistema guarda un registro de las acciones de los administradores para control interno.

El Sistema debe permitir al Sistema registrar trazas de auditoría de operaciones clave, mediante:
- `captura_evento` (creación, modificación, eliminación)
- `registro_en_audit_log`
- `inmutabilidad_de_bitacora`

**Prioridad:** Alta

---

#### RF_68: Gestión de Configuraciones del Sistema por Administrador
El administrador puede modificar configuraciones generales, como el costo por sesión.

El Sistema debe permitir al Administrador cambiar parámetros operacionales globales, mediante:
- `panel_configuracion_sistema`
- `actualizacion_tabla_settings`
- `aplicacion_inmediata`

**Prioridad:** Media

---

#### RF_69: Restricción de Único Registro Diario por Alumno y Taller
Se registra una sola asistencia por alumno, taller y fecha.

El Sistema debe permitir al Sistema evitar duplicidad de registros en la misma jornada, mediante:
- `clave_unica_compuesta` (alumno_id + taller_id + fecha)
- `prevencion_duplicados_en_db`

**Prioridad:** Alta

---

#### RF_70: Categorización de Estatus de Asistencia
La asistencia puede marcarse como presente, ausente, retardo o justificado.

El Sistema debe permitir a los Instructores categorizar la presencia según los estatus normativos, mediante:
- `estado_presente`
- `estado_ausente`
- `estado_retardo`
- `estado_justificado`

**Prioridad:** Alta

---

#### RF_71: Longitud Máxima en Observaciones de Asistencia
Se pueden agregar observaciones de hasta 500 caracteres.

El Sistema debe permitir ingresar anotaciones delimitadas en el pase de lista, mediante:
- `campo_texto_observaciones`
- `validacion_longitud_maxima_500`

**Prioridad:** Baja

---

#### RF_72: Estampado Automático de Hora de Registro
La hora del registro se guarda automáticamente.

El Sistema debe permitir al Sistema registrar el instante exacto de la toma de asistencia, mediante:
- `timestamp_sistema_hora_actual`
- `campo_hora_asistencias`

**Prioridad:** Media

---

#### RF_73: Actualización Incremental de Registros de Asistencia (UPSERT)
Si ya existe un registro para esa fecha, se actualiza en vez de duplicarse.

El Sistema debe permitir al Sistema modificar la asistencia previamente tomada sin duplicar filas, mediante:
- `deteccion_registro_previo`
- `actualizacion_campos` (estado, observaciones, hora)

**Prioridad:** Media

---

#### RF_74: Generación de Sábana Completa de Asistencias
El sistema genera la lista completa de asistencia de un taller.

El Sistema debe permitir a los Usuarios autorizados consultar la matriz histórica de asistencia del grupo, mediante:
- `agrupacion_alumnos_por_taller`
- `cruce_con_fechas_sesiones`
- `renderizado_matriz_asistencia`

**Prioridad:** Alta

---

#### RF_75: Autoconsulta de Asistencia del Alumno
El alumno puede consultar su propio historial de asistencia.

El Sistema debe permitir al Alumno verificar sus propias asistencias grabadas, mediante:
- `filtro_alumno_id_actual`
- `desglose_asistencias_por_fecha`

**Prioridad:** Media

---

#### RF_76: Consolidación de Estadísticas Administrativas
El sistema genera estadísticas generales para administración.

El Sistema debe permitir a los Administradores analizar el rendimiento y efectividad de talleres, mediante:
- `agregacion_datos_asistencia`
- `agregacion_datos_inscripcion`
- `metricas_de_rendimiento`

**Prioridad:** Media

---

#### RF_77: Cálculo Automatizado de Deuda Escolar por Alumno
El sistema calcula automáticamente la deuda de cada alumno.

El Sistema debe permitir al Sistema mantener actualizado el adeudo por talleres, mediante:
- `conteo_asistencias_validas`
- `multiplicacion_por_costo_sesion`
- `vista_deuda_alumnos`

**Prioridad:** Media

---

#### RF_78: Sincronización en Tiempo Real de Asistencias
La asistencia se actualiza en tiempo real para instructores y administradores.

El Sistema debe permitir al Sistema reflejar de inmediato cualquier cambio de asistencia, mediante:
- `eventos_tiempo_real_o_refresco_automatico`
- `reflejo_inmediato_en_pantallas`

**Prioridad:** Alta

---

#### RF_79: Cuestionario Vocacional / Intereses del Alumno
El sistema incluye un cuestionario de 3 preguntas sobre los intereses del alumno.

El Sistema debe permitir al Alumno completar una encuesta breve de preferencia, mediante:
- `preguntas_opcion_multiple` (3 preguntas)
- `captura_preferencias`

**Prioridad:** Baja

---

#### RF_80: Motor de Recomendación Inteligente de Talleres
Según las respuestas, el sistema recomienda un taller acorde a sus intereses.

El Sistema debe permitir al Sistema asociar las preferencias del alumno con los talleres ideales, mediante:
- `evaluacion_respuestas_cuestionario`
- `matcheo_con_categorias_talleres`
- `resultado_taller_sugerido`

**Prioridad:** Baja

---

#### RF_81: Interfaz Conversacional (Chatbot) de Recomendación
El alumno interactúa con un asistente tipo chat que muestra la recomendación.

El Sistema debe permitir al Alumno recibir la recomendación a través de un chatbot interactivo, mediante:
- `interfaz_chat_interactivo`
- `desplegado_mensaje_recomendacion`

**Prioridad:** Baja

---

#### RF_82: Consulta de Perfil de Usuario
El usuario puede consultar la información de su propio perfil.

El Sistema debe permitir al Usuario revisar sus datos guardados en el sistema, mediante:
- `lectura_tabla_profiles`
- `despliegue_nombre_correo_matricula_turno`

**Prioridad:** Media

---

#### RF_83: Edición de Datos Personales del Perfil
El usuario puede editar su nombre, matrícula y turno.

El Sistema debe permitir al Usuario corregir o actualizar sus datos principales, mediante:
- `formulario_edicion_perfil`
- `validacion_y_guardado_profiles`

**Prioridad:** Media

---

#### RF_84: Consulta de Configuraciones del Sistema
El sistema permite consultar las configuraciones generales.

El Sistema debe permitir a los Usuarios autorizados leer las reglas globales operativas, mediante:
- `consulta_settings`
- `visualizacion_parametros_activos`

**Prioridad:** Media

---

#### RF_85: Edición de Parámetros Globales por Administrador
El administrador puede modificar las configuraciones generales.

El Sistema debe permitir al Administrador ajustar las reglas de la plataforma, mediante:
- `formulario_settings`
- `actualizacion_base_datos`

**Prioridad:** Media

---

#### RF_86: Servicio de Envío de OTP por Correo Electrónico
El sistema envía los códigos de verificación por correo.

El Sistema debe permitir al Sistema despachar códigos de verificación al correo del usuario, mediante:
- `servicio_envio_correo` (Resend API)
- `plantilla_correo_codigo`

**Prioridad:** Alta

---

#### RF_87: Tolerancia a Fallos y Resguardo en Almacenamiento Local/Logs
Si el correo no está configurado, el sistema guarda la información como respaldo.

El Sistema debe permitir al Sistema garantizar la continuidad operativa ante falta de servidor SMTP, mediante:
- `deteccion_falta_proveedor_correo`
- `registro_respaldo_en_base_datos_o_logs`

**Prioridad:** Media
