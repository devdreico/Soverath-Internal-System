# Plan dedicado — IA de SIS y TOTP/MFA

> Fecha: 2026-11-24. Complementa PLAN_IMPLEMENTACION.md. Enfoque exclusivo: estabilidad, funciones y tools de IA; resolución de pendientes de TOTP/MFA.

## 1. Auditoría actual de la IA

### Fortalezas
- Endpoint único `/api/ai/chat` con validación de JWT, Founder y AAL2.
- Proveedor seleccionable: OpenRouter o Google AI Studio, con fallback por presencia de key.
- Allowlists de tablas/campos; sin SQL arbitrario ni service role.
- Propuestas de escritura en `private.ai_action_proposals`, vencimiento 10 min, consumo atómico y verificación de conflicto concurrente.
- Lectura paginada con `next_offset` y límite de 10.000 filas.
- UI con confirmación explícita, cancelación, expiración y conflicto.

### Brechas detectadas
- Sin rate limiting por sesión/usuario.
- Sin auditoría específica de lecturas/escrituras IA (solo genérica de app).
- Sin métricas de latencia, errores de proveedor ni cuota.
- Sin retry/backoff controlado ni circuit breaker ante fallos repetidos.
- Sin caché de consultas frecuentes ni invalidación tras escrituras.
- Sin tools para búsqueda híbrida, resumen por entidad/coordinadora ni métricas derivadas.
- Sin ingestión/análisis de binarios (decisión deliberada; requiere política).
- Sin pruebas automatizadas de AAL0/AAL1/AAL2, RLS, caducidad, repetición y conflicto.
- Sin evaluación de calidad (citas, abstención, tool calls correctos).
- Mensajes de error dependen del proveedor; falta telemetría estructurada.

## 2. Auditoría actual de TOTP/MFA

### Fortalezas
- Enrolamiento TOTP con QR y secreto manual.
- Challenge/verify y refresh de sesión.
- Verificación de AAL2 antes de entrar a la app y en cada llamada IA.
- Logout limpia estado.

### Brechas detectadas
- Sin códigos de recuperación de un solo uso.
- Sin procedimiento documentado de pérdida de Authenticator.
- Sin bloqueo/backoff visible tras intentos fallidos (depende de Supabase).
- Sin soporte a múltiples factores o re-enrolamiento seguro.
- Sin auditoría de eventos de MFA (enrolamiento, verificación, fallo).
- Sin expiración de sesión inactiva documentada.
- Sin verificación de estado MFA en `/api/health`.
- Sin pruebas de AAL0/AAL1/AAL2.

## 3. Objetivos del plan

1. Cerrar pendientes de TOTP/MFA antes de datos reales.
2. Mejorar estabilidad de IA (errores, límites, auditoría, observabilidad).
3. Ampliar funciones y tools de IA sin romper RLS/AAL2.
4. Añadir pruebas y evaluación de calidad.
5. Documentar operación y recuperación.

## 4. Fase T1 — TOTP/MFA (resolver faltante)

### T1.1 Recuperación
- Definir códigos de recuperación de un solo uso generados en enrolamiento.
- Guardar hashes en tabla privada o Supabase MFA recovery (si disponible).
- Documentar procedimiento de uso y regeneración.
- Criterio: Founder puede entrar con código de recuperación y el código queda invalidado.

### T1.2 Re-enrolamiento seguro
- Permitir revocar factor actual y enrolar nuevo solo con AAL2 previo.
- Registrar evento de revocación/enrolamiento.
- Criterio: no se puede re-enrolar sin segundo factor válido.

### T1.3 Auditoría MFA
- Registrar en `audit_events`: login, challenge, verify, fallo, logout, recovery use.
- No guardar códigos ni secretos.
- Criterio: cada evento MFA queda trazable con timestamp y user id.

### T1.4 Seguridad de sesión
- Definir timeout de inactividad y cierre automático.
- Documentar cierre de sesiones desde Supabase.
- Criterio: sesión inactiva se invalida según política.

### T1.5 Validación
- Pruebas: AAL0 no lee, AAL1 no lee/escribe, AAL2 OK.
- Prueba de factor inválido y código expirado.
- Criterio: matriz de autorización completa.

## 5. Fase I1 — Estabilidad de IA

