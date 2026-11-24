# Plan de implementación — Frontend, UX y Roadmap (SIS)

> Fecha: 2026-11-24. Enfoque: mobile first, semántica, navegación directa y nueva sección Roadmap.

## 1. Objetivos

- Convertir el inicio en un centro de acción directa: botones a Galería, Entidades, Documentos y Objetivos.
- Añadir sección "Roadmap": línea de tiempo que combina objetivos cumplidos y "GOALS" (cúmulos de tareas completadas) como nodos de un pipeline.
- Mejorar semántica HTML y desplazamiento funcional (scroll, foco, teclado) en todas las secciones.
- Hacer el sistema mobile first sin perder desktop.

## 2. Home (inicio)

### 2.1 Acciones directas
- Tarjetas/botones grandes con icono y descripción corta:
  - Entidades (network)
  - Documentos (knowledge)
  - Galería (gallery)
  - Objetivos y tareas (missions)
  - Roadmap (roadmap)
  - Asistente AI (ai_assistant)
- Estados: activo, pendiente, vacío.
- En móvil: grid 2 columnas; en desktop: fila o grid 3-4.

### 2.2 Resumen mínimo
- Mantener "lo que está abierto" pero secundario.
- Evitar métricas pesadas en el primer pantallazo.

## 3. Nueva sección Roadmap

### 3.1 Concepto
- Roadmap = línea de tiempo de hitos.
- Dos tipos de nodo:
  - Objetivo cumplido (misión/proyecto con estado completed)
  - GOAL (cúmulo de tareas completadas agrupadas por misión/proyecto/periodo)
- Cada nodo muestra: título, fecha, estado, entidades vinculadas, progreso y enlace a origen.

### 3.2 Modelo de datos
- Opción A (recomendada): derivar roadmap desde missions/projects/tasks existentes (sin nueva tabla) para v1.
- Opción B (posterior): tabla `roadmap_nodes` con tipo, título, fecha, estado, origen, metadata.
- v1 deriva automáticamente; v2 permite curación manual.

### 3.3 Pipeline visual
- Línea vertical en móvil, horizontal en desktop.
- Nodos con estado: completed, in_progress, planned, blocked.
- Filtros por coordinadora/entidad y por tipo de nodo.

## 4. Semántica y desplazamiento funcional

### 4.1 Semántica HTML
- Usar `<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<aside>` correctamente.
- Headings jerárquicos (h1 por vista, h2 secciones, h3 subsecciones).
- Labels y `aria-*` en controles.
- Tablas con `<table>` real donde aplique.

### 4.2 Desplazamiento
- Scroll contenedor único con `overflow-y: auto`.
- Evitar scroll anidado problemático en modales.
- Restaurar foco al cerrar modal.
- Sticky header/topbar en móvil.
- Paginación/infinite scroll para listas largas.

### 4.3 Accesibilidad
- Navegación por teclado completa.
- Focus visible.
- Contraste AA.
- Reducción de movimiento respetada.

## 5. Mobile first

- Breakpoints: 360, 768, 1024, 1280.
- Sidebar colapsable en móvil (drawer).
- Topbar compacta.
- Modales full-screen en móvil.
- Touch targets mínimo 44px.
- Gestos básicos (swipe para cerrar drawer).

## 6. Fases de implementación

### F1. Home de acción
- Añadir grid de acciones directas.
- Reordenar home para priorizar acciones.
- Criterio: desde home se llega a cada sección en un clic.

### F2. Roadmap derivado
- Crear vista `roadmap` en `View`.
- Derivar nodos desde missions/tasks/projects.
- Renderizar línea de tiempo.
- Criterio: misiones completadas aparecen como hitos.

### F3. Semántica y scroll
- Refactor de wrappers y headings.
- Ajuste de scroll containers.
- Criterio: sin scroll horizontal inesperado en móvil.

### F4. Navegación móvil
- Drawer sidebar.
- Modales full-screen.
- Criterio: usable en 360px.

### F5. Roadmap curado (v2)
- Migración `roadmap_nodes` y CRUD.
- Criterio: Founder puede añadir/editar hitos manualmente.

## 7. Cambios de datos (v2)

- Tabla `roadmap_nodes` (id, node_type, title, description, status, occurred_on, entity_id, mission_id, project_id, provenance, source_url, created_at, updated_at).
- RLS Founder/AAL2.
- Importación idempotente.

## 8. Criterios de aceptación

- Home muestra botones directos a Galería, Entidades, Documentos, Objetivos, Roadmap y Asistente.
- Roadmap muestra hitos derivados y permite filtrar.
- Semántica HTML válida y navegación por teclado.
- Sin scroll horizontal en móvil (360px).
- Drawer y modales funcionan en móvil.
- Acciones directas no rompen estado ni carga de datos.

## 9. Riesgos

- Riesgo: roadmap derivado puede ser ruidoso. Mitigación: filtros y curación manual v2.
- Riesgo: refactor de scroll rompe modales. Mitigación: pruebas en móvil.
- Riesgo: sobrecarga visual en home. Mitigación: acciones compactas y resumen secundario.
