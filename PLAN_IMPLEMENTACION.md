# Plan de implementación y estabilización — SIS

> Fecha: 2026-11-24. Complementa `PLAN_MAESTRO.md`. Orden: automatizable primero, manual al final. Frontend se trata en la fase final.

## 0. Principios de ejecución

- No convertir observaciones públicas ni datos demo en hechos operativos sin confirmación de Founder.
- Cambios aditivos e idempotentes; importar sin sobrescribir ediciones del Founder.
- Automatizar validaciones antes de tocar datos reales.
- Mantener RLS/AAL2 como invariantes; ninguna automatización debe usar service role en el navegador.

## 1. Mapeo de los 6 puntos faltantes

| # | Brecha | Automatizable por código | Manual obligatorio |
|---|---|---|---|
| 1 | Migraciones no aplicadas en Supabase real | Scripts de verificación y checklist | Aplicar 0001/0002/0003 en orden |
| 2 | Cuenta Founder sin enrolar / registro público | Validaciones de auth y rutas | Crear usuario, TOTP, desactivar signup |
| 3 | Variables de entorno no configuradas | Endpoint de salud sin secretos | Cargar env vars en Vercel/Supabase |
| 4 | Catálogo base no importado | Dry-run de importación y validación de seed | Ejecutar "Completar catálogo"/"Importar base" |
| 5 | IA no validada con datos reales | Pruebas de endpoint y propuestas | Configurar keys, cuotas y privacidad |
| 6 | Fases funcionales pendientes | Tests, scaffolding y contratos | Confirmación organizacional con Founder |

## 2. Fase A — Automatizable ahora (código)

### A1. Tooling y calidad base
- Agregar scripts en `package.json`: `lint`, `typecheck`, `test`, `test:e2e`.
- Agregar CI en `.github/workflows/ci.yml`: install, typecheck, build, tests.
- Extraer funciones puras críticas (`normalizeAction`, `slugify`, `stableJson`, `money`) a `lib/` para test unitario.
- Criterio: `npm run build` y `npm run typecheck` pasan en CI.

### A2. Observabilidad sin secretos
- Crear `app/api/health/route.ts` que reporte:
  - presencia de env vars requeridas (booleanos, nunca valores),
  - conectividad Supabase (consulta liviana),
  - versión del commit si está disponible.
- Agregar logging estructurado en servidor con redacción de tokens.
- Criterio: `GET /api/health` devuelve 200 en producción y no expone secretos.

### A3. Verificación de migraciones y RLS
- Crear script `scripts/verify-supabase.mjs` que consulte:
  - existencia de tablas base, file workspaces y propuestas,
  - RLS habilitado,
  - políticas del Founder,
  - bucket privado.
- Documentar salida esperada en `docs/VALIDACION_SUPABASE.md`.
- Criterio: script falla si falta una tabla/política crítica.

### A4. Importación idempotente con vista previa
- Agregar modo dry-run a la importación: calcular qué entidades/relaciones/documentos se agregarían sin escribir.
- Mostrar resumen por tipo y `seed_key`.
- Validar unicidad de `seed_key` y campos de procedencia antes de importar.
- Criterio: Founder puede revisar el diff antes de confirmar.

### A5. Endurecimiento del asistente IA
- Agregar rate limiting por sesión Founder (ventana deslizante, in-memory o tabla).
- Registrar auditoría de lecturas/escrituras IA (sin contenido sensible completo).
- Manejar errores de proveedor con mensajes accionables y sin filtrar payload.
- Agregar pruebas para propuestas caducadas, repetidas y conflicto concurrente.
- Criterio: una propuesta expirada no se ejecuta y devuelve error claro.

### A6. Backup y recuperación
- Mantener exportación JSON; agregar exportación programada documentada (cron externo) y verificación de integridad.
- Documentar restauración manual paso a paso.
- Criterio: backup JSON se puede importar en staging sin sobrescribir datos existentes.

### A7. Recuperación de acceso
- Documentar códigos de recuperación de un solo uso y procedimiento en Supabase bajo control exclusivo de Founder.
- Agregar checklist de pérdida de Authenticator.
- Criterio: procedimiento probado en staging antes de datos reales.

