# Plan de implementación — Recopilación y planeación de sistemas futuros (SIS)

> Fecha: 2026-11-24. Objetivo: convertir SIS en herramienta real de captura, priorización y planeación de sistemas futuros, no solo repositorio de información.

## 1. Problema actual

- El frontend muestra mucha información (entidades, docs, métricas) pero poca acción.
- No existe un flujo claro para capturar ideas de sistemas futuros.
- No hay priorización ni planeación de adopción/evolución.
- El roadmap es retrospectivo; falta prospectiva.

## 2. Objetivo funcional

Permitir a Andrei:
1. Capturar rápidamente ideas de sistemas futuros (inbox).
2. Clasificarlas (tipo, impacto, esfuerzo, dependencias).
3. Priorizarlas (backlog -> planificado -> en curso -> completado).
4. Vincularlas a entidades, misiones y métricas.
5. Planear capacidades/recursos necesarios.
6. Convertir ideas aprobadas en misiones/proyectos/tareas.

## 3. Módulo "Sistemas futuros"

### 3.1 Vista principal
- Kanban o lista por estado: Inbox, Evaluación, Planificado, En curso, Completado, Descartado.
- Filtros por entidad, tipo, impacto, esfuerzo.
- Búsqueda.

### 3.2 Captura rápida
- Botón global "Nueva idea" (modal).
- Campos mínimos: título, descripción, tipo, entidad, impacto, esfuerzo.
- Guardado inmediato (sin fricción).

### 3.3 Evaluación
- Matriz impacto vs esfuerzo.
- Dependencias (qué sistemas/entidades requiere).
- Riesgos y supuestos.

### 3.4 Planeación
- Convertir idea aprobada en misión/proyecto.
- Asignar fecha objetivo y métricas de éxito.
- Vincular a roadmap prospectivo.

### 3.5 Recopilación
- Importar ideas desde documentos/observaciones.
- Sugerencias por IA basadas en contexto.
- Etiquetado por procedencia.

## 4. Modelo de datos

Tabla `system_ideas`:
- id, title, description, idea_type, status
- entity_id, related_mission_id
- impact (1-5), effort (1-5)
- dependencies (jsonb), risks (text)
- provenance, source_url, source_observed_at
- created_at, updated_at

Estados: inbox, evaluating, planned, in_progress, completed, discarded.

## 5. Fases de implementación

### F1. Captura y lista (v1)
- Migración `system_ideas`.
- Vista con estados y CRUD básico.
- Home action "Sistemas futuros".
- Criterio: capturar idea en <10s.

### F2. Priorización
- Filtros y ordenamiento por impacto/esfuerzo.
- Matriz visual.
- Criterio: identificar top ideas rápidamente.

### F3. Conversión a ejecución
- Botón "Convertir a misión".
- Vinculación a misiones/proyectos.
- Criterio: idea aprobada genera misión verificable.

### F4. IA y recopilación
- Tool IA para sugerir ideas y evaluar.
- Importar desde documentos.
- Criterio: IA propone sin inventar.

### F5. Planeación de capacidad
- Estimación de recursos.
- Timeline de adopción.
- Criterio: plan visible por periodo.

## 6. Criterios de aceptación

- Captura rápida funciona en móvil.
- Estados y filtros claros.
- Conversión a misión verificable.
- IA respeta procedencia.
- Sin sobrecarga informativa: foco en acción.

## 7. Riesgos

- Riesgo: demasiadas ideas sin priorización. Mitigación: estados y filtros.
- Riesgo: duplicación con misiones. Mitigación: conversión explícita.
- Riesgo: sobrecarga de UI. Mitigación: vistas enfocadas en acción.
