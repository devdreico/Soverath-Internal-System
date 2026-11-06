import type { EntityType, Provenance } from "./types";

export interface SeedEntity {
  slug: string;
  name: string;
  entity_type: EntityType;
  status: string;
  summary: string;
  description?: string;
  parent_slug?: string;
  source_url?: string;
  provenance: Provenance;
}

export const catalogSeedSlugs = new Set([
  "soverath-aion", "quonceptory-academy", "uspkh-brands", "aeperion-systems", "tujo-smart-logistics", "kspr",
  "kspr-community", "kspr-desktop", "seido", "seido-food", "desvares", "matchare", "borbonesso", "vero-forno", "botane", "lacteos-seol", "mixia", "grado", "mise-house", "kits-listos", "clear-kler", "prcival",
  "miri-ads", "uspics", "unique-soundplex", "presentto-online", "presentto-online-map",
  "capacitur", "charleche", "detox-ia", "esturel", "evdb", "growveer-botanic", "knifopics", "live-brand-reclute", "lun-y-lou", "vexna", "vialt-health", "vikingdogs", "yessica-ortiz",
]);

export interface SeedRelationship {
  source: string;
  target: string;
  relationship_type: string;
  evidence: string;
  source_url?: string;
  provenance: Provenance;
}

export interface SeedDocument {
  seed_key: string;
  entity_slug: string;
  title: string;
  document_type: string;
  content: string;
  source_url: string | null;
  source_observed_at?: string;
  provenance: Provenance;
}

const catalog = "https://soverath.presentto.online/red";
const observed = "public_observation" as const;
const founder = "founder_confirmed" as const;
const review = "needs_confirmation" as const;

