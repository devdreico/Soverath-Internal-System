"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  Activity, ArrowDownToLine, ArrowRight, BarChart3, BookOpen, Building2,
  Check, ChevronDown, CircleHelp, Clock3, Database, ExternalLink, FileText,
  Layers3, LayoutDashboard, LockKeyhole, LogOut, Network, Pencil, Plus, Search,
  ShieldCheck, Target, Trash2, Upload, Wallet, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getFounderId, getSupabase } from "@/lib/supabase";
import { catalogSeedSlugs, seedDocuments, seedEntities, seedObservedAt, seedRelationships, seedSourceUrl } from "@/lib/seed";
import type { AuditEvent, Entity, EntityDocument, EntityRelationship, InternalAccount, Metric, MetricValue, Mission, OperationEvent, Project, Resource, Task } from "@/lib/types";

type View = "home" | "network" | "knowledge" | "missions" | "metrics" | "operations";
type AppData = {
  entities: Entity[];
  relationships: EntityRelationship[];
  documents: EntityDocument[];
  missions: Mission[];
  projects: Project[];
  tasks: Task[];
  metrics: Metric[];
  metricValues: MetricValue[];
  accounts: InternalAccount[];
  accountBalances: { id: string; balance_cop: number }[];
  operations: OperationEvent[];
  resources: Resource[];
  auditEvents: AuditEvent[];
};
type MfaFlow =
  | { kind: "challenge"; factorId: string; challengeId: string }
  | { kind: "enroll"; factorId: string; uri: string; secret: string };

const emptyData: AppData = { entities: [], relationships: [], documents: [], missions: [], projects: [], tasks: [], metrics: [], metricValues: [], accounts: [], accountBalances: [], operations: [], resources: [], auditEvents: [] };
const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "home", label: "Inicio", icon: LayoutDashboard },
  { id: "network", label: "Entidades", icon: Network },
  { id: "knowledge", label: "Documentos", icon: BookOpen },
  { id: "missions", label: "Objetivos y tareas", icon: Target },
  { id: "metrics", label: "Métricas", icon: BarChart3 },
  { id: "operations", label: "Movimientos", icon: Wallet },
];
const viewCopy: Record<View, { title: string; description: string }> = {
  home: { title: "Resumen", description: "Entidades, tareas pendientes, objetivos activos y movimientos del mes." },
  network: { title: "Entidades", description: "Empresas, marcas, servicios y sistemas con sus relaciones y fuentes." },
  knowledge: { title: "Documentos", description: "Estrategias, notas, procesos y archivos vinculados a entidades." },
  missions: { title: "Objetivos y tareas", description: "Organiza objetivos, proyectos y tareas por estado y fecha." },
  metrics: { title: "Métricas", description: "Define indicadores y registra valores con fecha y fuente." },
  operations: { title: "Movimientos", description: "Registra eventos operativos en COP y consulta saldos derivados." },
};

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `registro-${Date.now()}`;
}