### I1.1 Rate limiting
- Implementar límite por sesión Founder (ventana deslizante).
- Respuesta 429 con mensaje accionable.
- Criterio: exceso de solicitudes no tumba el endpoint.

### I1.2 Retry y resiliencia
- Retry controlado solo para errores transitorios (timeout, 5xx).
- Backoff exponencial con tope.
- No retry en 4xx ni propuestas.
- Criterio: fallos transitorios se recuperan sin duplicar escrituras.

### I1.3 Observabilidad
- Logging estructurado con request id, provider, modelo, latencia, status, error code.
- Redacción de tokens y contenido sensible.
- Métricas básicas: solicitudes, errores, propuestas creadas/ejecutadas/canceladas.
- Criterio: se puede diagnosticar un fallo sin exponer secretos.

### I1.4 Auditoría IA
- Registrar lecturas y escrituras IA en `audit_events` con actor, tabla y resumen.
- No guardar contenido completo ni binarios.
- Criterio: cada acción IA queda trazable.

### I1.5 Health
- Extender `/api/health` con estado de IA (provider configurado, modelo válido, último error opcional).
- Criterio: health reporta degradación de IA sin secretos.

## 6. Fase I2 — Funciones y tools de IA

### I2.1 Búsqueda híbrida
- Añadir tool `search_sis_context` sobre documentos y entidades.
- Priorizar por procedencia y fecha.
- Devolver citas (registro, fuente, fecha).
- Criterio: consulta sobre holding devuelve fuentes y no inventa.

### I2.2 Resúmenes por alcance
- Tool `summarize_scope` para holding o coordinadora.
- Incluir métricas, tareas bloqueadas, riesgos y cambios recientes.
- Criterio: resumen diferenciable por capa.

### I2.3 Métricas derivadas
- Tool `get_metric_summary` con definición, último valor, tendencia simple.
- Distinguir observado vs meta.
- Criterio: no presenta demo como real.

### I2.4 Propuestas avanzadas
- Permitir propuestas multi-campo con vista previa clara.
- Validar dependencias antes de proponer cambios.
- Criterio: propuesta inválida se rechaza antes de confirmar.

### I2.5 Herramientas de lectura de archivos (posterior)
- Solo metadatos y texto guardado; binarios no se envían a proveedores.
- OCR/ingestión solo tras política de privacidad y evaluación.
- Criterio: no se envían binarios sin aprobación explícita.

## 7. Fase I3 — Calidad y evaluación

### I3.1 Conjunto de evaluación
- Preguntas reales sobre estructura, historia, operaciones y métricas.
- Medir exactitud de citas, abstención ante datos faltantes, tool calls correctos.
- Criterio: métricas de calidad documentadas.

### I3.2 Pruebas de seguridad
- AAL0/AAL1/AAL2, RLS, caducidad/repetición, conflicto concurrente, cuota 429, proveedor no disponible.
- Criterio: suite automatizada pasa en CI.

### I3.3 Regresión
- Pruebas de propuestas create/update/delete.
- Pruebas de paginación y límites.
- Criterio: cambios no rompen flujos críticos.

## 8. Fase I4 — Implementación manual (TOTP/IA)

1. Configurar Supabase MFA y políticas de recuperación.
2. Generar y guardar códigos de recuperación fuera de la app.
3. Configurar proveedor IA y verificar cuotas.
4. Aplicar rate limiting y auditoría.
5. Ejecutar matriz de pruebas AAL0/AAL1/AAL2.
6. Validar propuestas con datos reales.
7. Revisar privacidad del proveedor antes de datos sensibles.

## 9. Criterios de cierre

- Founder inicia con contraseña + TOTP y puede recuperar acceso con código de un solo uso.
- IA respeta AAL2/RLS y registra auditoría.
- IA se abstiene cuando no hay evidencia y cita fuentes.
- Rate limiting y errores no bloquean operación normal.
- Suite de pruebas de seguridad pasa.
- Documentación de recuperación completa.

## 10. Riesgos

- Riesgo: pérdida de Authenticator sin recuperación. Mitigación: códigos de un solo uso antes de datos reales.
- Riesgo: cuota IA insuficiente. Mitigación: monitoreo y selección de modelo.
- Riesgo: exposición de datos a proveedor. Mitigación: solo texto permitido, sin binarios, revisión de privacidad.
- Riesgo: propuestas duplicadas. Mitigación: consumo atómico y verificación de conflicto.