export const seedEntities: SeedEntity[] = [
  { slug: "soverath-holding", name: "Soverath Holding", entity_type: "coordinator", status: "active", summary: "Estructura operativa que coordina empresas, marcas, sistemas y servicios de Soverath.", description: "Propósito público: construir hacia el bien desde Bogotá DC, Colombia. La red convierte ideas en operaciones ordenadas y útiles: producir mejor, distribuir con criterio y crear comunidad. Sus principios publicados son poner a las personas antes que las cifras, cuidar el entorno, coordinar trabajo que comparta aprendizajes y construir comunidades con acuerdos claros y responsabilidad compartida. Texto conceptual público editable; Founder define la estructura interna vigente.", provenance: founder, source_url: "https://soverath.presentto.online" },
  { slug: "soverath-capital", name: "Soverath Capital", entity_type: "coordinator", status: "active", summary: "Participación económica y financiación interna de la red.", description: "La web se presenta como estructura privada de análisis y administración de capital de Soverath Holding, con áreas para ingresos, métricas, rangos de asignación y proyectos por invitación. Las cifras en cero, porcentajes, proyectos y ejemplos publicados parecen plantillas; no ingresarlos como caja, cartera ni inversión real. El gate que muestra el sitio no es un control de acceso válido para SIS.", parent_slug: "soverath-holding", provenance: founder, source_url: "https://scapital.presentto.online" },
  { slug: "soverath-society", name: "Soverath Society", entity_type: "coordinator", status: "active", summary: "Espacio de socios y alianzas de la red.", parent_slug: "soverath-holding", provenance: founder },
  { slug: "soverath-wholesales", name: "Soverath Wholesales", entity_type: "coordinator", status: "active", summary: "Coordinación mayorista y producción de insumos para restaurantes, retail y operaciones propias.", parent_slug: "soverath-holding", provenance: founder },
  { slug: "soverath-loom", name: "Soverath Loom", entity_type: "coordinator", status: "active", summary: "Confección y plataforma para líneas de ropa propias.", parent_slug: "soverath-holding", provenance: founder },
  { slug: "soverath-logistic", name: "Soverath Logistic", entity_type: "coordinator", status: "active", summary: "Capa coordinadora de Tujo Logistics y sus derivaciones.", parent_slug: "soverath-holding", provenance: founder },

  { slug: "soverath-aion", name: "Soverath Aion", entity_type: "company", status: "conceptual", summary: "Academia que integra conocimiento, PODC y soluciones pedagógicas mediante PAASP y PAOT.", provenance: observed },
  { slug: "quonceptory-academy", name: "Quonceptory Academy", entity_type: "company", status: "needs_review", summary: "Concepto educativo de la red; relación exacta con Aion y catálogo de cursos por confirmar.", description: "Academia pública enfocada en IA, agentes y datos; organiza su propuesta en ciencia, academia, método, herramientas, proyectos, comunidad, eventos y blog. Declara una comunidad de más de 2.000 personas, dato publicado por el sitio y no validado como métrica de Soverath. Allerihe la presenta como su academia; la relación con Soverath Aion requiere decisión de Founder.", source_url: "https://quonceptory.presentto.online", provenance: observed },
  { slug: "uspkh-brands", name: "Uspkh Brands", entity_type: "company", status: "conceptual", summary: "Asesoría de marketing, branding, diseño, sistematización y ecosistemas empresariales.", description: "La web presenta contenido, piezas UGC, pauta de Meta y branding en paquetes mensuales. Publica valores de 600.000, 990.000 y 1.300.000 COP y señala que el cliente paga la pauta directamente a la plataforma. Tarifas capturadas el 4 nov 2026; confirmar vigencia y correspondencia entre Uspkh Brand y Uspkh Brands antes de usarlas como oferta actual.", source_url: "https://uspkh.presentto.online", provenance: observed },
  { slug: "aeperion-systems", name: "Aeperion Systems", entity_type: "company", status: "active", summary: "Desarrollo de software, IA, webs, dominios, automatización y sistemas completos.", description: "El sitio se presenta desde Bogotá y declara operar desde 2017. Describe diagnóstico, automatización, CRM, desarrollo web y de aplicaciones, POS, analítica e IA. Hay una diferencia entre los precios visibles en la página y los del schema de metadatos; no incorporar ninguno como tarifa vigente sin confirmación. Miri Ads lo acredita públicamente como desarrollador.", source_url: "https://aeperion.presentto.online", provenance: observed },
  { slug: "tujo-smart-logistics", name: "Tujó Smart Logistics", entity_type: "company", status: "exploration", summary: "Red logística con comida, trabajos freelance, paquetes y conductores conectados por proximidad.", provenance: observed },
  { slug: "kspr", name: "KSPR", entity_type: "company", status: "needs_review", summary: "Herramienta para analizar repositorios y documentos y generar árboles de contexto auditables; estructura comunitaria y de escritorio por confirmar.", description: "El producto público se describe como CLI de análisis estático e ingeniería inversa de repositorios, PDF, imágenes y URL sin ejecutar artefactos. Genera Context Trees en Markdown con trazabilidad; incluye /decompilate, /trees, integración MCP y distintos proveedores de IA. El sitio lo asocia con Soverath Holding y enlaza repositorio, desktop y membership. El tipo corporativo y el estado se conservan por separado del producto observado.", source_url: "https://kspr.presentto.online", provenance: observed },

  { slug: "kspr-community", name: "KSPR Community", entity_type: "brand", status: "needs_review", summary: "Expansión comunitaria de KSPR; alcance y plataforma por confirmar.", provenance: observed },
  { slug: "kspr-desktop", name: "KSPR Desktop", entity_type: "brand", status: "needs_review", summary: "Aplicación de escritorio de KSPR; estado y función por confirmar.", source_url: "https://kspr.desktop.presentto.online", provenance: observed },
  { slug: "seido", name: "SEIDŌ", entity_type: "brand", status: "launching", summary: "Sushi, woks, almuerzos y recetas firma con un sistema de producción documentado.", provenance: observed },
  { slug: "seido-food", name: "SEIDO Food", entity_type: "brand", status: "needs_review", summary: "Línea de alimentos de SEIDŌ más allá del restaurante; catálogo y canal de venta por confirmar.", provenance: observed },
  { slug: "desvares", name: "Desvares", entity_type: "brand", status: "conceptual", summary: "Perros, hamburguesas, salchipapas, comida típica y almuerzos de entrega rápida.", provenance: observed },
  { slug: "matchare", name: "Matcharé", entity_type: "brand", status: "conceptual", summary: "Tés, jugos, extractos y batidos saludables.", provenance: observed },
  { slug: "borbonesso", name: "Borbonesso", entity_type: "brand", status: "conceptual", summary: "Café rápido y de calidad, entre la masividad y la degustación local.", provenance: observed },
  { slug: "vero-forno", name: "Vero Forno", entity_type: "brand", status: "conceptual", summary: "Pizza, pasta y cultura alimentaria italiana.", provenance: observed },
  { slug: "botane", name: "Botané", entity_type: "brand", status: "conceptual", summary: "Productos naturistas explicados técnicamente y seleccionados por utilidad.", description: "El comercio público se enfoca en bienestar natural, suplementos, descanso y recuperación. El sitio menciona Funza/Cundinamarca, envío gratis y pago contra entrega. Los productos, disponibilidad y condiciones comerciales son una captura cambiante; los enlaces a otras marcas no demuestran propiedad ni coordinadora.", source_url: "https://botane.presentto.online", provenance: observed },
  { slug: "lacteos-seol", name: "Lácteos Seol", entity_type: "brand", status: "launching", summary: "Quesos, cuajadas, cremas, kéfir, yogur y mozzarella artesanal.", provenance: observed },
  { slug: "mixia", name: "Mixia", entity_type: "brand", status: "launching", summary: "Gomitas, cajas de dulces, flores, peluches y regalos con intención.", provenance: observed },
  { slug: "grado", name: "Grado", entity_type: "brand", status: "needs_review", summary: "Retail de ropa reacondicionada con estética vintage y selección curada.", provenance: observed },
  { slug: "mise-house", name: "Mise House", entity_type: "brand", status: "needs_review", summary: "Todo para cocinar bien, rápido y sin gastar de más.", provenance: observed },
  { slug: "kits-listos", name: "Kits listos", entity_type: "brand", status: "needs_review", summary: "Productos agrupados como soluciones listas para resolver una necesidad concreta.", provenance: observed },
  { slug: "clear-kler", name: "Clear Kler", entity_type: "brand", status: "needs_review", summary: "Limpieza premium accesible en formatos minoristas y mayoristas.", provenance: observed },
  { slug: "prcival", name: "PRCIVAL", entity_type: "brand", status: "conceptual", summary: "Línea de ropa de inspiración histórica y styling de alto contraste.", provenance: observed },

  { slug: "miri-ads", name: "Miri Ads", entity_type: "service", status: "conceptual", summary: "Distribución de mensajes y piezas publicitarias en canales digitales y despliegues físicos.", description: "La web propone campañas phygital con packs digitales, cuadrillas, despliegues físicos por lotes, evidencia GPS, trazas QR y un flujo de coordinación; publica un ciclo de 72 horas. El pie declara coordinación de Holding y desarrollo por Aeperion. Los ceros en precio/métricas, referencias de ubicación en Lima y ejemplos de crew/ranking no son actividad operativa verificada.", source_url: "https://miriads.presentto.online", provenance: observed },
  { slug: "uspics", name: "Uspics", entity_type: "service", status: "conceptual", summary: "Fotografía, edición y producciones audiovisuales completas.", provenance: observed },
  { slug: "unique-soundplex", name: "Unique Soundplex", entity_type: "service", status: "conceptual", summary: "Edición musical, diseño sonoro y audio.", provenance: observed },
  { slug: "presentto-online", name: "Presentto Online", entity_type: "service", status: "active", summary: "Páginas web, SEO local, hosting administrado y menús interactivos para negocios.", description: "La página de servicio se orienta a negocios en Sabana Occidental y menciona páginas web, SEO local, hosting administrado y menús interactivos para restaurantes. Publica 25.000 COP mensuales como valor de referencia; verificar antes de cotizar o registrar ingresos.", source_url: "https://soverath.presentto.online/presentto", provenance: observed },
  { slug: "presentto-online-map", name: "Presentto Online Map", entity_type: "service", status: "needs_review", summary: "Extensión para mapas y presencia local.", provenance: observed },

  { slug: "capacitur", name: "Capacitur", entity_type: "concept", status: "needs_review", summary: "Viajes y turismo; alcance por confirmar.", provenance: observed },
  { slug: "charleche", name: "Charleche", entity_type: "concept", status: "needs_review", summary: "Actividad por confirmar.", provenance: observed },
  { slug: "detox-ia", name: "DETOX IA", entity_type: "concept", status: "needs_review", summary: "Proceso personalizable; alcance por confirmar.", provenance: observed },
  { slug: "esturel", name: "Esturel", entity_type: "concept", status: "needs_review", summary: "Tienda, asesoría y contenido de tecnología en Colombia.", description: "El sitio muestra tienda y asesoría sobre tecnología, especialmente audio y periféricos, junto con noticias tech, atención por WhatsApp y pago contra entrega. El catálogo se observó públicamente; no equivale a ventas o inventario internos.", source_url: "https://esturel.presentto.online", provenance: observed },
  { slug: "evdb", name: "EVDB", entity_type: "concept", status: "needs_review", summary: "Significado y actividad por confirmar.", provenance: observed },
  { slug: "growveer-botanic", name: "Growveer Botanic", entity_type: "concept", status: "needs_review", summary: "Índice y biblioteca botánica con comercio y Bitácora; catálogo y estado por confirmar.", description: "GROW se presenta como índice/biblioteca botánica con tienda, Bitácora y sección Cannabis +18. La página cita Kew/WCVP y publica cifras taxonómicas con fecha de recuperación 21 sep 2026; también presenta cerca de 200 productos generados como demo y fichas con indexación pendiente. Conservarlo como declaración pública fechada, no como datos actuales de operación ni catálogo real.", source_url: "https://growveer.presentto.online", provenance: observed },
  { slug: "knifopics", name: "Knifopics", entity_type: "concept", status: "needs_review", summary: "Tiendas de productos para cocina y cuchillería con contenidos editoriales.", description: "El proyecto reúne dos escaparates llamados Knifes y Kitchen con carrito combinado, pago contra entrega y contenidos de guías, wiki, noticias, academia, culturas y rankings. La página pública no confirma ventas, inventario o coordinadora interna.", source_url: "https://knifopics.presentto.online", provenance: observed },
  { slug: "live-brand-reclute", name: "LIVE BRAND RECLUTE", entity_type: "concept", status: "needs_review", summary: "Talento y marca; propósito por confirmar.", provenance: observed },
  { slug: "lun-y-lou", name: "Lun y Lou", entity_type: "concept", status: "needs_review", summary: "Marca de autor; rubro por confirmar.", description: "El slug LYL enlaza una tienda de dispositivos de belleza para rostro, cabello y cuerpo. La página declara entrega en dos días y pago contra entrega en Colombia; confirmar si el nombre Lun y Lou del catálogo corresponde formalmente a este sitio.", source_url: "https://lyl.presentto.online", provenance: observed },
  { slug: "vexna", name: "Vexna", entity_type: "concept", status: "needs_review", summary: "Tienda online; actividad por confirmar.", provenance: observed },
  { slug: "vialt-health", name: "Vialt Health", entity_type: "concept", status: "needs_review", summary: "Concepto de salud digital / Human Vault; alcance y sitio por confirmar.", provenance: observed },
  { slug: "vikingdogs", name: "Vikingdogs", entity_type: "concept", status: "needs_review", summary: "Tienda de productos y contenidos para cuidado canino.", description: "El sitio describe productos y contenido de cuidado, aseo, hidratación y entrenamiento canino. Declara diez productos, Funza como base, envío gratis, pago contra entrega, atención por WhatsApp y políticas de entrega/devolución. Tratar inventario, testimonios y plazos como afirmaciones públicas por validar.", source_url: "https://vikingdogs.presentto.online", provenance: observed },
  { slug: "yessica-ortiz", name: "Yessica Ortiz", entity_type: "concept", status: "needs_review", summary: "Marca personal de la red; actividad y sitio por confirmar.", provenance: observed },

  { slug: "mehd-key", name: "MEHD KEY", entity_type: "system", status: "exploration", summary: "Sistema de coordinación de producción, facturación, pedidos, logística, consumo y datos para operaciones alimentarias.", source_url: "https://soverath.presentto.online/sistemas/mehd-key", provenance: observed },
  { slug: "paasp", name: "PAASP", entity_type: "system", status: "conceptual", summary: "Sistema fundacional de conocimiento y soluciones pedagógicas asociado a Aion.", source_url: "https://soverath.presentto.online/sistemas/paasp", provenance: observed },
  { slug: "podc", name: "PODC", entity_type: "system", status: "active", summary: "Plantilla para convertir una idea o producto en documentación operativa reproducible.", source_url: "https://soverath.presentto.online/sistemas/podc", provenance: observed },
  { slug: "d-faic", name: "D-FAIC", entity_type: "system", status: "conceptual", summary: "Marco interno de funcionamiento y participación económica de Soverath Capital.", source_url: "https://soverath.presentto.online/sistemas/d-faic", provenance: observed },

  { slug: "tujo-wholesales", name: "Tujo Wholesales", entity_type: "company", status: "active", summary: "Operación coordinada por Soverath Wholesales.", parent_slug: "soverath-wholesales", provenance: founder },
  { slug: "tujo-logistics", name: "Tujo Logistics", entity_type: "company", status: "active", summary: "Operación logística coordinada por Soverath Logistic; sus derivaciones quedan pendientes de inventario.", parent_slug: "soverath-logistic", provenance: founder },
  { slug: "tujo-channel", name: "Tujo Wholesales · Canal", entity_type: "channel", status: "active", summary: "Canal `tujo.presentto.online` asociado por Founder a Tujo Wholesales.", parent_slug: "tujo-wholesales", source_url: "https://tujo.presentto.online", provenance: founder },
  { slug: "wtujo-channel", name: "WTujo · Canal", entity_type: "channel", status: "active", summary: "Canal `wtujo.presentto.online` asociado por Founder a Tujo Wholesales.", parent_slug: "tujo-wholesales", source_url: "https://wtujo.presentto.online", provenance: founder },

  { slug: "allerihe", name: "Allerihe", entity_type: "company", status: "needs_review", summary: "Empresa editorial y de conocimiento con canal de YouTube; visión interna y estado operativo por documentar.", description: "El sitio público reúne ciencia, historia, filosofía y cultura con manifiesto, filosofía, misión, iniciativas y academia; enlaza el canal @allerihe. Presenta la Praxeología de la Tensión como propuesta propia de su autor y aclara que no es consenso científico. También llama Quonceptory su academia; el vínculo con Aion queda por definir.", source_url: "https://allerihe.presentto.online", provenance: founder },
  { slug: "allerihe-youtube", name: "Allerihe · YouTube", entity_type: "channel", status: "active", summary: "Canal editorial de Allerihe, enlazado desde su sitio público.", parent_slug: "allerihe", source_url: "https://www.youtube.com/@allerihe", provenance: observed },
  { slug: "korall-team", name: "Korall Team", entity_type: "concept", status: "needs_review", summary: "Equipo internacional de e-sports y deportes; la página incluye coordinación y datos de ejemplo.", description: "El sitio muestra divisiones Korall Gaming y Korall Fútbol/microfútbol, afiliados, tareas y coordinación. Parte del dashboard trabaja con localStorage y datos demo. No se encontró una relación corporativa pública con Soverath.", source_url: "https://korall.presentto.online", provenance: review },
  { slug: "korall-bs", name: "Korall BS", entity_type: "concept", status: "needs_review", summary: "Equipo de Brawl Stars con contenido de entrenamiento y tryouts; vínculo corporativo por confirmar.", description: "Página del equipo de Brawl Stars centrada en entrenamiento de meta, draft, comunicación, revisión de partidas y tryouts. El propio sitio aclara que no está afiliado con Supercell. Relación con Korall Team y Soverath por confirmar.", source_url: "https://korall-bs.vercel.app", provenance: review },
  { slug: "gatitools", name: "Gatitools", entity_type: "concept", status: "needs_review", summary: "Tienda y centro editorial de productos y cuidado de gatos; su checkout publicado es un prototipo.", description: "Sitio de comercio/editorial para gatos con productos, wiki de cuidados y noticias. El código cliente identifica el checkout como prototipo que no envía pedidos a una tienda real; no registrar carritos como ventas.", source_url: "https://gatitools.presentto.online", provenance: review },
  { slug: "sacreps", name: "SACREPS", entity_type: "concept", status: "needs_review", summary: "Retail deportivo y contenidos de nutrición, entrenamiento y suplementos; catálogo público por validar.", description: "Tienda de suplementación, nutrición deportiva, accesorios y entrenamiento, con sedes, guías/wiki, comunidad y noticias. El catálogo estático y los flujos de checkout/formulario son observaciones públicas, no operaciones verificadas.", source_url: "https://sacreps.presentto.online", provenance: review },
  { slug: "saniver", name: "Saniver", entity_type: "concept", status: "needs_review", summary: "Tienda y contenidos de bienestar; productos visibles y afirmaciones de salud requieren revisión.", description: "Comercio/editorial de bienestar con categorías de suplementos, cuidado personal, botiquín y productos OTC; la página mostraba doce artículos. Sus guías advierten que el contenido no reemplaza el consejo de un profesional. No tratar descripciones comerciales como consejo médico ni como inventario actual.", source_url: "https://saniver.presentto.online", provenance: review },
  { slug: "paceform", name: "PACEFORM", entity_type: "concept", status: "needs_review", summary: "Tienda y contenido de equipamiento para running; su relación con otras marcas no está confirmada.", description: "Sitio de running con calzado, ropa, accesorios, recuperación, nutrición, hidratación y running nocturno, además de kits, wiki y noticias. La portada declaraba catorce productos, envío gratis y contra entrega. Enlaza Botané y Vexna Bike, pero eso no demuestra propiedad o coordinación común.", source_url: "https://paceform.presentto.online", provenance: review },
];