function formatDate(value?: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCOP(value?: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function operationSubline(operation: OperationEvent) {
  const details = operation.details ?? {};
  const amount = details.quantity == null || details.quantity === "" ? "" : `${String(details.quantity)} ${String(details.unit ?? "")}`.trim();
  return [operation.notes, details.counterparty ? `Con ${String(details.counterparty)}` : "", amount, details.reference ? `Ref. ${String(details.reference)}` : ""].filter(Boolean).join(" · ") || "—";
}

function titleCase(value: string) {
  const labels: Record<string, string> = {
    active: "En curso", conceptual: "Conceptual", exploration: "En exploración", launching: "En lanzamiento", needs_review: "Por revisar", needs_confirmation: "Por confirmar", paused: "En pausa", planned: "Planificada", blocked: "Bloqueada", completed: "Completada", cancelled: "Cancelada", todo: "Pendiente", doing: "En curso", done: "Completada",
    coordinator: "Coordinación", company: "Empresa", brand: "Marca", service: "Servicio", concept: "Concepto", system: "Sistema", project: "Proyecto", channel: "Canal",
    strategy: "Estrategia", brandbook: "Manual de marca", process: "Proceso", note: "Nota", founder_confirmed: "Confirmado por administrador", public_observation: "Observación pública", inferred: "Inferido", demo_placeholder: "Dato de demostración",
    daily: "Diaria", weekly: "Semanal", monthly: "Mensual", quarterly: "Trimestral", annual: "Anual", cash: "Efectivo", bank: "Cuenta bancaria", digital_wallet: "Billetera digital", receivable: "Por cobrar", payable: "Por pagar", other: "Otra cuenta",
    sale: "Venta", purchase: "Compra", expense: "Gasto", collection: "Cobro", payment: "Pago", transfer: "Transferencia", inventory: "Inventario", production: "Producción", logistics: "Logística", adjustment: "Ajuste",
    transversal_en: "Se utiliza en", asociado_a: "Asociado a", utilizado_por: "Utilizado por", marco_de: "Marco de", coordinado_por: "Coordinado por", desarrollado_por: "Desarrollado por", declara_organizacion: "Declara como organización", presenta_como_academia: "Presenta como academia",
  };
  return labels[value] ?? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function auditActionLabel(action: string) {
  return ({ insert: "Creó", update: "Editó", delete: "Borró" } as Record<string, string>)[action] ?? titleCase(action);
}

function auditTypeLabel(table: string) {
  return ({ entities: "entidad", entity_relationships: "relación", entity_documents: "documento", missions: "objetivo", projects: "proyecto", tasks: "tarea", metrics: "métrica", metric_values: "valor de métrica", internal_accounts: "cuenta", operation_events: "movimiento", resources: "archivo" } as Record<string, string>)[table] ?? titleCase(table);
}

function cacheDocumentDraft(id: string | null, title: string, content: string) {
  if (!id || typeof window === "undefined") return;
  try { window.localStorage.setItem(`sis-draft:${id}`, JSON.stringify({ title, content, savedAt: new Date().toISOString() })); } catch { /* Storage can be unavailable in strict browser modes. */ }
}

async function readAppData(client: ReturnType<typeof getSupabase>): Promise<AppData> {
  const [entities, relationships, documents, missions, projects, tasks, metrics, metricValues, accounts, accountBalances, operations, resources, auditEvents] = await Promise.all([
    client.from("entities").select("*").order("name"),
    client.from("entity_relationships").select("*").order("created_at"),
    client.from("entity_documents").select("*").order("updated_at", { ascending: false }),
    client.from("missions").select("*").order("created_at", { ascending: false }),
    client.from("projects").select("*").order("created_at", { ascending: false }),
    client.from("tasks").select("*").order("created_at", { ascending: false }),
    client.from("metrics").select("*").order("name"),
    client.from("metric_values").select("*").order("recorded_on", { ascending: false }).limit(1000),
    client.from("internal_accounts").select("*").order("name"),
    client.from("account_balances").select("id,balance_cop"),
    client.from("operation_events").select("*").order("occurred_on", { ascending: false }).limit(1000),
    client.from("resources").select("*").order("created_at", { ascending: false }),
    client.from("audit_events").select("*").order("created_at", { ascending: false }).limit(30),
  ]);
  const firstError = [entities, relationships, documents, missions, projects, tasks, metrics, metricValues, accounts, accountBalances, operations, resources, auditEvents].find((item) => item.error)?.error;
  if (firstError) throw firstError;
  return {
    entities: (entities.data ?? []) as Entity[],
    relationships: (relationships.data ?? []) as EntityRelationship[],
    documents: (documents.data ?? []) as EntityDocument[],
    missions: (missions.data ?? []) as Mission[],
    projects: (projects.data ?? []) as Project[],
    tasks: (tasks.data ?? []) as Task[],
    metrics: (metrics.data ?? []) as Metric[],
    metricValues: (metricValues.data ?? []) as MetricValue[],
    accounts: (accounts.data ?? []) as InternalAccount[],
    accountBalances: (accountBalances.data ?? []) as { id: string; balance_cop: number }[],
    operations: (operations.data ?? []) as OperationEvent[],
    resources: (resources.data ?? []) as Resource[],
    auditEvents: (auditEvents.data ?? []) as AuditEvent[],
  };
}

async function fetchEntireTable(client: ReturnType<typeof getSupabase>, table: string, orderBy: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await client.from(table).select("*").order(orderBy).range(from, from + 999);
    if (error) throw error;
    rows.push(...(page ?? []));
    if (!page || page.length < 1000) return rows;
  }
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-heading"><div><span className="eyebrow">SIS · EDICIÓN</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}

export default function SisApp() {
  const [client, setClient] = useState<ReturnType<typeof getSupabase> | null>(null);
  const [configError, setConfigError] = useState("");
  const [mode, setMode] = useState<"checking" | "login" | "mfa" | "app">("checking");
  const [user, setUser] = useState<User | null>(null);
  const [mfaFlow, setMfaFlow] = useState<MfaFlow | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("home");
  const [data, setData] = useState<AppData>(emptyData);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [entityDialog, setEntityDialog] = useState<Entity | "new" | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("Sin cambios");
  const [missionDialog, setMissionDialog] = useState(false);
  const [projectMissionId, setProjectMissionId] = useState<string | null>(null);
  const [taskMissionId, setTaskMissionId] = useState<string | null>(null);
  const [metricDialog, setMetricDialog] = useState(false);
  const [valueMetricId, setValueMetricId] = useState<string | null>(null);
  const [operationDialog, setOperationDialog] = useState(false);
  const [accountDialog, setAccountDialog] = useState(false);
  const [editRecord, setEditRecord] = useState<{ table: string; record: object } | null>(null);
  const [relationshipEntityId, setRelationshipEntityId] = useState<string | null>(null);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [historyRows, setHistoryRows] = useState<{ id: string; snapshot: Record<string, unknown>; created_at: string }[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ table: string; id: string; title: string } | null>(null);
  const docSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (currentClient = client) => {
    if (!currentClient) return;
    setDataLoading(true);
    setDataError("");
    try {
      const next = await readAppData(currentClient);
      setData(next);
      return next;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible cargar los datos.";
      setDataError(message);
      throw error;
    } finally {
      setDataLoading(false);
    }
  }, [client]);

  const startMfa = useCallback(async (currentClient: ReturnType<typeof getSupabase>, currentUser: User) => {
    const founderId = getFounderId();
    if (!founderId) throw new Error("Configura NEXT_PUBLIC_FOUNDER_USER_ID para habilitar el acceso privado.");
    if (currentUser.id !== founderId) {
      await currentClient.auth.signOut();
      throw new Error("Esta cuenta no está autorizada para SIS.");
    }
    const { data: factorData, error: factorError } = await currentClient.auth.mfa.listFactors();
    if (factorError) throw factorError;
    const verifiedFactor = factorData.totp.find((factor) => factor.status === "verified");
    if (verifiedFactor) {
      const { data: challenge, error: challengeError } = await currentClient.auth.mfa.challenge({ factorId: verifiedFactor.id });
      if (challengeError) throw challengeError;
      setMfaFlow({ kind: "challenge", factorId: verifiedFactor.id, challengeId: challenge.id });
    } else {
      const { data: enrollment, error: enrollmentError } = await currentClient.auth.mfa.enroll({ factorType: "totp", friendlyName: "SIS · Andrei / Founder" });
      if (enrollmentError) throw enrollmentError;
      setMfaFlow({ kind: "enroll", factorId: enrollment.id, uri: enrollment.totp.uri, secret: enrollment.totp.secret });
    }
    setUser(currentUser);
    setMode("mfa");
    setCode("");
  }, []);

  useEffect(() => {
    let alive = true;
    try {
      const currentClient = getSupabase();
      setClient(currentClient);
      setConfigError("");
      void (async () => {
        const { data: sessionData, error } = await currentClient.auth.getSession();
        if (error) throw error;
        if (!alive) return;
        if (!sessionData.session) { setMode("login"); return; }
        const { data: userData, error: userError } = await currentClient.auth.getUser();
        if (userError || !userData.user) { setMode("login"); return; }
        if (!getFounderId() || userData.user.id !== getFounderId()) {
          await currentClient.auth.signOut();
          if (alive) { setAuthError("Esta cuenta no está autorizada para SIS."); setMode("login"); }
          return;
        }
        const { data: assurance, error: assuranceError } = await currentClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance?.currentLevel === "aal2") {
          setUser(userData.user);
          setMode("app");
          await load(currentClient).catch(() => undefined);
        } else {
          await startMfa(currentClient, userData.user);
        }
      })().catch((error: unknown) => {
        if (!alive) return;
        setAuthError(error instanceof Error ? error.message : "No se pudo comprobar la sesión.");
        setMode("login");
      });
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Configura la conexión con Supabase.");
      setMode("login");
    }
    return () => { alive = false; };
  }, [load, startMfa]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); searchRef.current?.focus(); }
      if (event.key === "Escape" && document.activeElement === searchRef.current) { setQuery(""); searchRef.current?.blur(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedEntity = data.entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedDoc = data.documents.find((document) => document.id === docId) ?? null;
  const editValues = editRecord?.record as Record<string, unknown> | undefined;
  const entityName = (id: string | null) => data.entities.find((entity) => entity.id === id)?.name ?? "Red Soverath";

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setAuthError("");
    try {
      const { data: signedIn, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!signedIn.user) throw new Error("No se pudo validar la cuenta.");
      if (!getFounderId() || signedIn.user.id !== getFounderId()) {
        await client.auth.signOut();
        throw new Error("La cuenta no coincide con el Founder configurado en el entorno.");
      }
      await startMfa(client, signedIn.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally { setBusy(false); }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !mfaFlow) return;
    setBusy(true); setAuthError("");
    try {
      let challengeId = mfaFlow.kind === "challenge" ? mfaFlow.challengeId : "";
      if (mfaFlow.kind === "enroll") {
        const { data: challenge, error } = await client.auth.mfa.challenge({ factorId: mfaFlow.factorId });
        if (error) throw error;
        challengeId = challenge.id;
      }
      const { error: verifyError } = await client.auth.mfa.verify({ factorId: mfaFlow.factorId, challengeId, code: code.replace(/\s/g, "") });
      if (verifyError) throw verifyError;
      await client.auth.refreshSession();
      const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (!assurance || assurance.currentLevel !== "aal2") throw new Error("El segundo factor no llegó al nivel seguro requerido. Intenta otra vez.");
      const { data: verifiedUser } = await client.auth.getUser();
      setUser(verifiedUser.user);
      setMode("app");
      setMfaFlow(null);
      await load(client);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo validar el código.");
    } finally { setBusy(false); }
  }

  async function signOut() {
    if (client && selectedDoc && (selectedDoc.title !== docTitle || selectedDoc.content !== docContent)) {
      cacheDocumentDraft(selectedDoc.id, docTitle, docContent);
      await client.from("entity_documents").update({ title: docTitle, content: docContent }).eq("id", selectedDoc.id);
    }
    if (client) await client.auth.signOut();
    setUser(null); setData(emptyData); setMode("login"); setMfaFlow(null); setView("home");
  }

  async function importInitialData() {
    if (!client || !user || globalBusy) return;
    setGlobalBusy(true); setDataError("");
    try {
      const existingResult = await client.from("entities").select("id,slug");
      if (existingResult.error) throw existingResult.error;
      const ids = new Map<string, string>((existingResult.data ?? []).map((row: { id: string; slug: string }) => [row.slug, row.id]));
      let added = 0;
      for (const item of seedEntities) {
        if (ids.has(item.slug)) continue;
        const parentId = item.parent_slug ? ids.get(item.parent_slug) ?? null : null;
        const { data: inserted, error } = await client.from("entities").insert({
          slug: item.slug,
          name: item.name,
          entity_type: item.entity_type,
          status: item.status,
          summary: item.summary,
          description: item.description ?? "",
          parent_id: parentId,
          source_url: item.source_url ?? null,
          catalog_source_url: catalogSeedSlugs.has(item.slug) ? seedSourceUrl : item.entity_type === "system" ? "https://soverath.presentto.online/sistemas" : null,
          provenance: item.provenance,
          source_observed_at: item.provenance === "public_observation" ? seedObservedAt : null,
        }).select("id,slug").single();
        if (error) throw error;
        ids.set(inserted.slug, inserted.id);
        added += 1;
      }
      const existingRelations = await client.from("entity_relationships").select("source_entity_id,target_entity_id,relationship_type");
      if (existingRelations.error) throw existingRelations.error;
      const relationKeys = new Set((existingRelations.data ?? []).map((row: { source_entity_id: string; target_entity_id: string; relationship_type: string }) => `${row.source_entity_id}:${row.target_entity_id}:${row.relationship_type}`));
      const toInsert = seedRelationships.flatMap((relation) => {
        const sourceId = ids.get(relation.source); const targetId = ids.get(relation.target);
        if (!sourceId || !targetId || relationKeys.has(`${sourceId}:${targetId}:${relation.relationship_type}`)) return [];
        return [{ source_entity_id: sourceId, target_entity_id: targetId, relationship_type: relation.relationship_type, evidence: relation.evidence, source_url: relation.source_url ?? null, provenance: relation.provenance }];
      });
      if (toInsert.length) {
        const { error } = await client.from("entity_relationships").insert(toInsert);
        if (error) throw error;
      }
      const existingDocuments = await client.from("entity_documents").select("seed_key");
      if (existingDocuments.error) throw existingDocuments.error;
      const seedKeys = new Set((existingDocuments.data ?? []).map((row: { seed_key: string | null }) => row.seed_key).filter(Boolean));
      const documentsToInsert = seedDocuments.flatMap((document) => {
        const entityId = ids.get(document.entity_slug);
        if (!entityId || seedKeys.has(document.seed_key)) return [];
        return [{ seed_key: document.seed_key, entity_id: entityId, title: document.title, document_type: document.document_type, content: document.content, source_url: document.source_url, source_observed_at: seedObservedAt, provenance: document.provenance }];
      });
      if (documentsToInsert.length) {
        const { error } = await client.from("entity_documents").insert(documentsToInsert);
        if (error) throw error;
      }
      await load(client);
      setNotice(added || documentsToInsert.length ? `Base de Soverath importada · ${added} registros y ${documentsToInsert.length} textos nuevos.` : "La base inicial ya está presente; se conservaron tus ediciones.");
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "No se pudo importar la base inicial.");
    } finally { setGlobalBusy(false); }
  }

  async function saveEntity(values: Record<string, string | null>) {
    if (!client) return;
    const current = entityDialog !== "new" ? entityDialog : null;
    const nullable = ["parent_id", "source_url", "source_observed_at"];
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, nullable.includes(key) && value === "" ? null : value]));
    const payload = { ...normalized, ...(current ? {} : { slug: slugify(String(values.name ?? "")), provenance: values.provenance || "founder_confirmed" }) };
    const result = current
      ? await client.from("entities").update(payload).eq("id", current.id)
      : await client.from("entities").insert(payload);
    if (result.error) throw result.error;
    await load(client); setEntityDialog(null); setNotice(current ? "Entidad actualizada." : "Entidad creada.");
  }

  async function removeEntity(entity: Entity) {
    if (!client || !window.confirm(`¿Borrar permanentemente “${entity.name}” y desvincular sus registros relacionados?`)) return;
    const { error } = await client.from("entities").delete().eq("id", entity.id);
    if (error) { setDataError(error.message); return; }
    setSelectedEntityId(null); await load(client); setNotice("Entidad borrada.");
  }

  async function createDocument() {
    if (!client) return;
    const entityId = selectedEntityId;
    const { data: inserted, error } = await client.from("entity_documents").insert({ entity_id: entityId, title: "Nuevo texto", document_type: "strategy", content: "", provenance: "founder_confirmed" }).select("*").single();
    if (error) { setDataError(error.message); return; }
    await load(client); setDocId(inserted.id); setDocTitle(inserted.title); setDocContent(inserted.content); setSaveStatus("Guardado"); setSelectedEntityId(null); setView("knowledge");
  }

  async function deleteDocument(document: EntityDocument) {
    if (!client || !window.confirm(`¿Borrar permanentemente “${document.title}”?`)) return;
    const { error } = await client.from("entity_documents").delete().eq("id", document.id);
    if (error) { setDataError(error.message); return; }
    if (docId === document.id) { setDocId(null); setDocTitle(""); setDocContent(""); }
    await load(client); setNotice("Documento borrado.");
  }

  async function updateDocumentMetadata(document: EntityDocument, updates: Record<string, unknown>) {
    if (!client) return;
    const { error } = await client.from("entity_documents").update(updates).eq("id", document.id);
    if (error) { setDataError(error.message); return; }
    await load(client); setNotice("Fuente del texto actualizada.");
  }

  useEffect(() => {
    if (!client || mode !== "app" || !selectedDoc) return;
    if (selectedDoc.title === docTitle && selectedDoc.content === docContent) return;
    if (docSaveTimer.current) clearTimeout(docSaveTimer.current);
    setSaveStatus("Guardando…");
    docSaveTimer.current = setTimeout(async () => {
      const { error } = await client.from("entity_documents").update({ title: docTitle, content: docContent }).eq("id", selectedDoc.id);
      if (error) { cacheDocumentDraft(selectedDoc.id, docTitle, docContent); setSaveStatus("Borrador local · sin sincronizar"); setDataError(error.message); return; }
      try { window.localStorage.removeItem(`sis-draft:${selectedDoc.id}`); } catch { /* Ignore unavailable browser storage. */ }
      setData((old) => ({ ...old, documents: old.documents.map((item) => item.id === selectedDoc.id ? { ...item, title: docTitle, content: docContent } : item) }));
      setSaveStatus(`Guardado · ${new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`);
    }, 900);
    return () => { if (docSaveTimer.current) clearTimeout(docSaveTimer.current); };
  }, [client, mode, selectedDoc, docTitle, docContent]);

  async function uploadFile(file: File) {
    if (!client || !user) return;
    const cleanName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-");
    const path = `${user.id}/${crypto.randomUUID()}-${cleanName}`;
    setGlobalBusy(true);
    try {
      const { error: uploadError } = await client.storage.from("sis-private").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await client.from("resources").insert({ entity_id: selectedEntityId ?? selectedDoc?.entity_id ?? null, document_id: docId, name: file.name, mime_type: file.type || "application/octet-stream", byte_size: file.size, storage_path: path });
      if (error) { await client.storage.from("sis-private").remove([path]); throw error; }
      await load(client); setNotice("Archivo guardado en el espacio privado.");
    } catch (error) { setDataError(error instanceof Error ? error.message : "No se pudo guardar el archivo."); }
    finally { setGlobalBusy(false); }
  }

  async function downloadResource(resource: Resource) {
    if (!client) return;
    const { data: signed, error } = await client.storage.from("sis-private").createSignedUrl(resource.storage_path, 60, { download: resource.name });
    if (error) { setDataError(error.message); return; }
    const anchor = window.document.createElement("a");
    anchor.href = signed.signedUrl;
    anchor.download = resource.name;
    anchor.rel = "noreferrer";
    anchor.click();
  }

  async function removeResource(resource: Resource) {
    if (!client || !window.confirm(`¿Borrar permanentemente el archivo “${resource.name}”?`)) return;
    const { error: storageError } = await client.storage.from("sis-private").remove([resource.storage_path]);
    if (storageError) { setDataError(storageError.message); return; }
    const { error } = await client.from("resources").delete().eq("id", resource.id);
    if (error) { setDataError(error.message); return; }
    await load(client); setNotice("Archivo borrado.");
  }

  async function openHistory(entity: Entity) {
    setSelectedEntityId(entity.id);
    if (!client) return;
    const { data: rows, error } = await client.from("record_revisions").select("id,snapshot,created_at").eq("record_table", "entities").eq("record_id", entity.id).order("created_at", { ascending: false }).limit(20);
    if (error) { setDataError(error.message); return; }
    setHistoryRows((rows ?? []) as typeof historyRows);
    setHistoryTarget({ table: "entities", id: entity.id, title: entity.name });
    setHistoryOpen(true);
  }

  async function openDocumentHistory(document: EntityDocument) {
    if (!client) return;
    const { data: rows, error } = await client.from("record_revisions").select("id,snapshot,created_at").eq("record_table", "entity_documents").eq("record_id", document.id).order("created_at", { ascending: false }).limit(20);
    if (error) { setDataError(error.message); return; }
    setHistoryRows((rows ?? []) as typeof historyRows);
    setHistoryTarget({ table: "entity_documents", id: document.id, title: document.title });
    setHistoryOpen(true);
  }

  async function restoreSnapshot(snapshot: Record<string, unknown>) {
    if (!client || !historyTarget) return;
    if (!window.confirm("¿Restaurar esta versión? La información actual quedará guardada en el historial.")) return;
    const entityFields = ["name", "entity_type", "status", "summary", "description", "parent_id", "source_url", "catalog_source_url", "provenance", "source_observed_at"];
    const documentFields = ["entity_id", "title", "document_type", "content", "source_url", "source_observed_at", "provenance"];
    const fields = historyTarget.table === "entities" ? entityFields : documentFields;
    const payload = Object.fromEntries(fields.map((field) => [field, snapshot[field] ?? null]));
    const { error } = await client.from(historyTarget.table).update(payload).eq("id", historyTarget.id);
    if (error) { setDataError(error.message); return; }
    await load(client); setNotice("Versión restaurada.");
  }

  async function saveMission(form: HTMLFormElement) {
    if (!client) return;
    const fields = new FormData(form);
    const { error } = await client.from("missions").insert({ title: fields.get("title"), goal: fields.get("goal"), success_metric: fields.get("success_metric"), status: "planned", entity_id: fields.get("entity_id") || null, target_date: fields.get("target_date") || null });
    if (error) throw error;
    setMissionDialog(false); await load(client); setNotice("Misión creada.");
  }

  async function saveTask(form: HTMLFormElement) {
    if (!client || !taskMissionId) return;
    const fields = new FormData(form);
    const { error } = await client.from("tasks").insert({ mission_id: taskMissionId, title: fields.get("title"), notes: fields.get("notes"), priority: fields.get("priority"), due_date: fields.get("due_date") || null, status: "todo" });
    if (error) throw error;
    setTaskMissionId(null); await load(client); setNotice("Tarea creada.");
  }

  async function saveProject(form: HTMLFormElement) {
    if (!client || !projectMissionId) return;
    const fields = new FormData(form);
    const mission = data.missions.find((item) => item.id === projectMissionId);
    const { error } = await client.from("projects").insert({ mission_id: projectMissionId, entity_id: mission?.entity_id ?? null, title: fields.get("title"), summary: fields.get("summary"), target_date: fields.get("target_date") || null, status: "planned" });
    if (error) throw error;
    setProjectMissionId(null); await load(client); setNotice("Proyecto creado.");
  }

  async function updateTaskStatus(task: Task, status: string) {
    if (!client) return;
    const { error } = await client.from("tasks").update({ status }).eq("id", task.id);
    if (error) { setDataError(error.message); return; }
    await load(client);
  }

  async function saveMetric(form: HTMLFormElement) {
    if (!client) return;
    const fields = new FormData(form);
    const { error } = await client.from("metrics").insert({ name: fields.get("name"), description: fields.get("description"), unit: fields.get("unit"), frequency: fields.get("frequency"), target_value: fields.get("target_value") || null, entity_id: fields.get("entity_id") || null });
    if (error) throw error;
    setMetricDialog(false); await load(client); setNotice("Métrica creada.");
  }

  async function saveMetricValue(form: HTMLFormElement) {
    if (!client || !valueMetricId) return;
    const fields = new FormData(form);
    const { error } = await client.from("metric_values").insert({ metric_id: valueMetricId, value: fields.get("value"), note: fields.get("note"), recorded_on: fields.get("recorded_on"), provenance: "founder_confirmed" });
    if (error) throw error;
    setValueMetricId(null); await load(client); setNotice("Valor registrado.");
  }

  async function saveOperation(form: HTMLFormElement) {
    if (!client) return;
    const fields = new FormData(form);
    if (fields.get("event_type") === "transfer" && (!fields.get("account_id") || !fields.get("counter_account_id") || fields.get("account_id") === fields.get("counter_account_id"))) throw new Error("Una transferencia requiere dos cuentas distintas.");
    const rawAmount = String(fields.get("amount_cop") ?? "").replace(/[.\s]/g, "").replace(",", ".");
    if (fields.get("event_type") === "transfer" && Number(rawAmount) <= 0) throw new Error("Una transferencia requiere un importe mayor que cero.");
    const { error } = await client.from("operation_events").insert({ event_type: fields.get("event_type"), title: fields.get("title"), occurred_on: fields.get("occurred_on"), amount_cop: rawAmount ? Number(rawAmount) : null, entity_id: fields.get("entity_id") || null, account_id: fields.get("account_id") || null, counter_account_id: fields.get("counter_account_id") || null, account_effect: fields.get("account_effect") || "none", details: { counterparty: fields.get("counterparty"), quantity: fields.get("quantity"), unit: fields.get("unit"), reference: fields.get("reference"), payment_method: fields.get("payment_method") }, notes: fields.get("notes") });
    if (error) throw error;
    setOperationDialog(false); await load(client); setNotice("Evento operativo guardado.");
  }

  async function saveEditedRecord(form: HTMLFormElement) {
    if (!client || !editRecord) return;
    const fields = new FormData(form);
    const payload: Record<string, unknown> = Object.fromEntries(fields.entries());
    for (const key of ["entity_id", "document_id", "mission_id", "project_id", "account_id", "counter_account_id", "target_date", "due_date"]) if (payload[key] === "") payload[key] = null;
    if (editRecord.table === "operation_events") {
      if (payload.event_type === "transfer" && (!payload.account_id || !payload.counter_account_id || payload.account_id === payload.counter_account_id)) throw new Error("Una transferencia requiere dos cuentas distintas.");
      const rawAmount = String(fields.get("amount_cop") ?? "").replace(/[.\s]/g, "").replace(",", ".");
      if (payload.event_type === "transfer" && Number(rawAmount) <= 0) throw new Error("Una transferencia requiere un importe mayor que cero.");
      payload.amount_cop = rawAmount ? Number(rawAmount) : null;
      payload.details = { counterparty: fields.get("counterparty"), quantity: fields.get("quantity"), unit: fields.get("unit"), reference: fields.get("reference"), payment_method: fields.get("payment_method") };
    }
    if (editRecord.table === "metrics") payload.target_value = payload.target_value === "" ? null : Number(payload.target_value);
    if (editRecord.table === "internal_accounts") payload.opening_balance_cop = Number(fields.get("opening_balance_cop") || 0);
    const { error } = await client.from(editRecord.table).update(payload).eq("id", String((editRecord.record as { id: string }).id));
    if (error) throw error;
    setEditRecord(null); await load(client); setNotice("Cambios guardados.");
  }

  async function saveRelationship(form: HTMLFormElement) {
    if (!client || !relationshipEntityId) return;
    const fields = new FormData(form);
    const { error } = await client.from("entity_relationships").insert({
      source_entity_id: relationshipEntityId,
      target_entity_id: fields.get("target_entity_id"),
      relationship_type: fields.get("relationship_type"),
      evidence: fields.get("evidence"),
      provenance: fields.get("provenance"),
      source_url: fields.get("source_url") || null,
    });
    if (error) throw error;
    setRelationshipEntityId(null); await load(client); setNotice("Relación añadida.");
  }

  async function saveAccount(form: HTMLFormElement) {
    if (!client) return;
    const fields = new FormData(form);
    const { error } = await client.from("internal_accounts").insert({ name: fields.get("name"), account_type: fields.get("account_type"), entity_id: fields.get("entity_id") || null, opening_balance_cop: Number(fields.get("opening_balance_cop") || 0), purpose: fields.get("purpose") });
    if (error) throw error;
    setAccountDialog(false); await load(client); setNotice("Cuenta interna creada.");
  }

  async function deleteRow(table: string, id: string, label: string) {
    if (!client || !window.confirm(`¿Borrar permanentemente “${label}”?`)) return;
    const { error } = await client.from(table).delete().eq("id", id);
    if (error) { setDataError(error.message); return; }
    await load(client); setNotice("Registro borrado.");
  }

  function openAuditRecord(event: AuditEvent) {
    if (event.record_table === "entities" && event.record_id) {
      setView("network"); setSelectedEntityId(event.record_id); return;
    }
    if (event.record_table === "entity_documents" && event.record_id) {
      const document = data.documents.find((item) => item.id === event.record_id);
      if (document) chooseDocument(document);
      setView("knowledge"); return;
    }
    if (["missions", "projects", "tasks"].includes(event.record_table)) { setView("missions"); return; }
    if (["metrics", "metric_values"].includes(event.record_table)) { setView("metrics"); return; }
    if (["operation_events", "internal_accounts"].includes(event.record_table)) { setView("operations"); return; }
    setView("knowledge");
  }

  async function exportBackup() {
    if (!client) return;
    setGlobalBusy(true);
    try {
      const tables = [
        ["entities", "name"], ["entity_relationships", "created_at"], ["entity_documents", "updated_at"],
        ["missions", "created_at"], ["projects", "created_at"], ["tasks", "created_at"],
        ["metrics", "name"], ["metric_values", "recorded_on"], ["internal_accounts", "name"],
        ["operation_events", "occurred_on"], ["resources", "created_at"], ["record_revisions", "created_at"], ["audit_events", "created_at"],
      ];
      const exported = await Promise.all(tables.map(async ([table, orderBy]) => [table, await fetchEntireTable(client, table, orderBy)] as const));
      const payload = { schema_version: 1, exported_at: new Date().toISOString(), workspace: "Soverath Internal System", owner: "Andrei / Founder", data: Object.fromEntries(exported) };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `sis-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setNotice("Respaldo JSON descargado. Los archivos binarios se descargan desde Conocimiento.");
    } catch (error) { setDataError(error instanceof Error ? error.message : "No se pudo generar el respaldo."); }
    finally { setGlobalBusy(false); }
  }

  const filteredEntities = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return data.entities;
    return data.entities.filter((entity) => [entity.slug, entity.name, entity.summary, entity.description, entity.status, entity.entity_type, entity.source_url].some((value) => value?.toLocaleLowerCase("es").includes(needle)));
  }, [data.entities, query]);

  if (mode === "checking") return <div className="screen-center"><div className="loading-mark"><Image src="/soverath-logo.png" alt="Soverath" width={52} height={52} priority /></div><span>Conectando SIS</span></div>;

  if (mode === "login" || mode === "mfa") {
    return <main className="auth-screen">
      <div className="auth-visual">
        <div className="auth-mark"><Image src="/soverath-logo.png" alt="Soverath" width={76} height={76} priority /><span>SOVERATH<br />INTERNAL SYSTEM</span></div>
        <div className="auth-phrase"><span className="eyebrow">SIS · ACCESO</span><h1>Acceso al sistema</h1><p>Gestión de entidades, documentos, objetivos, métricas y movimientos.</p></div>
        <div className="auth-bottom">Sistema privado de uso interno</div>
      </div>
      <section className="auth-panel">
        <div className="auth-mobile-mark"><Image src="/soverath-logo.png" alt="" width={42} height={42} /><span>SIS</span></div>
        <div className="auth-content">
          <span className="eyebrow">{mode === "mfa" ? "VERIFICACIÓN DE DOS PASOS" : "ACCESO FUNDADOR"}</span>
          <h2>{mode === "mfa" ? mfaFlow?.kind === "enroll" ? "Activa tu autenticador." : "Confirma tu identidad." : "Bienvenido, Andrei."}</h2>
          <p className="auth-intro">{mode === "mfa" ? mfaFlow?.kind === "enroll" ? "Escanea el código QR con Google Authenticator y escribe el código de seis dígitos." : "Abre Google Authenticator y escribe el código temporal de seis dígitos." : "Soverath Internal System es un espacio privado para tu operación."}</p>
          {configError && <div className="notice-block"><strong>Falta conectar Supabase</strong><span>{configError}</span><small>Completa `.env.local` y aplica la migración SQL antes de iniciar.</small></div>}
          {mode === "login" ? <form className="form-stack" onSubmit={submitLogin}>
            <label>Correo de Founder<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            <button className="button button-dark button-full" disabled={busy || !client}>{busy ? "Validando…" : "Entrar al sistema"}<ArrowRight size={16} /></button>
            <div className="auth-secure"><LockKeyhole size={14} /> Solo cuenta autorizada · factor TOTP obligatorio</div>
          </form> : <form className="form-stack" onSubmit={submitMfa}>
            {mfaFlow?.kind === "enroll" && <div className="qr-card"><QRCodeSVG value={mfaFlow.uri} size={176} includeMargin /><p>¿No puedes escanear? Introduce esta clave manualmente:</p><code>{mfaFlow.secret}</code></div>}
            <label>Código del autenticador<input className="code-input" type="text" inputMode="numeric" pattern="[0-9 ]{6,8}" autoComplete="one-time-code" maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9 ]/g, ""))} required autoFocus /></label>
            <button className="button button-dark button-full" disabled={busy || code.replace(/\s/g, "").length < 6}>{busy ? "Verificando…" : "Verificar y continuar"}<ShieldCheck size={16} /></button>
            <button className="text-button" type="button" onClick={signOut}>Cancelar y salir</button>
          </form>}
          {authError && <div className="error-message" role="alert">{authError}</div>}
        </div>
        <div className="auth-footer"><ShieldCheck size={14} /> Sesión protegida con autenticación multifactor</div>
      </section>
    </main>;
  }

  const currentCopy = viewCopy[view];
  const activeTasks = data.tasks.filter((task) => task.status !== "done");
  const openMissions = data.missions.filter((mission) => mission.status === "active" || mission.status === "planned");
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthOperations = data.operations.filter((operation) => operation.occurred_on?.startsWith(monthKey));
  const monthAmount = monthOperations.reduce((sum, operation) => sum + (Number(operation.amount_cop) || 0), 0);
  const accountBalance = (account: InternalAccount) => data.accountBalances.find((balance) => balance.id === account.id)?.balance_cop ?? Number(account.opening_balance_cop) ?? 0;
  const filteredDocuments = data.documents.filter((document) => !query.trim() || `${document.title} ${document.content}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const visibleResources = data.resources.filter((resource) => !docId || resource.document_id === docId || resource.entity_id === selectedEntityId);

  function runForm(event: FormEvent<HTMLFormElement>, action: (form: HTMLFormElement) => Promise<void>) {
    event.preventDefault();
    const form = event.currentTarget;
    setGlobalBusy(true);
    void action(form).catch((error: unknown) => setDataError(error instanceof Error ? error.message : "No se pudo guardar el registro.")).finally(() => setGlobalBusy(false));
  }

  function chooseDocument(document: EntityDocument) {
    if (client && selectedDoc && (selectedDoc.title !== docTitle || selectedDoc.content !== docContent)) {
      cacheDocumentDraft(selectedDoc.id, docTitle, docContent);
      void client.from("entity_documents").update({ title: docTitle, content: docContent }).eq("id", selectedDoc.id).then(({ error }) => {
        if (!error) { try { window.localStorage.removeItem(`sis-draft:${selectedDoc.id}`); } catch { /* Ignore unavailable browser storage. */ } }
      });
    }
    let cached: { title?: string; content?: string } | null = null;
    try { cached = JSON.parse(window.localStorage.getItem(`sis-draft:${document.id}`) ?? "null") as { title?: string; content?: string } | null; } catch { cached = null; }
    if (cached?.title === document.title && cached?.content === document.content) {
      try { window.localStorage.removeItem(`sis-draft:${document.id}`); } catch { /* Ignore unavailable browser storage. */ }
      cached = null;
    }
    setDocId(document.id); setDocTitle(cached?.title ?? document.title); setDocContent(cached?.content ?? document.content); setSaveStatus(cached ? "Borrador local · sincronizando…" : "Guardado");
  }

  const monthShort = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(new Date());

  return <div className="sis-shell">
    <aside className="sidebar">
      <div className="brand-lockup"><Image src="/soverath-logo.png" alt="Soverath" width={42} height={42} priority /><div><strong>SOVERATH</strong><span>INTERNAL SYSTEM</span></div></div>
      <div className="sidebar-rule" />
      <div className="sidebar-label">ESPACIO DE TRABAJO</div>
      <nav className="side-nav" aria-label="Navegación principal">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => setView(item.id)} className={`nav-item ${view === item.id ? "active" : ""}`}>
            <Icon size={18} strokeWidth={view === item.id ? 2.2 : 1.7} /><span>{item.label}</span>{index === 1 && data.entities.length > 0 && <span className="nav-count">{data.entities.length}</span>}
          </button>;
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="private-badge"><span className="status-dot" /><span><b>Espacio privado</b><small>Founder · AAL2 activo</small></span><ShieldCheck size={16} /></div>
        <button className="profile-button" onClick={signOut}><div className="avatar">A</div><span><b>Andrei / Founder</b><small>{user?.email}</small></span><LogOut size={16} /></button>
        <div className="sidebar-version">SIS · BASE 0.1 <span>BOGOTÁ</span></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumb"><span>SOVERATH</span><span className="crumb-separator">/</span><b>{currentCopy.title.toLocaleUpperCase("es")}</b></div>
        <div className="topbar-actions"><label className="global-search"><Search size={16} /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en SIS" aria-label="Buscar en SIS" /><kbd>⌘ K</kbd></label><button className="top-avatar" title="Cerrar sesión" onClick={signOut}>A</button></div>
      </header>

      <div className="page-scroll">
        <div className="page-heading"><div><span className="eyebrow">SOVERATH · SISTEMA INTERNO</span><h1>{currentCopy.title}</h1><p>{currentCopy.description}</p></div><div className="heading-status"><span className={`status-dot ${saveStatus.includes("sin sincronizar") ? "save-error" : ""}`} />{saveStatus.includes("sin sincronizar") ? "BORRADOR LOCAL" : "SINCRONIZADO"}</div></div>
        {dataError && <div className="error-banner"><div><strong>Revisa esta operación</strong><span>{dataError}</span></div><button onClick={() => setDataError("")} className="icon-button" aria-label="Cerrar"><X size={16} /></button></div>}
        {notice && <div className="success-toast"><Check size={16} />{notice}</div>}
        {dataLoading && <div className="sync-line"><span className="loader-dot" />Actualizando información…</div>}

        {view === "home" && <section className="view-stack">
          {data.entities.length === 0 ? <div className="welcome-panel"><div className="welcome-copy"><span className="eyebrow">PRIMER INICIO</span><h2>La red empieza<br />a tomar forma aquí.</h2><p>Importa las entidades y metodologías del catálogo público como base revisable. Las relaciones y estrategias seguirán siendo tuyas para confirmar y editar.</p><button className="button button-dark" disabled={globalBusy} onClick={importInitialData}>{globalBusy ? "Preparando base…" : "Cargar base inicial"}<ArrowRight size={16} /></button></div><div className="welcome-mark"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><Image src="/soverath-logo.png" alt="" width={160} height={160} /></div></div> : <>
            <div className="hero-line"><div><span className="eyebrow">{monthShort.toLocaleUpperCase("es")}</span><h2>La red, en movimiento.</h2><p>Elige un frente y continúa donde dejaste la operación.</p></div><button className="button button-outline" onClick={importInitialData} disabled={globalBusy}><Database size={16} />{globalBusy ? "Revisando…" : "Completar catálogo"}</button></div>
            <div className="stat-grid"><article className="stat-card"><span>ENTIDADES</span><strong>{data.entities.length}</strong><small>En tu espacio de trabajo</small><Building2 size={18} /></article><article className="stat-card"><span>TAREAS ABIERTAS</span><strong>{activeTasks.length}</strong><small>{data.tasks.filter((task) => task.status === "blocked").length} bloqueadas</small><Target size={18} /></article><article className="stat-card"><span>MISIONES ACTIVAS</span><strong>{openMissions.length}</strong><small>Planificadas o en curso</small><Layers3 size={18} /></article><article className="stat-card"><span>MOVIMIENTOS · {monthShort.toLocaleUpperCase("es")}</span><strong className="stat-money">{formatCOP(monthAmount)}</strong><small>{monthOperations.length} eventos registrados</small><Activity size={18} /></article></div>
            <div className="home-columns"><section className="panel network-panel"><div className="section-heading"><div><span className="eyebrow">ESTRUCTURA</span><h3>Capas de coordinación</h3></div><button className="link-button" onClick={() => setView("network")}>Ver red <ArrowRight size={14} /></button></div><div className="layer-list">{data.entities.filter((entity) => entity.entity_type === "coordinator").sort((a, b) => a.name === "Soverath Holding" ? -1 : b.name === "Soverath Holding" ? 1 : a.name.localeCompare(b.name, "es")).map((entity, index) => <button key={entity.id} className="layer-row" onClick={() => { setSelectedEntityId(entity.id); setView("network"); }}><span className="layer-index">{String(index + 1).padStart(2, "0")}</span><span className="layer-mark">{index === 0 ? "S" : "S"}</span><span className="layer-copy"><b>{entity.name}</b><small>{entity.summary}</small></span><ArrowRight size={15} /></button>)}</div></section><section className="panel focus-panel"><div className="section-heading"><div><span className="eyebrow">ATENCIÓN</span><h3>Lo que está abierto</h3></div><Target size={18} /></div>{activeTasks.length ? activeTasks.slice(0, 5).map((task) => <div key={task.id} className="focus-task"><span className={`task-priority ${task.priority}`} /><span><b>{task.title}</b><small>{entityName(task.entity_id ?? data.missions.find((mission) => mission.id === task.mission_id)?.entity_id ?? null)}</small></span><button className="tiny-action" onClick={() => updateTaskStatus(task, "done")} title="Marcar lista"><Check size={15} /></button></div>) : <div className="empty-state compact"><div className="empty-icon"><Check size={20} /></div><b>Sin tareas pendientes.</b><span>Define una misión cuando quieras empujar un nuevo resultado.</span></div>}<button className="button button-light button-full" onClick={() => setView("missions")}>Ir a misiones <ArrowRight size={15} /></button></section></div>
            <div className="home-bottom-row"><div className="quote-card"><span className="eyebrow">NORTE DE SOVERATH</span><blockquote>“Convertimos ideas en operaciones ordenadas y útiles.”</blockquote><span>PRODUCIR MEJOR · DISTRIBUIR CON CRITERIO · CREAR COMUNIDAD</span></div><div className="quick-actions"><span className="eyebrow">CREAR</span><button onClick={() => setEntityDialog("new")}><Plus size={16} /> Nueva entidad <ArrowRight size={14} /></button><button onClick={() => { setMissionDialog(true); }}><Target size={16} /> Nueva misión <ArrowRight size={14} /></button><button onClick={createDocument}><FileText size={16} /> Nuevo texto <ArrowRight size={14} /></button></div></div>
            <section className="panel activity-panel"><div className="section-heading"><div><span className="eyebrow">BITÁCORA</span><h3>Actividad reciente</h3></div><span className="private-tag"><ShieldCheck size={13} /> Solo Founder</span></div>{data.auditEvents.length ? <div className="activity-list">{data.auditEvents.slice(0, 8).map((event) => <button className="activity-row" key={event.id} onClick={() => openAuditRecord(event)}><span className={`activity-mark ${event.action}`}><Activity size={14} /></span><span className="activity-copy"><b>{event.label}</b><small>{auditActionLabel(event.action)} · {auditTypeLabel(event.record_table)}</small></span><time>{formatDateTime(event.created_at)}</time><ArrowRight size={13} /></button>)}</div> : <div className="empty-inline">Los cambios que hagas aparecerán aquí.</div>}</section>
          </>}
          <div className="source-note"><ShieldCheck size={15} /><span>Los datos importados se distinguen por su fuente y fecha. Los sitios públicos pueden contener cifras demostrativas.</span><a href="https://soverath.presentto.online" target="_blank" rel="noreferrer">Fuente pública <ExternalLink size={12} /></a></div>
        </section>}

        {view === "network" && <section className="view-stack">
          <div className="toolbar"><div><span className="result-count">{filteredEntities.length} registros</span><span className="toolbar-divider" /> <span className="muted">Relaciones confirmadas y observaciones públicas separadas</span></div><div className="toolbar-actions"><button className="button button-outline" disabled={globalBusy} onClick={importInitialData}><Database size={15} /> Importar base</button><button className="button button-dark" onClick={() => setEntityDialog("new")}><Plus size={16} /> Nueva entidad</button></div></div>
          {!data.entities.length ? <div className="empty-state large"><div className="empty-icon"><Network size={22} /></div><h3>Tu mapa está listo para recibir la red.</h3><p>Importa el catálogo inicial y ajusta cada relación desde su ficha.</p><button className="button button-dark" onClick={importInitialData}>Importar catálogo <ArrowRight size={15} /></button></div> : !filteredEntities.length ? <div className="empty-state large"><div className="empty-icon"><Search size={20} /></div><h3>No hay coincidencias.</h3><p>Prueba con otro nombre, descripción, estado o enlace.</p></div> : <div className="entity-grid">{filteredEntities.map((entity) => {
            const parent = data.entities.find((item) => item.id === entity.parent_id);
            const typeIcon = entity.entity_type === "coordinator" ? <Layers3 size={16} /> : entity.entity_type === "system" ? <Database size={16} /> : <Building2 size={16} />;
            const connections = data.relationships.filter((rel) => rel.source_entity_id === entity.id || rel.target_entity_id === entity.id).length;
            return <article key={entity.id} className="entity-card"><div className="entity-card-top"><span className={`type-icon ${entity.entity_type}`}>{typeIcon}</span><span className={`status-pill ${entity.status}`}>{titleCase(entity.status)}</span><button className="icon-button card-more" onClick={() => setEntityDialog(entity)} aria-label={`Editar ${entity.name}`}><span>•••</span></button></div><button className="entity-card-main" onClick={() => setSelectedEntityId(entity.id)}><h3>{entity.name}</h3><p>{entity.summary || "Sin descripción todavía."}</p></button><div className="entity-card-meta"><span>{titleCase(entity.entity_type)}</span>{parent && <><i /> <span>{parent.name}</span></>}{connections > 0 && <><i /> <span>{connections} vínculos</span></>}</div><div className="entity-card-footer"><span className="provenance"><span className={`provenance-dot ${entity.provenance}`} />{titleCase(entity.provenance)}</span><button className="open-entity" onClick={() => setSelectedEntityId(entity.id)}>Abrir <ArrowRight size={14} /></button></div></article>;
          })}</div>}
        </section>}

        {view === "knowledge" && <section className="view-stack">
          <div className="toolbar"><div><span className="result-count">{data.documents.length} textos</span><span className="toolbar-divider" /><span className="muted">Autoguardado · historial restaurable</span></div><div className="toolbar-actions"><select className="entity-select" value={selectedEntityId ?? ""} onChange={(event) => setSelectedEntityId(event.target.value || null)}><option value="">Asociar texto a entidad…</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select><button className="button button-dark" onClick={createDocument}><Plus size={16} /> Nuevo texto</button></div></div>
          <div className="knowledge-layout"><aside className="document-list panel"><div className="list-heading"><div><span className="eyebrow">BIBLIOTECA</span><h3>Textos y estrategia</h3></div><span className="mini-count">{data.documents.length}</span></div>{filteredDocuments.length ? filteredDocuments.map((document) => <button key={document.id} className={`document-row ${docId === document.id ? "selected" : ""}`} onClick={() => chooseDocument(document)}><FileText size={16} /><span><b>{document.title}</b><small>{entityName(document.entity_id)} · {titleCase(document.document_type)}</small></span></button>) : <div className="empty-list">Aún no hay textos. Crea estrategia, notas o documentación operativa aquí.</div>}<label className="upload-button"><Upload size={15} /><span>Subir brandbook o archivo</span><input type="file" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void uploadFile(file); event.currentTarget.value = ""; }} /></label></aside>
            <section className="document-editor panel">{selectedDoc ? <>
              <div className="editor-header"><div className="save-indicator"><span className={`save-dot ${saveStatus.includes("sin sincronizar") ? "save-error" : ""}`} />{saveStatus}</div><div className="editor-tools"><span>{titleCase(selectedDoc.provenance)}</span><button className="icon-button" onClick={() => void openDocumentHistory(selectedDoc)} title="Historial de versiones"><Clock3 size={16} /></button><button className="icon-button danger-hover" onClick={() => void deleteDocument(selectedDoc)} aria-label="Borrar texto"><Trash2 size={16} /></button></div></div>
              <input className="document-title-input" value={docTitle} onChange={(event) => { const value = event.target.value; setDocTitle(value); cacheDocumentDraft(docId, value, docContent); }} placeholder="Título del texto" />
              <div className="editor-meta">
                <select value={selectedDoc.document_type} onChange={(event) => void updateDocumentMetadata(selectedDoc, { document_type: event.target.value })}><option value="strategy">Estrategia</option><option value="concept">Texto conceptual</option><option value="brandbook">Brandbook</option><option value="process">Proceso / PODC</option><option value="note">Nota</option></select>
                <select value={selectedDoc.entity_id ?? ""} onChange={(event) => void updateDocumentMetadata(selectedDoc, { entity_id: event.target.value || null })}><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select>
                <select value={selectedDoc.provenance} onChange={(event) => void updateDocumentMetadata(selectedDoc, { provenance: event.target.value })}><option value="founder_confirmed">Founder</option><option value="public_observation">Público</option><option value="inferred">Inferido</option><option value="demo_placeholder">Demo</option><option value="needs_confirmation">Por confirmar</option></select>
              </div>
              <div className="editor-source-row"><input key={`${selectedDoc.id}-source`} aria-label="URL de origen" type="url" defaultValue={selectedDoc.source_url ?? ""} placeholder="URL de origen" onBlur={(event) => void updateDocumentMetadata(selectedDoc, { source_url: event.currentTarget.value || null })} /><input key={`${selectedDoc.id}-date`} aria-label="Fecha de observación" type="date" defaultValue={selectedDoc.source_observed_at ?? ""} onBlur={(event) => void updateDocumentMetadata(selectedDoc, { source_observed_at: event.currentTarget.value || null })} /></div>
              <textarea className="document-textarea" value={docContent} onChange={(event) => { const value = event.target.value; setDocContent(value); cacheDocumentDraft(docId, docTitle, value); }} placeholder="Escribe aquí. Los cambios se guardan automáticamente y cada versión queda disponible en el historial." />
              <div className="editor-footer"><span><LockKeyhole size={13} /> Contenido privado</span><span>Markdown · texto plano</span></div>
            </> : <div className="empty-editor"><div className="empty-icon"><FileText size={21} /></div><h3>El conocimiento es activo de la red.</h3><p>Guarda estrategias, conceptos, decisiones y procesos. El editor crea versiones al guardar cada cambio.</p><button className="button button-dark" onClick={createDocument}><Plus size={15} /> Crear texto</button></div>}</section></div>
          <section className="panel resources-panel"><div className="section-heading"><div><span className="eyebrow">ARCHIVOS</span><h3>Brandbooks, imágenes y recursos</h3></div><span className="private-tag"><LockKeyhole size={13} /> Storage privado</span></div>{visibleResources.length ? <div className="resource-grid">{visibleResources.map((resource) => <div className="resource-row" key={resource.id}><div className="file-icon"><FileText size={17} /></div><span className="resource-copy"><b>{resource.name}</b><small>{entityName(resource.entity_id)} · {(resource.byte_size / 1024 / 1024).toFixed(2)} MB</small></span><button className="icon-button" onClick={() => setEditRecord({ table: "resources", record: resource })} title="Organizar"><Pencil size={14} /></button><button className="icon-button" onClick={() => void downloadResource(resource)} title="Descargar"><ArrowDownToLine size={16} /></button><button className="icon-button danger-hover" onClick={() => void removeResource(resource)} title="Borrar"><Trash2 size={15} /></button></div>)}</div> : <div className="empty-inline">Sube archivos desde esta vista. Los vínculos de descarga se generan por sesión y vencen en un minuto.</div>}</section>
        </section>}

        {view === "missions" && <section className="view-stack">
          <div className="toolbar"><div><span className="result-count">{data.missions.length} misiones</span><span className="toolbar-divider" /><span className="muted">{activeTasks.length} tareas por completar</span></div><button className="button button-dark" onClick={() => setMissionDialog(true)}><Plus size={16} /> Nueva misión</button></div>
          {data.missions.length ? <div className="mission-grid">{data.missions.map((mission) => {
            const tasks = data.tasks.filter((task) => task.mission_id === mission.id);
            const projects = data.projects.filter((project) => project.mission_id === mission.id);
            const done = tasks.filter((task) => task.status === "done").length;
            return <article className="mission-card panel" key={mission.id}><div className="mission-top"><span className={`status-pill ${mission.status}`}>{titleCase(mission.status)}</span><button className="icon-button" onClick={() => setEditRecord({ table: "missions", record: mission })} aria-label="Editar misión"><Pencil size={14} /></button><button className="icon-button danger-hover" onClick={() => void deleteRow("missions", mission.id, mission.title)} aria-label="Borrar misión"><Trash2 size={15} /></button></div><h3>{mission.title}</h3><p>{mission.goal || "Sin resultado descrito todavía."}</p><div className="mission-meta"><span><Building2 size={13} />{entityName(mission.entity_id)}</span>{mission.target_date && <span><Clock3 size={13} />{formatDate(mission.target_date)}</span>}</div>{mission.success_metric && <div className="success-metric"><span>RESULTADO</span><b>{mission.success_metric}</b></div>}<div className="progress-row"><span>{done} / {tasks.length} tareas</span><div className="progress-track"><i style={{ width: `${tasks.length ? Math.round(done / tasks.length * 100) : 0}%` }} /></div></div>{projects.length > 0 && <div className="mission-projects"><span className="eyebrow">PROYECTOS</span>{projects.map((project) => <div className="project-row" key={project.id}><Layers3 size={14} /><span>{project.title}</span><button className="tiny-action" onClick={() => setEditRecord({ table: "projects", record: project })}><Pencil size={12} /></button><button className="tiny-action" onClick={() => void deleteRow("projects", project.id, project.title)}><Trash2 size={13} /></button></div>)}</div>}<div className="task-list">{tasks.map((task) => <div className="task-row" key={task.id}><button className={`task-check ${task.status === "done" ? "checked" : ""}`} onClick={() => updateTaskStatus(task, task.status === "done" ? "todo" : "done")} title="Cambiar estado">{task.status === "done" && <Check size={12} />}</button><span className={task.status === "done" ? "task-done" : ""}>{task.title}<small>{task.due_date ? formatDate(task.due_date) : titleCase(task.priority)}</small></span><button className="tiny-action" onClick={() => setEditRecord({ table: "tasks", record: task })}><Pencil size={12} /></button><button className="tiny-action" onClick={() => void deleteRow("tasks", task.id, task.title)}><Trash2 size={13} /></button></div>)}</div><div className="mission-actions"><button className="button button-light" onClick={() => setTaskMissionId(mission.id)}><Plus size={14} /> Tarea</button><button className="button button-light" onClick={() => setProjectMissionId(mission.id)}><Plus size={14} /> Proyecto</button></div></article>;
          })}</div> : <div className="empty-state large"><div className="empty-icon"><Target size={22} /></div><h3>El trabajo empieza con un resultado.</h3><p>Crea una misión, vincúlala a una empresa y divídela en proyectos y tareas.</p><button className="button button-dark" onClick={() => setMissionDialog(true)}><Plus size={15} /> Crear primera misión</button></div>}
        </section>}

        {view === "metrics" && <section className="view-stack">
          <div className="toolbar"><div><span className="result-count">{data.metrics.length} métricas</span><span className="toolbar-divider" /><span className="muted">Cada dato guarda fecha y origen</span></div><button className="button button-dark" onClick={() => setMetricDialog(true)}><Plus size={16} /> Definir métrica</button></div>
          {data.metrics.length ? <div className="metric-grid">{data.metrics.map((metric) => {
            const values = data.metricValues.filter((value) => value.metric_id === metric.id).sort((a, b) => b.recorded_on.localeCompare(a.recorded_on));
            const latest = values[0];
            return <article className="metric-card panel" key={metric.id}><div className="metric-card-top"><span className="type-icon metric"><BarChart3 size={16} /></span><button className="icon-button" onClick={() => setEditRecord({ table: "metrics", record: metric })} title="Editar"><Pencil size={14} /></button><button className="icon-button danger-hover" onClick={() => void deleteRow("metrics", metric.id, metric.name)} title="Borrar"><Trash2 size={15} /></button></div><span className="eyebrow">{entityName(metric.entity_id)} · {titleCase(metric.frequency)}</span><h3>{metric.name}</h3><p>{metric.description || "Sin descripción."}</p><div className="metric-value"><strong>{latest ? new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(latest.value) : "—"}</strong><span>{metric.unit}</span></div><div className="metric-foot"><span>{latest ? `Actualizado ${formatDate(latest.recorded_on)}` : "Aún sin registros"}{metric.target_value != null ? ` · meta ${metric.target_value} ${metric.unit}` : ""}</span><button className="button button-light" onClick={() => setValueMetricId(metric.id)}><Plus size={14} /> Registrar</button></div></article>;
          })}</div> : <div className="empty-state large"><div className="empty-icon"><BarChart3 size={22} /></div><h3>Elige qué significa avanzar.</h3><p>Define métricas propias para cada empresa. Los números publicados en webs quedan fuera hasta que se confirmen.</p><button className="button button-dark" onClick={() => setMetricDialog(true)}><Plus size={15} /> Definir primera métrica</button></div>}
        </section>}

        {view === "operations" && <section className="view-stack">
          <section className="panel accounts-panel"><div className="section-heading"><div><span className="eyebrow">CUENTAS INTERNAS · COP</span><h3>Saldos derivados de movimientos</h3></div><button className="button button-outline" onClick={() => setAccountDialog(true)}><Plus size={14} /> Nueva cuenta</button></div>{data.accounts.length ? <div className="account-grid">{data.accounts.map((account) => <article className={`account-card ${account.is_active ? "" : "inactive"}`} key={account.id}><div className="account-card-head"><span className="type-icon"><Wallet size={15} /></span><span className="event-type">{titleCase(account.account_type)}</span><button className="icon-button" onClick={() => setEditRecord({ table: "internal_accounts", record: account })} aria-label="Editar cuenta"><Pencil size={14} /></button></div><h4>{account.name}</h4><small>{entityName(account.entity_id)}{account.is_active ? "" : " · Inactiva"}</small><strong>{formatCOP(accountBalance(account))}</strong><span className="account-purpose">{account.purpose || "Sin propósito registrado"}</span></article>)}</div> : <div className="empty-inline">Crea tus cuentas internas para ver saldos de gestión. Cada movimiento solo modifica el saldo cuando indicas la cuenta y el efecto correspondiente.</div>}</section>
          <div className="ledger-hero"><div><span className="eyebrow">LIBRO OPERATIVO INTERNO · COP</span><h2>La actividad, con contexto.</h2><p>Registra ventas, compras, gastos, pagos, inventario, producción y logística con su entidad correspondiente.</p></div><div className="ledger-total"><span>REGISTROS ESTE MES</span><strong>{monthOperations.length}</strong><small>{formatCOP(monthAmount)} en importes anotados</small></div></div>
          <div className="toolbar"><div><span className="result-count">{data.operations.length} eventos</span><span className="toolbar-divider" /><span className="muted">El historial interno no reemplaza contabilidad o facturación legal.</span></div><button className="button button-dark" onClick={() => setOperationDialog(true)}><Plus size={16} /> Registrar evento</button></div>
          {data.operations.length ? <div className="table-wrap panel"><table><thead><tr><th>EVENTO</th><th>ENTIDAD</th><th>TIPO</th><th>FECHA</th><th>IMPORTE</th><th /></tr></thead><tbody>{data.operations.map((operation) => <tr key={operation.id}><td><b>{operation.title}</b><small>{operationSubline(operation)}</small></td><td>{entityName(operation.entity_id)}</td><td><span className={`event-type ${operation.event_type}`}>{titleCase(operation.event_type)}</span></td><td>{formatDate(operation.occurred_on)}</td><td className="amount-cell">{formatCOP(operation.amount_cop)}</td><td className="table-actions"><button className="icon-button" onClick={() => setEditRecord({ table: "operation_events", record: operation })} aria-label="Editar evento"><Pencil size={14} /></button><button className="icon-button danger-hover" onClick={() => void deleteRow("operation_events", operation.id, operation.title)} aria-label="Borrar evento"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div> : <div className="empty-state large"><div className="empty-icon"><Wallet size={22} /></div><h3>El libro empieza con eventos reales.</h3><p>Los importes públicos y los datos demo no se cargan aquí. Registra solo movimientos confirmados por ti.</p><button className="button button-dark" onClick={() => setOperationDialog(true)}><Plus size={15} /> Registrar primer evento</button></div>}
          <div className="accounting-note"><CircleHelp size={16} /><span>Este libro organiza la operación de Soverath en COP. No emite factura electrónica DIAN ni lleva contabilidad fiscal.</span></div>
        </section>}

        <footer className="page-footer"><span>© SOVERATH · SIS PRIVADO</span><span>ANDREI / FOUNDER</span><button onClick={() => void exportBackup()} disabled={globalBusy}>{globalBusy ? "Preparando…" : "Exportar respaldo"} <ArrowDownToLine size={13} /></button><button onClick={() => void load()}>Actualizar <Activity size={13} /></button></footer>
      </div>
    </main>

    {entityDialog && <Modal title={entityDialog === "new" ? "Nueva entidad" : `Editar · ${(entityDialog as Entity).name}`} onClose={() => setEntityDialog(null)} wide><form className="modal-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void saveEntity({ ...values, parent_id: String(values.parent_id || "") || null } as Record<string, string | null>).catch((error: unknown) => setDataError(error instanceof Error ? error.message : "No se pudo guardar la entidad.")); }}><div className="form-grid"><label>Nombre<input name="name" required defaultValue={entityDialog === "new" ? "" : entityDialog.name} /></label><label>Tipo<select name="entity_type" defaultValue={entityDialog === "new" ? "company" : entityDialog.entity_type}><option value="coordinator">Capa coordinadora</option><option value="company">Empresa</option><option value="brand">Marca</option><option value="service">Servicio</option><option value="concept">Concepto por validar</option><option value="system">Sistema transversal</option><option value="project">Proyecto</option><option value="channel">Canal</option></select></label><label>Estado<select name="status" defaultValue={entityDialog === "new" ? "needs_review" : entityDialog.status}><option value="active">Activa</option><option value="conceptual">Conceptual</option><option value="exploration">Exploración</option><option value="launching">Preparación de lanzamiento</option><option value="needs_review">Por revisar</option><option value="paused">Pausada</option></select></label><label>Coordinadora<select name="parent_id" defaultValue={entityDialog === "new" ? "" : entityDialog.parent_id ?? ""}><option value="">Sin asignar</option>{data.entities.filter((item) => item.id !== (entityDialog === "new" ? null : entityDialog.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-width">Descripción breve<input name="summary" defaultValue={entityDialog === "new" ? "" : entityDialog.summary} /></label><label className="full-width">Estrategia / detalle<textarea name="description" rows={5} defaultValue={entityDialog === "new" ? "" : entityDialog.description} placeholder="Documenta propósito, estrategia, alcance o contexto." /></label><label className="full-width">Enlace de origen<input type="url" name="source_url" defaultValue={entityDialog === "new" ? "" : entityDialog.source_url ?? ""} /></label><label>Procedencia<select name="provenance" defaultValue={entityDialog === "new" ? "founder_confirmed" : entityDialog.provenance}><option value="founder_confirmed">Confirmado por Founder</option><option value="public_observation">Observación pública</option><option value="inferred">Inferido</option><option value="demo_placeholder">Demo / placeholder</option><option value="needs_confirmation">Por confirmar</option></select></label><label>Fecha de observación<input name="source_observed_at" type="date" defaultValue={entityDialog === "new" ? "" : entityDialog.source_observed_at ?? ""} /></label></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEntityDialog(null)}>Cancelar</button><button className="button button-dark"><Check size={15} /> Guardar cambios</button></div></form></Modal>}

    {selectedEntity && !entityDialog && <Modal title={selectedEntity.name} onClose={() => setSelectedEntityId(null)} wide><div className="entity-detail">
      <div className="detail-summary"><span className={`status-pill ${selectedEntity.status}`}>{titleCase(selectedEntity.status)}</span><span className="detail-type">{titleCase(selectedEntity.entity_type)} · {selectedEntity.provenance === "founder_confirmed" ? "Confirmado por Founder" : titleCase(selectedEntity.provenance)}</span><p>{selectedEntity.summary || "Sin descripción breve."}</p></div>
      <div className="detail-grid"><div><span className="eyebrow">COORDINACIÓN</span><b>{entityName(selectedEntity.parent_id)}</b></div><div><span className="eyebrow">ÚLTIMA EDICIÓN</span><b>{formatDate(selectedEntity.updated_at)}</b></div></div>
      {selectedEntity.description && <div className="detail-description"><span className="eyebrow">ESTRATEGIA Y CONTEXTO</span><p>{selectedEntity.description}</p></div>}
      {selectedEntity.source_url && <a className="source-link" href={selectedEntity.source_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir sitio vinculado</a>}
      {selectedEntity.catalog_source_url && <a className="source-link" href={selectedEntity.catalog_source_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Ver catálogo de origen</a>}
      <div className="detail-relations"><div className="section-heading"><div><span className="eyebrow">RELACIONES REGISTRADAS</span><h3>Conexiones</h3></div><button className="button button-light" onClick={() => setRelationshipEntityId(selectedEntity.id)}><Plus size={14} /> Añadir</button></div>
        {data.relationships.filter((rel) => rel.source_entity_id === selectedEntity.id || rel.target_entity_id === selectedEntity.id).map((relation) => <div className="relation-row" key={relation.id}><span>{relation.source_entity_id === selectedEntity.id ? selectedEntity.name : entityName(relation.source_entity_id)}</span><i>{titleCase(relation.relationship_type)}</i><span>{relation.target_entity_id === selectedEntity.id ? selectedEntity.name : entityName(relation.target_entity_id)}</span><small>{titleCase(relation.provenance)}</small><button className="tiny-action" onClick={() => void deleteRow("entity_relationships", relation.id, relation.relationship_type)}><Trash2 size={13} /></button></div>)}
        {!data.relationships.some((rel) => rel.source_entity_id === selectedEntity.id || rel.target_entity_id === selectedEntity.id) && <p className="muted">Aún no hay relaciones múltiples registradas.</p>}
      </div>
      <div className="detail-actions"><button className="button button-outline" onClick={() => { setEntityDialog(selectedEntity); }}><Pencil size={15} /> Editar ficha</button><button className="button button-outline" onClick={() => void createDocument()}><Plus size={15} /> Añadir texto</button><button className="button button-outline" onClick={() => void openHistory(selectedEntity)}><Clock3 size={15} /> Historial</button><button className="button button-danger" onClick={() => void removeEntity(selectedEntity)}><Trash2 size={15} /> Borrar</button></div>
    </div></Modal>}

    {historyOpen && historyTarget && <Modal title={`Historial · ${historyTarget.title}`} onClose={() => setHistoryOpen(false)}><div className="history-list">{historyRows.length ? historyRows.map((row) => <article className="history-item" key={row.id}><div><span className="eyebrow">{formatDate(row.created_at)}</span><b>{String(row.snapshot.name ?? row.snapshot.title ?? "Versión guardada")}</b><p>{String(row.snapshot.summary ?? row.snapshot.content ?? "")}</p></div><button className="button button-light" onClick={() => void restoreSnapshot(row.snapshot)}>Restaurar</button></article>) : <div className="empty-inline">Todavía no hay versiones anteriores de esta ficha.</div>}</div></Modal>}

    {relationshipEntityId && <Modal title="Añadir relación" onClose={() => setRelationshipEntityId(null)}><form className="modal-form" onSubmit={(event) => runForm(event, saveRelationship)}><label>Entidad relacionada<select name="target_entity_id" required defaultValue=""><option value="" disabled>Elige un registro</option>{data.entities.filter((entity) => entity.id !== relationshipEntityId).map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label>Tipo de relación<input name="relationship_type" required placeholder="ej. desarrollado_por, utiliza, aliado_de" /></label><label>Evidencia / contexto<textarea name="evidence" rows={3} /></label><label>Fuente (opcional)<input name="source_url" type="url" /></label><label>Procedencia<select name="provenance"><option value="founder_confirmed">Confirmado por Founder</option><option value="public_observation">Observación pública</option><option value="inferred">Inferido</option><option value="needs_confirmation">Por confirmar</option></select></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setRelationshipEntityId(null)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Añadir relación</button></div></form></Modal>}

    {editRecord && editValues && <Modal title={`Editar · ${String(editValues.title ?? editValues.name ?? "registro")}`} onClose={() => setEditRecord(null)}><form className="modal-form" onSubmit={(event) => runForm(event, saveEditedRecord)}>
      {editRecord.table === "missions" && <><label>Título<input name="title" required defaultValue={String(editValues.title ?? "")} /></label><label>Resultado / propósito<textarea name="goal" rows={4} defaultValue={String(editValues.goal ?? "")} /></label><label>Señal de éxito<input name="success_metric" defaultValue={String(editValues.success_metric ?? "")} /></label><div className="form-grid"><label>Estado<select name="status" defaultValue={String(editValues.status ?? "planned")}><option value="planned">Planificada</option><option value="active">Activa</option><option value="blocked">Bloqueada</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option></select></label><label>Fecha objetivo<input name="target_date" type="date" defaultValue={String(editValues.target_date ?? "")} /></label></div><label>Entidad<select name="entity_id" defaultValue={String(editValues.entity_id ?? "")}><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label></>}
      {editRecord.table === "projects" && <><label>Nombre<input name="title" required defaultValue={String(editValues.title ?? "")} /></label><label>Descripción<textarea name="summary" rows={3} defaultValue={String(editValues.summary ?? "")} /></label><div className="form-grid"><label>Estado<select name="status" defaultValue={String(editValues.status ?? "planned")}><option value="planned">Planificado</option><option value="active">Activo</option><option value="blocked">Bloqueado</option><option value="completed">Completado</option><option value="cancelled">Cancelado</option></select></label><label>Fecha objetivo<input name="target_date" type="date" defaultValue={String(editValues.target_date ?? "")} /></label></div></>}
      {editRecord.table === "tasks" && <><label>Tarea<input name="title" required defaultValue={String(editValues.title ?? "")} /></label><label>Notas<textarea name="notes" rows={3} defaultValue={String(editValues.notes ?? "")} /></label><div className="form-grid"><label>Estado<select name="status" defaultValue={String(editValues.status ?? "todo")}><option value="todo">Pendiente</option><option value="doing">En curso</option><option value="blocked">Bloqueada</option><option value="done">Completada</option></select></label><label>Prioridad<select name="priority" defaultValue={String(editValues.priority ?? "normal")}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label></div><label>Fecha objetivo<input name="due_date" type="date" defaultValue={String(editValues.due_date ?? "")} /></label></>}
      {editRecord.table === "metrics" && <><label>Nombre<input name="name" required defaultValue={String(editValues.name ?? "")} /></label><label>Descripción<textarea name="description" rows={3} defaultValue={String(editValues.description ?? "")} /></label><div className="form-grid"><label>Unidad<input name="unit" defaultValue={String(editValues.unit ?? "")} /></label><label>Frecuencia<select name="frequency" defaultValue={String(editValues.frequency ?? "weekly")}><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="annual">Anual</option></select></label></div><div className="form-grid"><label>Meta<input name="target_value" type="number" step="any" defaultValue={String(editValues.target_value ?? "")} /></label><label>Entidad<select name="entity_id" defaultValue={String(editValues.entity_id ?? "")}><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label></div></>}
      {editRecord.table === "operation_events" && <><label>Descripción<input name="title" required defaultValue={String(editValues.title ?? "")} /></label><div className="form-grid"><label>Tipo<select name="event_type" defaultValue={String(editValues.event_type ?? "expense")}><option value="sale">Venta</option><option value="purchase">Compra</option><option value="expense">Gasto</option><option value="collection">Cobro</option><option value="payment">Pago</option><option value="transfer">Transferencia</option><option value="inventory">Inventario</option><option value="production">Producción</option><option value="logistics">Logística</option><option value="adjustment">Ajuste</option></select></label><label>Fecha<input name="occurred_on" type="date" defaultValue={String(editValues.occurred_on ?? "")} required /></label></div><label>Importe COP<input name="amount_cop" inputMode="decimal" defaultValue={String(editValues.amount_cop ?? "")} /></label><label>Entidad<select name="entity_id" defaultValue={String(editValues.entity_id ?? "")}><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><div className="form-grid"><label>Cuenta<select name="account_id" defaultValue={String(editValues.account_id ?? "")}><option value="">Sin cuenta</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Cuenta destino<select name="counter_account_id" defaultValue={String(editValues.counter_account_id ?? "")}><option value="">No aplica</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><label>Efecto en saldo<select name="account_effect" defaultValue={String(editValues.account_effect ?? "none")}><option value="none">No modificar saldo</option><option value="increase">Aumenta la cuenta</option><option value="decrease">Reduce la cuenta</option></select></label><div className="form-grid"><label>Contraparte<input name="counterparty" defaultValue={String((editValues.details as Record<string, unknown> | null)?.counterparty ?? "")} /></label><label>Medio de pago<input name="payment_method" defaultValue={String((editValues.details as Record<string, unknown> | null)?.payment_method ?? "")} /></label></div><div className="form-grid"><label>Cantidad<input name="quantity" type="number" step="any" defaultValue={String((editValues.details as Record<string, unknown> | null)?.quantity ?? "")} /></label><label>Unidad<input name="unit" defaultValue={String((editValues.details as Record<string, unknown> | null)?.unit ?? "")} /></label></div><label>Referencia<input name="reference" defaultValue={String((editValues.details as Record<string, unknown> | null)?.reference ?? "")} /></label><label>Detalle<textarea name="notes" rows={3} defaultValue={String(editValues.notes ?? "")} /></label></>}
      {editRecord.table === "internal_accounts" && <><label>Nombre<input name="name" required defaultValue={String(editValues.name ?? "")} /></label><div className="form-grid"><label>Tipo<select name="account_type" defaultValue={String(editValues.account_type ?? "cash")}><option value="cash">Efectivo / caja</option><option value="bank">Cuenta bancaria</option><option value="digital_wallet">Billetera digital</option><option value="receivable">Por cobrar</option><option value="payable">Por pagar</option><option value="other">Otra cuenta</option></select></label><label>Saldo inicial COP<input name="opening_balance_cop" type="number" step="any" defaultValue={String(editValues.opening_balance_cop ?? 0)} /></label></div><label>Entidad<select name="entity_id" defaultValue={String(editValues.entity_id ?? "")}><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label>Propósito<input name="purpose" defaultValue={String(editValues.purpose ?? "")} /></label><label>Estado<select name="is_active" defaultValue={String(editValues.is_active ?? true)}><option value="true">Activa</option><option value="false">Inactiva</option></select></label></>}
      {editRecord.table === "resources" && <><label>Nombre del archivo<input name="name" required defaultValue={String(editValues.name ?? "")} /></label><label>Entidad<select name="entity_id" defaultValue={String(editValues.entity_id ?? "")}><option value="">Sin entidad</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label>Texto relacionado<select name="document_id" defaultValue={String(editValues.document_id ?? "")}><option value="">Sin texto asociado</option>{data.documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label></>}
      <div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setEditRecord(null)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Check size={15} /> Guardar</button></div>
    </form></Modal>}

    {missionDialog && <Modal title="Nueva misión" onClose={() => setMissionDialog(false)}><form className="modal-form" onSubmit={(event) => runForm(event, saveMission)}><label>Resultado que quieres conseguir<input name="title" placeholder="Ej. Preparar la operación de SEIDŌ" required autoFocus /></label><label>Propósito / contexto<textarea name="goal" rows={4} placeholder="¿Qué cambia cuando esta misión se completa?" /></label><label>Señal de éxito<input name="success_metric" placeholder="Cómo sabrás que se logró" /></label><label>Entidad relacionada<select name="entity_id"><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label>Fecha objetivo<input name="target_date" type="date" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setMissionDialog(false)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Crear misión</button></div></form></Modal>}
    {taskMissionId && <Modal title="Nueva tarea" onClose={() => setTaskMissionId(null)}><form className="modal-form" onSubmit={(event) => runForm(event, saveTask)}><label>Tarea<input name="title" required autoFocus /></label><label>Notas<textarea name="notes" rows={3} /></label><div className="form-grid"><label>Prioridad<select name="priority"><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option><option value="low">Baja</option></select></label><label>Fecha objetivo<input name="due_date" type="date" /></label></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setTaskMissionId(null)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Crear tarea</button></div></form></Modal>}
    {projectMissionId && <Modal title="Nuevo proyecto" onClose={() => setProjectMissionId(null)}><form className="modal-form" onSubmit={(event) => runForm(event, saveProject)}><label>Nombre del proyecto<input name="title" required autoFocus /></label><label>Descripción breve<textarea name="summary" rows={3} /></label><label>Fecha objetivo<input name="target_date" type="date" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setProjectMissionId(null)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Crear proyecto</button></div></form></Modal>}
    {metricDialog && <Modal title="Definir métrica" onClose={() => setMetricDialog(false)}><form className="modal-form" onSubmit={(event) => runForm(event, saveMetric)}><label>Nombre<input name="name" required placeholder="Ej. Pedidos entregados" autoFocus /></label><label>Qué mide<textarea name="description" rows={3} /></label><div className="form-grid"><label>Unidad<input name="unit" placeholder="pedidos, COP, %…" /></label><label>Frecuencia<select name="frequency" defaultValue="weekly"><option value="daily">Diaria</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="annual">Anual</option></select></label></div><div className="form-grid"><label>Meta (opcional)<input name="target_value" type="number" step="any" /></label><label>Entidad<select name="entity_id"><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setMetricDialog(false)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Guardar métrica</button></div></form></Modal>}
    {valueMetricId && <Modal title="Registrar valor" onClose={() => setValueMetricId(null)}><form className="modal-form" onSubmit={(event) => runForm(event, saveMetricValue)}><label>Valor<input name="value" type="number" step="any" required autoFocus /></label><label>Fecha<input name="recorded_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label><label>Contexto / nota<input name="note" /></label><div className="source-note modal-source"><ShieldCheck size={14} />Este valor se marcará como confirmado por Founder.</div><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setValueMetricId(null)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Check size={15} /> Guardar valor</button></div></form></Modal>}
    {accountDialog && <Modal title="Nueva cuenta interna" onClose={() => setAccountDialog(false)}><form className="modal-form" onSubmit={(event) => runForm(event, saveAccount)}><label>Nombre<input name="name" required placeholder="Caja principal, Bancolombia…" autoFocus /></label><label>Tipo<select name="account_type"><option value="cash">Efectivo / caja</option><option value="bank">Cuenta bancaria</option><option value="digital_wallet">Billetera digital</option><option value="receivable">Por cobrar</option><option value="payable">Por pagar</option><option value="other">Otra cuenta</option></select></label><label>Entidad<select name="entity_id"><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label><label>Saldo inicial COP<input name="opening_balance_cop" type="number" step="any" defaultValue="0" /></label><label>Propósito<input name="purpose" placeholder="Uso o alcance de la cuenta" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setAccountDialog(false)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Crear cuenta</button></div></form></Modal>}
    {operationDialog && <Modal title="Registrar evento operativo" onClose={() => setOperationDialog(false)}><form className="modal-form" onSubmit={(event) => runForm(event, saveOperation)}><label>Descripción del evento<input name="title" required placeholder="Ej. Compra de insumos" autoFocus /></label><div className="form-grid"><label>Tipo<select name="event_type"><option value="sale">Venta</option><option value="purchase">Compra</option><option value="expense">Gasto</option><option value="collection">Cobro</option><option value="payment">Pago</option><option value="transfer">Transferencia</option><option value="inventory">Inventario</option><option value="production">Producción</option><option value="logistics">Logística</option><option value="adjustment">Ajuste</option></select></label><label>Fecha<input name="occurred_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div><div className="form-grid"><label>Importe COP<input name="amount_cop" inputMode="decimal" placeholder="0" /></label><label>Entidad<select name="entity_id"><option value="">Red Soverath</option>{data.entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label></div><div className="form-grid"><label>Cuenta afectada<select name="account_id"><option value="">Sin cuenta</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Cuenta destino (transferencia)<select name="counter_account_id"><option value="">No aplica</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label></div><label>Efecto en saldo<select name="account_effect"><option value="none">No modificar saldo</option><option value="increase">Aumenta la cuenta</option><option value="decrease">Reduce la cuenta</option></select></label><div className="form-grid"><label>Contraparte<input name="counterparty" /></label><label>Medio de pago<input name="payment_method" placeholder="Efectivo, banco…" /></label></div><div className="form-grid"><label>Cantidad / unidades<input name="quantity" type="number" step="any" /></label><label>Unidad<input name="unit" placeholder="unidades, kg, cajas…" /></label></div><label>Referencia<input name="reference" placeholder="Pedido, lote, soporte…" /></label><label>Detalle / contexto<textarea name="notes" rows={3} /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setOperationDialog(false)}>Cancelar</button><button className="button button-dark" disabled={globalBusy}><Plus size={15} /> Guardar evento</button></div></form></Modal>}
  </div>;
}
