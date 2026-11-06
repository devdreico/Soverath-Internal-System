# SIS — Plan maestro

> Revisión 3 · 4 de noviembre de 2026. Se conserva la decisión de aplicación web privada con Vercel y Supabase. Esta revisión incorpora la primera base de aplicación y el inventario público reconciliado.

## Propósito

SIS es el centro de mando personal de Andrei / Founder para orquestar Soverath y sus proyectos. Debe ampliar la capacidad de una sola persona para entender la red, recordar contexto, decidir, ejecutar y registrar lo que ocurre. Es una herramienta interna de coordinación y conocimiento; no es un portal público ni un sistema de acceso para empleados.

La pantalla inicial será el mapa de la red. La navegación conserva la proporción solicitada: barra izquierda cercana al 20% del ancho y espacio de trabajo cercano al 80%. Diseño blanco y negro, logo de `assets/soverath-logo.png`, Montserrat y nombre de perfil `Andrei / Founder`.

## Decisiones confirmadas

- Aplicación web desplegada en Vercel; Supabase aporta Auth, Postgres y Storage. Datos remotos disponibles desde navegador, sin requisito de modo offline.
- Una sola identidad humana: Andrei. Inicio con contraseña y TOTP obligatorio de Google Authenticator. Registro público desactivado.
- COP es la moneda operativa inicial. Métricas se definen por entidad y las estratégicas se consolidan en el mapa.
- Autoguardado, historial restaurable para contenido editable y bitácora. El borrado confirmado es definitivo; el evento de borrado puede quedar en la bitácora sin conservar una copia del contenido.
- Misiones y proyectos convierten estrategia en ejecución; las tareas, dependencias, fechas, prioridad y estado se vinculan a las entidades correspondientes.
- La operación es registro interno completo: ventas, compras, gastos, cobros, pagos, movimientos, inventario, producción y logística. No es una tienda ni un flujo de cotización para clientes; tampoco emite factura electrónica DIAN ni reemplaza contabilidad legal.
- No activar conectores externos en v1. Preparar interfaces de integración para más adelante.

## Estado del sistema

El repositorio ya contiene una primera base Next.js/TypeScript, pantalla de acceso con contraseña + enrolamiento/verificación TOTP, shell del dashboard, mapa editable, biblioteca con autoguardado/versiones, archivos privados, misiones, proyectos, tareas, métricas, cuentas y eventos operativos. También incluye la migración SQL con RLS y reglas privadas de Storage, un importador idempotente de entidades/relaciones y cuatro textos institucionales con fuente y fecha. La base está lista para conectar a un proyecto Supabase; no está publicada ni validada contra credenciales reales porque todavía no se han configurado.

La v0.1 registra movimientos con tipo, fecha, importe COP opcional, cuenta, efecto en saldo, contraparte y una línea de cantidad/unidad. Los saldos de las cuentas se derivan de los eventos y transferencias. Inventario con varios artículos/lotes, producción por receta, conciliación y adjuntos ligados al movimiento quedan como expansión del libro operativo, no como cifras inventadas ni saldos manuales.

## Estructura de Soverath

Mantener tipos distintos para capa coordinadora, empresa operativa, marca, servicio, canal, sistema transversal y proyecto. Cada registro admite jerarquía, relaciones múltiples, estado, descripción, enlaces y procedencia de sus datos.

Las capas coordinadoras confirmadas por Andrei son Soverath Holding, Soverath Capital, Soverath Society, Soverath Wholesales, Soverath Loom y Soverath Logistic. Wholesales coordina Tujo Wholesales y sus canales `tujo.presentto.online` y `wtujo.presentto.online`; Logistic coordina Tujo Logistics y sus derivaciones. Soverath es el nodo de la red; SIS representa el instrumento de Andrei para administrarla.

Los sistemas transversales MEHD KEY, PAASP, PODC y D-FAIC deben existir como sistemas relacionados con la red y, cuando aplique, con las entidades que los usan. El contenido de Soverath sobre coordinación, producir mejor, distribuir con criterio, comunidad, sociedad, entorno y trabajo social se registra como texto conceptual editable.

## Módulos de SIS