export const seedDocuments: SeedDocument[] = [
  {
    seed_key: "founder-soverath-origin-2026-11-06",
    entity_slug: "soverath-holding",
    title: "Origen y estructura confirmados por Founder",
    document_type: "strategy",
    content: `# Origen y estructura de Soverath Holding\n\n## Origen confirmado por Founder\n\nSoverath Holding nació el 16 de julio de 2025 en Bogotá D.C., Colombia. Esta es la fecha de origen informada por Founder; no debe interpretarse por sí sola como fecha de constitución legal, registro mercantil o inicio de operaciones comerciales.\n\n## Capas coordinadoras confirmadas\n\nLa estructura coordinadora definida por Founder comprende Soverath Holding, Soverath Capital, Soverath Society, Soverath Wholesales, Soverath Loom y Soverath Logistic. Wholesales coordina Tujo Wholesales y sus canales tujo.presentto.online y wtujo.presentto.online. Logistic coordina Tujo Logistics y sus derivaciones.\n\nEstas capas describen el modelo de coordinación interno; no prueban por sí solas la existencia de seis personas jurídicas independientes. En respuestas y registros, distingue la jerarquía operativa de la forma legal hasta que Founder la documente.\n\nConfirmado en SIS por Founder el 6 de noviembre de 2026.`,
    source_url: null,
    source_observed_at: "2026-11-06",
    provenance: "founder_confirmed",
  },
  {
    seed_key: "public-soverath-network-briefing-2026-11-04",
    entity_slug: "soverath-holding",
    title: "Lectura pública de la red y reglas de interpretación",
    document_type: "reference",
    content: `# Soverath · síntesis de fuentes públicas\n\n## Alcance\n\nSíntesis de la captura documentada en INVENTARIO_DOMINIOS_PUBLICOS.md el 4 de noviembre de 2026. Describe lo publicado por los sitios; no valida propiedad legal, ventas, inventario, personal, resultados ni estado operativo actual.\n\n## Identidad y propósito publicados\n\nSoverath Holding se presenta como estructura coordinadora con base en Bogotá que conecta empresas, marcas, servicios y sistemas. Su propósito público es “Construir hacia el bien”: convertir ideas en operaciones ordenadas y útiles, producir mejor, distribuir con criterio y crear comunidad. Los principios declarados priorizan a las personas, el cuidado del entorno, la colaboración documentada y acuerdos comunitarios claros.\n\n## Catálogo visible\n\nLa ruta pública /red mostraba 40 registros: 6 empresas, 16 marcas, 5 servicios y 13 conceptos por validar. Es un conteo del catálogo web en esa fecha, no el total operativo de SIS. Cada entidad tiene su propia descripción, fuente y estado; consulta su ficha antes de generalizar.\n\n## Sistemas mencionados públicamente\n\n- MEHD KEY: coordinación de producción, pedidos, logística, consumo y datos, con referencia a operación alimentaria.\n- PAASP: conocimiento y soluciones pedagógicas, asociado públicamente a Aion.\n- PODC: plantilla para convertir ideas o productos en documentación operativa reproducible.\n- D-FAIC: marco descrito para funcionamiento y participación económica de Soverath Capital.\n\nLos estados son los publicados en la captura y pueden diferir del estado confirmado actualmente por Founder.\n\n## Relaciones observadas y asuntos pendientes\n\n- Miri Ads declara coordinación de Soverath Holding y desarrollo por Aeperion Systems; ciclos, precios, ubicaciones y métricas de sitio son afirmaciones públicas, no actividad interna verificada.\n- KSPR se identifica públicamente con Soverath Holding; el alcance corporativo de Community y Desktop requiere confirmación.\n- Allerihe es una empresa según Founder; su sitio público es editorial y presenta Quonceptory como academia. El catálogo mantiene Quonceptory Academy y Soverath Aion separados hasta que Founder defina la relación.\n- Uspkh Brand/Uspkh Brands, LYL/Lun y Lou y Growveer/Growveer Botanic son coincidencias nominales, no prueba de identidad legal o jerarquía.\n- Korall, Korall BS, Gatitools, SACREPS, Saniver y PACEFORM no tenían vínculo corporativo público comprobado en la revisión.\n- Precios cero, productos demo, carritos prototipo, testimonios, cifras de impacto y páginas de plantilla nunca se convierten en ventas, inventario, caja, KPI o relación confirmada.\n\n## Fuentes\n\nhttps://soverath.presentto.online/red · /mision · /impacto · /sistemas. Detalle por dominio: INVENTARIO_DOMINIOS_PUBLICOS.md, observado el 4 nov 2026.`,
    source_url: "https://soverath.presentto.online",
    source_observed_at: "2026-11-04",
    provenance: "public_observation",
  },
  {
    seed_key: "public-mission-and-values-2026-11",
    entity_slug: "soverath-holding",
    title: "Propósito, misión y principios públicos",
    document_type: "concept",
    content: `# Construir hacia el bien\n\nSoverath Holding se describe como una estructura operativa con base en Bogotá DC, Colombia, que coordina empresas, marcas, sistemas y servicios. Convierte ideas en operaciones ordenadas y útiles: producir mejor, distribuir con criterio y crear comunidad.\n\n## Una red que aprende operando\n\nEl desarrollo no es solo crecimiento: implica coordinación, respeto y propósito. La red documenta procesos mediante sistemas propios como PODC y MEHD KEY, apoya marcas con operación y busca alianzas que multipliquen el impacto positivo.\n\n## Principios publicados\n\n- Sociedad: personas antes que cifras, empleo digno, trato respetuoso y oportunidades reales.\n- Medio ambiente: producir mejor con menos desperdicio, usar recursos con criterio y convivir con el territorio.\n- Trabajo social: unir esfuerzos, documentar lo que funciona y compartir aprendizajes.\n- Comunidad: acuerdos claros, responsabilidad compartida y desarrollo sostenido.\n\nFuente pública observada el 4 nov 2026. Edita este texto para convertirlo en el marco vigente de Founder.`,
    source_url: "https://soverath.presentto.online/mision",
    provenance: "public_observation" as Provenance,
  },
  {
    seed_key: "public-impact-framework-2026-11",
    entity_slug: "soverath-holding",
    title: "Marco público de impacto y métricas declaradas",
    document_type: "strategy",
    content: `# Crecer dejando algo vivo\n\nLa página pública propone medir el impacto con claridad, contexto y responsabilidad. Sus ejes son: territorio como punto de partida, personas al centro de la decisión, colaboración como multiplicador y transparencia como práctica.\n\n## Cifras publicadas por la web\n\nLa captura observada el 4 nov 2026 muestra 40 entidades, 4 sistemas transversales y 6 proyectos documentados. Son cifras institucionales estáticas de la página, no valores operativos verificados ni métricas importadas al dashboard. Define aquí las métricas reales, frecuencia, metas y fuentes que Founder quiera seguir.`,
    source_url: "https://soverath.presentto.online/impacto",
    provenance: "public_observation" as Provenance,
  },
  {
    seed_key: "public-systems-index-2026-11",
    entity_slug: "soverath-holding",
    title: "Índice público de sistemas transversales",
    document_type: "process",
    content: `# Sistemas transversales\n\n- MEHD KEY · exploration: coordinación de producción, facturación, pedidos, logística, consumo y datos; orientado a operación alimentaria.\n- PAASP · conceptual: conocimiento y soluciones pedagógicas, asociado públicamente a Aion.\n- PODC · active: plantilla para convertir una idea o producto en documentación operativa reproducible.\n- D-FAIC · conceptual: marco interno de funcionamiento y participación económica de Soverath Capital.\n\nLa página presenta los cuatro como referencia general de la red. Sus estados son observaciones públicas de la captura del 4 nov 2026; revisa y actualiza los estados internos desde cada ficha.`,
    source_url: "https://soverath.presentto.online/sistemas",
    provenance: "public_observation" as Provenance,
  },
  {
    seed_key: "founder-coordination-layers-2026-11",
    entity_slug: "soverath-holding",
    title: "Capas coordinadoras confirmadas por Founder",
    document_type: "strategy",
    content: `# Estructura de coordinación\n\nFounder confirma estas capas privadas: Soverath Holding, Soverath Capital, Soverath Society, Soverath Wholesales, Soverath Loom y Soverath Logistic.\n\nWholesales coordina Tujo Wholesales y los canales tujo.presentto.online y wtujo.presentto.online. Logistic coordina Tujo Logistics y sus derivaciones. Holding funciona como capa de alcance general. La página institucional pública nombra Capital, Society, Wholesales y Loom junto a Holding, pero no muestra Logistic; esta nota conserva ambas fuentes y hace visible la diferencia.`,
    source_url: "https://soverath.presentto.online/mision",
    provenance: founder,
  },
];