## 3. Fase B — Estabilización funcional

### B1. Modelo de ejecución completo
- Completar dependencias de tareas, relación misión-proyecto-entidad, responsables, criterios de terminado.
- Plantillas de misión/proyecto por tipo de operación.
- Criterio: una tarea bloqueada no puede marcarse como hecha sin resolver dependencia.

### B2. Operación financiera avanzada
- Definir primero con Founder el modelo de líneas, lotes, recetas y ubicaciones.
- Implementar líneas múltiples por movimiento, adjuntos por evento y conciliación.
- Distinguir saldo registrado, conciliado, comprometido, proyectado y observado.
- Criterio: una transferencia resta en origen y suma en destino; saldos derivados de eventos.

### B3. Búsqueda y conocimiento con evidencia
- Evolucionar a búsqueda híbrida sobre documentos y entidades.
- Incluir citas a registro, fuente y fecha.
- Señalar evidencia insuficiente y abstenerse cuando falte.
- Criterio: una consulta sobre holding devuelve procedencia y fecha, no inventa.

### B4. Métricas y ritmo de dirección
- Vista inicial con prioridades de hoy, tareas vencidas/bloqueadas, decisiones pendientes, riesgos y cambios recientes.
- Revisión semanal por coordinadora y bitácora de decisiones.
- Criterio: cada KPI tiene definición, propietario, unidad, frecuencia, fuente, periodo y procedencia.

## 4. Fase C — Manual al final (operación)

1. Crear/provisionar proyecto Supabase dedicado para SIS.
2. Configurar Auth: usuario Founder, contraseña fuerte, TOTP obligatorio, signup desactivado, Site URL y redirect.
3. Aplicar migraciones en orden: 0001, 0002, 0003.
4. Configurar Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_FOUNDER_USER_ID` / `SIS_FOUNDER_USER_ID`
   - `AI_PROVIDER`, `OPENROUTER_API_KEY` o `GOOGLE_AI_STUDIO_API_KEY`, modelos.
5. Verificar `/api/health` y login con AAL2.
6. Ejecutar importación del catálogo base y revisar diff.
7. Configurar cuotas/privacidad del proveedor IA y probar propuestas.
8. Validar storage privado (anónimo/AAL1/AAL2).
9. Definir recuperación de Authenticator.
10. Confirmar dominio canónico `https://ss.presentto.online` y SSO/protection.

## 5. Fase D — Frontend (después)

- Sistema visual monocromático, Montserrat, logo Soverath.
- Mapa de red con jerarquía, búsqueda global, estados, métricas.
- Espacio por entidad: resumen, estrategia, servicios, sistemas, documentos, métricas, misiones, operación, historial.
- Bibliotecas: galería, documentos, AI concepts, configuración.
- Asistente IA con confirmación explícita de propuestas.
- Adaptación desktop/móvil y navegación por teclado.
- Ritmo diario/semanal y cockpit de dirección.

## 6. Criterios de aceptación globales

- Sin sesión o sin AAL2 no se puede leer ni cambiar nada.
- Ediciones confirmadas persisten en Supabase y versiones restauran texto previo.
- Eventos operativos actualizan vistas derivadas y transferencias mueven saldos correctamente.
- Observación pública y hecho confirmado se distinguen visualmente.
- Importaciones son idempotentes y no sobrescriben texto editado por Founder.
- IA respeta RLS, muestra propuestas y no ejecuta sin confirmación.

## 7. Riesgos y mitigaciones

- Riesgo: migraciones aplicadas fuera de orden. Mitigación: script de verificación y checklist.
- Riesgo: exposición de secretos. Mitigación: solo env vars de servidor, health sin valores.
- Riesgo: cuota IA insuficiente. Mitigación: elegir proveedor/modelo y monitorear 429.
- Riesgo: pérdida de Authenticator. Mitigación: códigos de recuperación antes de datos reales.
- Riesgo: datos demo tomados como reales. Mitigación: procedencia obligatoria y filtros en vistas.

## 8. Orden recomendado de ejecución

1. Fase A (código y validaciones).
2. Fase B (estabilización funcional).
3. Fase C (operación manual).
4. Fase D (frontend y UX final).