1. **Mapa de red:** jerarquía expandible, búsqueda global, estados, actividad, alertas y métricas estratégicas. Desde cada nodo se abre su espacio de trabajo.
2. **Espacio por entidad:** resumen, propósito, estrategia, servicios y marcas, sistemas utilizados, recursos, documentos, métricas, misiones, proyectos, operación e historial.
3. **Conocimiento y recursos:** editor de textos y notas, documentos, brandbooks, imágenes y descargas. Supabase Storage será privado; SIS muestra archivos por relación con entidad/proyecto y permite descargar con sesión autorizada.
4. **Misiones y ejecución:** una misión declara resultado buscado, entidades afectadas y métrica de éxito. Puede contener proyectos, tareas, bloqueos, dependencias, fecha objetivo, notas y revisiones.
5. **Métricas:** definiciones flexibles con unidad, frecuencia, objetivo y valores fechados. Distinguir valores observados, estimaciones, metas y datos de ejemplo.
6. **Libro operativo interno:** registro trazable de ingresos y gastos, ventas/compras, cobros/pagos, transferencias, ajustes, producción, logística e inventario. La base registra fecha, entidad, importe opcional, cuenta interna y efecto sobre saldo, contraparte, cantidad/unidad, referencia y notas. Los saldos se derivan de eventos; no se ingresan como cifras independientes. Varias líneas de producto, lotes, recetas, conciliación y adjuntos por movimiento se amplían después.
7. **Auditoría y versiones:** guardar autor de sesión, fecha, acción y registro afectado. Para textos editables conservar versiones restaurables. No guardar secretos ni contenido borrado dentro del evento de auditoría.
8. **Importación y administración:** incorporar catálogo inicial como datos revisables; exportar respaldo JSON desde la interfaz; editar relaciones y estados. La restauración de respaldos/CSV se deja para una fase posterior para no permitir sobrescrituras masivas accidentales.

## Arquitectura y seguridad

- Frontend: Next.js + TypeScript, desplegado en Vercel. Backend de datos y autenticación: Supabase Auth + PostgreSQL + Storage. Interacción privilegiada solo mediante servidor cuando la operación lo requiera.
- Exigir una cuenta fundadora aprovisionada previamente, contraseña fuerte y factor TOTP de Authenticator. Comprobar nivel MFA AAL2 en cada ruta y operación protegida; no confiar en que ocultar una pantalla equivalga a autorización.
- Deshabilitar altas públicas. Las claves secretas de Supabase nunca van al navegador. Mantener solo claves publicables en cliente y secretos en variables de servidor de Vercel.
- Activar Row Level Security en todas las tablas expuestas. La política inicial concede lectura/escritura únicamente al UUID de Founder y requiere sesión MFA. El Storage usa bucket privado y políticas igualmente limitadas.
- Crear pruebas de autorización para sesión anónima, sesión de primer factor sin TOTP y Founder con TOTP. Verificar también que los objetos de Storage no tengan lectura pública.
- Guardar cambios con control de error y estado visible de sincronización. Si falla la red, conservar temporalmente el borrador en el navegador y comunicar que aún no está sincronizado; no presentarlo como guardado remoto.

## Datos iniciales y procedencia

Usar [INVENTARIO_DOMINIOS_PUBLICOS.md](./INVENTARIO_DOMINIOS_PUBLICOS.md) como catálogo de observaciones públicas, fuentes, estados y relaciones pendientes. Incluir el catálogo aportado por Andrei como otra fuente. Cada dato importado debe registrar fuente, fecha de observación, tipo de fuente y confianza.

Usar estados de procedencia legibles: **confirmado por Founder**, **observación pública**, **inferido**, **demo/placeholder** y **por confirmar**. La información estratégica que no aparece en público no se inventa. Los precios, inventarios, direcciones, métricas, testimonios y capacidades comerciales de sitios se guardan como observaciones fechadas, nunca como hechos actuales de la operación hasta que Andrei los confirme.

Conflictos que SIS debe dejar visibles para revisión:

- La fuente de Soverath presenta Soverath Aion y Quonceptory Academy por separado; Allerihe llama a Quonceptory su academia. Preservar ambas entidades y anotar el vínculo como pendiente, sin fusionarlas.
- El Founder define Allerihe como empresa; la web la presenta como proyecto/editorial y enlaza su canal de YouTube. Respetar el tipo de entidad establecido por Founder y conservar la descripción pública como evidencia.
- El catálogo de Soverath marca varias fichas como conceptuales o por revisar; una web activa no cambia automáticamente el estado corporativo aprobado.
- Las tiendas mencionadas en el inventario tienen diferentes grados de operación y contenido demo. No unirlas a Wholesales ni afirmar propiedad de Soverath sin relación confirmada.
- El archivo de texto pegado termina en 37 por truncamiento; la página viva `/red` confirma los registros 38–40: Vialt Health, Vikingdogs y Yessica Ortiz. Importar las 40 fichas y conservar por separado ambas procedencias.

## Fases de construcción