export const seedRelationships: SeedRelationship[] = [
  { source: "mehd-key", target: "soverath-holding", relationship_type: "transversal_en", evidence: "Sistema transversal expuesto como referencia general de la red.", source_url: "https://soverath.presentto.online/sistemas", provenance: observed },
  { source: "paasp", target: "soverath-aion", relationship_type: "asociado_a", evidence: "La ficha pública asocia PAASP con Aion.", source_url: "https://soverath.presentto.online/sistemas/paasp", provenance: observed },
  { source: "paasp", target: "soverath-holding", relationship_type: "transversal_en", evidence: "Sistema transversal expuesto como referencia general de la red.", source_url: "https://soverath.presentto.online/sistemas", provenance: observed },
  { source: "podc", target: "soverath-aion", relationship_type: "utilizado_por", evidence: "La ficha de Aion integra conocimiento y PODC.", source_url: catalog, provenance: observed },
  { source: "podc", target: "soverath-holding", relationship_type: "transversal_en", evidence: "Sistema transversal expuesto como referencia general de la red.", source_url: "https://soverath.presentto.online/sistemas", provenance: observed },
  { source: "d-faic", target: "soverath-capital", relationship_type: "marco_de", evidence: "La ficha pública describe D-FAIC como marco interno de Capital.", source_url: "https://soverath.presentto.online/sistemas/d-faic", provenance: observed },
  { source: "d-faic", target: "soverath-holding", relationship_type: "transversal_en", evidence: "Sistema transversal expuesto como referencia general de la red.", source_url: "https://soverath.presentto.online/sistemas", provenance: observed },
  { source: "miri-ads", target: "soverath-holding", relationship_type: "coordinado_por", evidence: "El pie público declara coordinación por Soverath Holding.", source_url: "https://miriads.presentto.online", provenance: observed },
  { source: "miri-ads", target: "aeperion-systems", relationship_type: "desarrollado_por", evidence: "El pie público acredita a Aeperion como desarrollador.", source_url: "https://miriads.presentto.online", provenance: observed },
  { source: "kspr", target: "soverath-holding", relationship_type: "declara_organizacion", evidence: "El marcado organizacional público identifica Soverath Holding.", source_url: "https://kspr.presentto.online", provenance: observed },
  { source: "allerihe", target: "quonceptory-academy", relationship_type: "presenta_como_academia", evidence: "Allerihe describe públicamente Quonceptory como su academia; encaje con Aion pendiente.", source_url: "https://allerihe.presentto.online", provenance: observed },
];

export const seedSourceUrl = catalog;
export const seedObservedAt = "2026-11-04";