1. **Base segura · implementada en archivos:** scaffold web, diseño, login contraseña + TOTP, migración Supabase, RLS, Storage privado e importador. Falta aplicar en el proyecto real, enrolar la cuenta Founder y conectar las variables.
2. **Red y conocimiento · implementados:** mapa, CRUD de entidades/relaciones, origen y estado, editor con autoguardado/versiones, biblioteca y recursos privados.
3. **Ejecución · implementada en base v0.1:** misiones, proyectos, tareas, fechas, prioridades y métricas con valores fechados.
4. **Registro de operación · implementado en base v0.1:** cuentas COP, eventos, tipos operativos, importe, efecto de saldo, transferencia entre cuentas, cantidad/unidad, referencia y contexto. Próxima ampliación: líneas múltiples de inventario, recetas/producción, lotes, adjuntos por evento y exportaciones.
5. **Conexión y endurecimiento:** importar catálogo en Supabase, revisar políticas y ajustes MFA del proyecto, confirmar respaldo/recuperación de acceso, conectar Vercel y operar con datos reales. Probar escritorio/móvil y flujos de guardado una vez configurado el entorno.

## Criterios de aceptación

- Una persona sin sesión no puede consultar ningún dato ni archivo; una sesión sin segundo factor tampoco puede leer o cambiar contenido.
- Andrei inicia, consulta el mapa, encuentra una entidad, edita estrategia, crea misión/tareas, adjunta un brandbook y descarga el archivo desde otro navegador.
- Al recargar o cambiar de navegador, las ediciones confirmadas siguen presentes en Supabase; las versiones restauran texto previo.
- Crear o editar un evento operativo actualiza vistas derivadas de cuenta y permite registrar cantidades/unidades; una transferencia resta en la cuenta origen y suma en la destino. El historial conserva quién y cuándo cambió los datos, sin guardar contenido borrado.
- Las vistas de holding y entidad distinguen claramente observaciones públicas de hechos internos confirmados.
- La aplicación se adapta a escritorio y móvil, conserva el carácter monocromático y ofrece búsqueda global y navegación por teclado.

## Pendientes de validación con Founder

- Ubicación exacta de las marcas/empresas nuevas de las webs: bajo Wholesales, Society, Holding u otra capa. SIS puede importarlas primero como nodos por confirmar.
- Cuáles de los sitios adicionales observados (Korall, Korall BS, Gatitools, SACREPS, Saniver y PACEFORM) son unidades de Soverath, proyectos personales o solo referencias.
- Relación final entre Soverath Aion, Quonceptory y Allerihe; y el estado de KSPR Community y KSPR Desktop.
- Modelo para artículos/lotes y producción: una línea por producto, inventario por ubicación, receta, vencimiento u otro nivel que necesite cada empresa.
- Recuperación si se pierde Authenticator. La base actual exige TOTP; antes de guardar datos reales, definir códigos de recuperación de un solo uso o un procedimiento seguro de restablecimiento en el panel Supabase bajo control exclusivo de Founder.

## Extensión de bibliotecas · implementación inicial

La primera implementación de bibliotecas añade Galería, Documentos, AI Concepts y Configuración al dashboard. Las bibliotecas se organizan por entidad y proyecto opcional; reutilizan `resources`, el bucket privado y RLS/AAL2. La migración aditiva `0002_file_workspaces.sql` añade carpetas, metadatos de archivo, conceptos Markdown con revisiones, asociación de adjuntos y conteos con `security_invoker`. Debe aplicarse después de `0001_sis_base.sql`; no se aplica automáticamente desde el frontend.

La interfaz incluye tarjetas por entidad, navegación por carpetas, filtro por proyecto, búsqueda paginada, carga múltiple/secuencial, arrastrar y soltar en escritorio, cola con resultado por archivo, límites visibles de 50 MB, previews de imagen/video/audio/PDF/texto, links firmados, mover dentro de entidad/área, edición de metadatos, borrado confirmado, conceptos Markdown importables/exportables y restauración de revisiones. Configuración inicial permite densidad local, datos de cuenta/MFA y exportación JSON.

Límites explícitos de esta etapa: TUS/progreso byte a byte, conversión HEIC/Office, thumbnails y transcodificación de video, OCR, análisis antimalware, filtros avanzados por MIME/tamaño, papelera recuperable, cross-entity moves, configuración centralizada de cuotas, sincronización entre dispositivos de preferencias y backup de binarios. Los formatos sin preview se descargan; AI Concepts es biblioteca/editor, no integración con modelos.

Criterios adicionales: ejecutar ambas migraciones en staging antes de producción; verificar que recursos existentes mantengan sus paths; probar permisos anónimo/AAL1/AAL2; validar carga y limpieza ante fallo; probar import/export Markdown, movimiento de carpeta, eliminación con subcarpetas, historial/restauración y navegación táctil en móvil. Completar estos checks antes de habilitar cargas masivas o archivos reales de gran tamaño.
