"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronRight, FileText, Folder, Image as ImageIcon, Pencil, Plus, Search, Trash2, Upload, Video, X } from "lucide-react";
import type { Entity, Resource, ResourceFolder, LibraryArea, AiConcept, Project } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const PAGE_SIZE = 100;
const uploadAccept = "image/*,video/*,audio/*,.heic,.heif,.mov,.mkv,.avi,.m4v,.m4a,.pdf,.md,.markdown,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.7z,.psd,.ai";
const areaLabels: Record<LibraryArea, string> = { gallery: "Galería", documents: "Documentos", ai_concepts: "AI Concepts" };

type UploadState = { id: string; name: string; status: "en espera" | "subiendo" | "listo" | "error"; message?: string };
type PreviewState = { resource: Resource; url?: string; text?: string };
type ConceptDraft = { id: string | null; title: string; content_md: string; tags: string; status: AiConcept["status"] };
type ResourceCount = { entity_id: string | null; folder_id: string | null; asset_count: number };
type ConceptRevision = { id: string; snapshot: Record<string, unknown>; created_at: string };

function fileKind(resource: Resource) {
  const mime = resource.mime_type.toLowerCase();
  const name = resource.name.toLowerCase();
  if (mime === "image/svg+xml" || /\.(svgz?|hei[cf])$/i.test(name) || /image\/(hei[cf])/.test(mime)) return "other";
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) return "audio";
  if (mime === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (/\.(md|markdown|txt)$/i.test(name) || mime.startsWith("text/")) return "text";
  return "other";
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `concepto-${Date.now()}`;
}

function libraryLoadError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (["PGRST204", "PGRST205", "42P01", "42703"].includes(code)) {
    return "La biblioteca requiere la migración 0002. Ejecútala desde supabase/migrations/0002_file_workspaces.sql en Supabase SQL Editor y vuelve a cargar.";
  }
  return error instanceof Error ? error.message : "No se pudo cargar la biblioteca.";
}

export function LibraryWorkspace({ area, entities, projects }: { area: LibraryArea; entities: Entity[]; projects: Project[] }) {
  const [client, setClient] = useState<ReturnType<typeof getSupabase> | null>(null);
  const [folders, setFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceCounts, setResourceCounts] = useState<ResourceCount[]>([]);
  const [concepts, setConcepts] = useState<AiConcept[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderDraft, setFolderDraft] = useState<{ id: string; name: string } | null>(null);
  const [uploadStates, setUploadStates] = useState<UploadState[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [resourceDraft, setResourceDraft] = useState<Resource | null>(null);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [conceptDraft, setConceptDraft] = useState<ConceptDraft | null>(null);
  const [conceptPreview, setConceptPreview] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptRevisions, setConceptRevisions] = useState<ConceptRevision[]>([]);
  const [revisionConcept, setRevisionConcept] = useState<AiConcept | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const conceptImportInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!preview && !revisionConcept && !resourceDraft) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setPreview(null); setRevisionConcept(null); setResourceDraft(null); }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [preview, revisionConcept, resourceDraft]);

  useEffect(() => {
    try { setClient(getSupabase()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "No se pudo conectar con Supabase."); }
  }, []);

  const load = useCallback(async (reset = true) => {
    if (!client) return;
    setLoading(true);
    setError("");
    const nextPage = reset ? 0 : pageRef.current + 1;
    try {
      const from = nextPage * PAGE_SIZE;
      let resourceQuery = client.from("resources").select("*").eq("area", area);
      resourceQuery = selectedEntityId ? resourceQuery.eq("entity_id", selectedEntityId) : resourceQuery.is("entity_id", null);
      resourceQuery = selectedProjectId ? resourceQuery.eq("project_id", selectedProjectId) : resourceQuery.is("project_id", null);
      resourceQuery = selectedFolderId ? resourceQuery.eq("folder_id", selectedFolderId) : resourceQuery.is("folder_id", null);
      const searchTerm = search.trim().replace(/[%_]/g, "");
      if (searchTerm) resourceQuery = resourceQuery.ilike("name", `%${searchTerm}%`);
      const [folderResult, resourceResult, conceptResult, countResult] = await Promise.all([
        client.from("resource_folders").select("*").eq("area", area).order("sort_order").order("name"),
        resourceQuery.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1),
        area === "ai_concepts" ? client.from("ai_concepts").select("*").order("updated_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        client.from("resource_library_counts").select("entity_id,folder_id,asset_count").eq("area", area),
      ]);
      if (folderResult.error) throw folderResult.error;
      if (resourceResult.error) throw resourceResult.error;
      if (conceptResult.error) throw conceptResult.error;
      if (countResult.error) throw countResult.error;
      setFolders((folderResult.data ?? []) as ResourceFolder[]);
      setResources((current) => reset ? (resourceResult.data ?? []) as Resource[] : [...current, ...((resourceResult.data ?? []) as Resource[])]);
      setResourceCounts((countResult.data ?? []) as ResourceCount[]);
      setConcepts((conceptResult.data ?? []) as AiConcept[]);
      pageRef.current = nextPage;
      setHasMore((resourceResult.data?.length ?? 0) === PAGE_SIZE);
    } catch (loadError) {
      setError(libraryLoadError(loadError));
    } finally { setLoading(false); }
  }, [area, client, search, selectedEntityId, selectedFolderId, selectedProjectId]);

  useEffect(() => {
    if (!client) return;
    const timer = window.setTimeout(() => void load(true), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [client, load, search]);

  const selectedEntity = entities.find((entity) => entity.id === selectedEntityId) ?? null;
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;
  const entityFolders = folders.filter((folder) => folder.entity_id === selectedEntityId && folder.project_id === selectedProjectId);
  const availableProjects = projects.filter((project) => project.entity_id === selectedEntityId);
  const folderPath = useMemo(() => {
    const path: ResourceFolder[] = [];
    let cursor = selectedFolder;
    while (cursor) {
      path.unshift(cursor);
      cursor = folders.find((folder) => folder.id === cursor?.parent_folder_id) ?? null;
    }
    return path;
  }, [folders, selectedFolder]);
  const currentFolders = entityFolders.filter((folder) => folder.parent_folder_id === selectedFolderId);
  const visibleResources = useMemo(() => resources.filter((resource) => resource.entity_id === selectedEntityId && resource.folder_id === selectedFolderId && (!search || resource.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")) || resource.caption.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))), [resources, search, selectedEntityId, selectedFolderId]);
  const entityConcepts = concepts.filter((concept) => concept.entity_id === selectedEntityId && concept.project_id === selectedProjectId);

  useEffect(() => {
    if (!client || area !== "gallery" || !selectedEntityId) return;
    let active = true;
    const imagePaths = visibleResources.filter((resource) => fileKind(resource) === "image" && resource.mime_type !== "image/svg+xml").slice(0, 30);
    if (!imagePaths.length) { setThumbUrls({}); return; }
    void client.storage.from("sis-private").createSignedUrls(imagePaths.map((resource) => resource.storage_path), 60)
      .then(({ data, error: signedError }) => {
        if (!active || signedError) return;
        setThumbUrls(Object.fromEntries((data ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl])));
      });
    return () => { active = false; };
  }, [area, client, selectedEntityId, visibleResources]);

  async function createFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !selectedEntity || !folderName.trim()) return;
    setBusy(true); setError("");
    const { error: insertError } = await client.from("resource_folders").insert({
      entity_id: selectedEntity.id,
      project_id: selectedProjectId,
      area,
      parent_folder_id: selectedFolderId,
      name: folderName.trim(),
      category: "general",
    });
    if (insertError) setError(insertError.message);
    else { setFolderName(""); setNotice("Carpeta creada."); await load(true); }
    setBusy(false);
  }

  async function renameFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !folderDraft || !folderDraft.name.trim()) return;
    setBusy(true); setError("");
    const { error: updateError } = await client.from("resource_folders").update({ name: folderDraft.name.trim() }).eq("id", folderDraft.id);
    if (updateError) setError(updateError.message);
    else { setFolderDraft(null); setNotice("Carpeta renombrada."); await load(true); }
    setBusy(false);
  }

  async function deleteFolder(folder: ResourceFolder) {
    if (!client) return;
    if (entityFolders.some((item) => item.parent_folder_id === folder.id)) {
      setError("Mueve o elimina primero las subcarpetas.");
      return;
    }
    if (!window.confirm(`¿Eliminar la carpeta “${folder.name}”? Sus archivos quedarán en la raíz de la entidad.`)) return;
    setBusy(true); setError("");
    const { error: deleteError } = await client.from("resource_folders").delete().eq("id", folder.id);
    if (deleteError) setError(deleteError.message);
    else {
      if (selectedFolderId === folder.id) setSelectedFolderId(folder.parent_folder_id);
      setNotice("Carpeta eliminada; los archivos se conservaron en la raíz.");
      await load(true);
    }
    setBusy(false);
  }

  async function moveResource(resource: Resource, targetFolderId: string) {
    if (!client || targetFolderId === (resource.folder_id ?? "")) return;
    const targetFolder = folders.find((folder) => folder.id === targetFolderId);
    if (targetFolder && (targetFolder.entity_id !== selectedEntityId || targetFolder.area !== area)) {
      setError("El destino debe pertenecer a la misma entidad y sección.");
      return;
    }
    setBusy(true); setError("");
    const { error: updateError } = await client.from("resources").update({ folder_id: targetFolderId || null, entity_id: selectedEntityId, project_id: selectedProjectId, area }).eq("id", resource.id);
    if (updateError) setError(updateError.message);
    else { setNotice("Archivo movido."); await load(true); }
    setBusy(false);
  }

  async function saveResourceMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !resourceDraft) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    const { error: updateError } = await client.from("resources").update({
      caption: String(form.get("caption") ?? "").trim(),
      alt_text: String(form.get("alt_text") ?? "").trim(),
      category: String(form.get("category") ?? "general"),
    }).eq("id", resourceDraft.id);
    if (updateError) setError(updateError.message);
    else { setResourceDraft(null); setNotice("Detalles del archivo guardados."); await load(true); }
    setBusy(false);
  }

  function updateUpload(id: string, updates: Partial<UploadState>) {
    setUploadStates((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!client || !selectedEntity) return;
    const items = Array.from(files).map((file) => ({ file, state: { id: crypto.randomUUID(), name: file.name, status: "en espera" as const } }));
    setUploadStates((current) => [...items.map((item) => item.state), ...current]);
    setBusy(true); setError("");
    for (const item of items) {
      const uploadId = item.state.id;
      updateUpload(uploadId, { status: "subiendo" });
      if (item.file.size > MAX_FILE_BYTES) {
        updateUpload(uploadId, { status: "error", message: "Supera el límite actual de 50 MB." });
        continue;
      }
      const safeName = item.file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-180);
      const path = `${selectedEntity.id}/${area}/${crypto.randomUUID()}-${safeName}`;
      try {
        const { error: uploadError } = await client.storage.from("sis-private").upload(path, item.file, { contentType: item.file.type || "application/octet-stream", upsert: false });
        if (uploadError) throw uploadError;
        const { error: insertError } = await client.from("resources").insert({
          entity_id: selectedEntity.id,
          project_id: selectedProjectId,
          folder_id: selectedFolderId,
          area,
          category: selectedFolder?.category ?? "general",
          name: item.file.name,
          mime_type: item.file.type || "application/octet-stream",
          byte_size: item.file.size,
          storage_path: path,
          ai_concept_id: area === "ai_concepts" ? selectedConceptId : null,
        });
        if (insertError) {
          await client.storage.from("sis-private").remove([path]);
          throw insertError;
        }
        updateUpload(uploadId, { status: "listo", message: "Subido" });
      } catch (uploadError) {
        updateUpload(uploadId, { status: "error", message: uploadError instanceof Error ? uploadError.message : "No se pudo subir." });
      }
    }
    await load(true);
    setBusy(false);
  }

  async function openPreview(resource: Resource) {
    if (!client) return;
    const kind = fileKind(resource);
    if (kind === "other") { await downloadResource(resource); return; }
    if (kind === "text") {
      const { data, error: downloadError } = await client.storage.from("sis-private").download(resource.storage_path);
      if (downloadError) { setError(downloadError.message); return; }
      setPreview({ resource, text: await data.text() });
      return;
    }
    const { data, error: signedError } = await client.storage.from("sis-private").createSignedUrl(resource.storage_path, 60);
    if (signedError) { setError(signedError.message); return; }
    setPreview({ resource, url: data.signedUrl });
  }

  async function downloadResource(resource: Resource) {
    if (!client) return;
    const { data, error: signedError } = await client.storage.from("sis-private").createSignedUrl(resource.storage_path, 60, { download: resource.name });
    if (signedError) { setError(signedError.message); return; }
    const link = window.document.createElement("a");
    link.href = data.signedUrl;
    link.download = resource.name;
    link.rel = "noreferrer";
    link.click();
  }

  async function deleteResource(resource: Resource) {
    if (!client || !window.confirm(`¿Eliminar permanentemente “${resource.name}”?`)) return;
    setBusy(true); setError("");
    const { error: removeError } = await client.storage.from("sis-private").remove([resource.storage_path]);
    if (removeError) { setError(removeError.message); setBusy(false); return; }
    const { error: rowError } = await client.from("resources").delete().eq("id", resource.id);
    if (rowError) { setError(`El objeto se eliminó, pero no sus metadatos: ${rowError.message}`); setBusy(false); await load(true); return; }
    setNotice("Archivo eliminado.");
    await load(true);
    setBusy(false);
  }

  async function saveConcept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !selectedEntity || !conceptDraft) return;
    setBusy(true); setError("");
    const payload = {
      entity_id: selectedEntity.id,
      project_id: selectedProjectId,
      title: conceptDraft.title.trim(),
      slug: slugify(conceptDraft.title),
      content_md: conceptDraft.content_md,
      tags: conceptDraft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      status: conceptDraft.status,
    };
    const result = conceptDraft.id
      ? await client.from("ai_concepts").update(payload).eq("id", conceptDraft.id)
      : await client.from("ai_concepts").insert(payload).select("id").single();
    if (result.error) setError(result.error.message);
    else {
      if (!conceptDraft.id && "data" in result && result.data) setSelectedConceptId(result.data.id);
      setConceptDraft(null); setNotice("Concepto guardado."); await load(true);
    }
    setBusy(false);
  }

  async function importConceptFile(file: File) {
    const content = await file.text();
    const firstHeading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const title = firstHeading || file.name.replace(/\.(md|markdown)$/i, "");
    setConceptDraft({ id: null, title, content_md: content, tags: "", status: "draft" });
    setNotice("Markdown importado como borrador. Revisa y guarda el concepto.");
  }

  function exportConceptFile(concept: AiConcept) {
    const yamlTitle = concept.title.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, " ");
    const tags = `[${concept.tags.map((tag) => JSON.stringify(tag)).join(", ")}]`;
    const markdown = `---\ntitle: "${yamlTitle}"\nstatus: ${concept.status}\ntags: ${tags}\nentity_id: ${concept.entity_id}\n${concept.project_id ? `project_id: ${concept.project_id}\n` : ""}---\n\n${concept.content_md}`;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${concept.slug || slugify(concept.title)}.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function openConceptHistory(concept: AiConcept) {
    if (!client) return;
    const { data, error: historyError } = await client.from("ai_concept_revisions").select("id,snapshot,created_at").eq("concept_id", concept.id).order("created_at", { ascending: false }).limit(30);
    if (historyError) { setError(historyError.message); return; }
    setConceptRevisions((data ?? []) as ConceptRevision[]);
    setRevisionConcept(concept);
  }

  async function restoreConceptRevision(revision: ConceptRevision) {
    if (!client || !revisionConcept || !window.confirm("¿Restaurar esta versión? El contenido actual quedará como una nueva revisión.")) return;
    const snapshot = revision.snapshot;
    const { error: restoreError } = await client.from("ai_concepts").update({
      title: snapshot.title,
      slug: snapshot.slug,
      content_md: snapshot.content_md,
      tags: snapshot.tags,
      status: snapshot.status,
      metadata: snapshot.metadata,
    }).eq("id", revisionConcept.id);
    if (restoreError) setError(restoreError.message);
    else { setRevisionConcept(null); setNotice("Versión restaurada."); await load(true); }
  }

  async function deleteConcept(concept: AiConcept) {
    if (!client || !window.confirm(`¿Eliminar “${concept.title}” y sus versiones?`)) return;
    const { error: deleteError } = await client.from("ai_concepts").delete().eq("id", concept.id);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Concepto eliminado."); await load(true); }
  }

  const pageTitle = areaLabels[area];
  const rootCardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const count of resourceCounts) if (count.entity_id) counts.set(count.entity_id, (counts.get(count.entity_id) ?? 0) + Number(count.asset_count));
    return counts;
  }, [resourceCounts]);
  const folderCounts = useMemo(() => new Map(resourceCounts.filter((count) => count.folder_id).map((count) => [count.folder_id as string, Number(count.asset_count)])), [resourceCounts]);
  const renderMoveSelect = (resource: Resource) => <select className="library-move-select" value={resource.folder_id ?? ""} onChange={(event) => void moveResource(resource, event.target.value)} aria-label={`Mover ${resource.name} de carpeta`}><option value="">Raíz</option>{entityFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>;

  return <section className="library-workspace" aria-label={pageTitle}>
    <div className="library-heading">
      <div><span className="eyebrow">BIBLIOTECA PRIVADA</span><h2>{pageTitle}</h2><p>{area === "gallery" ? "Archivos visuales organizados por empresa y carpeta." : area === "documents" ? "Archivos y referencias organizados por empresa." : "Conceptos Markdown y archivos de contexto para IA."}</p></div>
      {selectedEntity && <button className="button button-outline" onClick={() => { setSelectedEntityId(null); setSelectedProjectId(null); setSelectedFolderId(null); setSearch(""); setConceptDraft(null); setSelectedConceptId(null); }}><ArrowLeft size={15} /> Todas las entidades</button>}
    </div>

    {error && <div className="library-message error-message" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError("")} aria-label="Cerrar error"><X size={15} /></button></div>}
    {notice && <div className="library-message success-message" role="status">{notice}<button className="icon-button" onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={15} /></button></div>}

    {!selectedEntity ? <div className="library-entity-grid">
      {entities.map((entity) => <button key={entity.id} className="library-entity-card" onClick={() => { setSelectedEntityId(entity.id); setSelectedProjectId(null); setSelectedFolderId(null); setConceptDraft(null); setSelectedConceptId(null); }}>
        <span className="library-entity-icon"><ImageIcon size={20} /></span><span className="eyebrow">{entity.entity_type}</span><strong>{entity.name}</strong><small>{entity.summary || "Sin descripción"}</small><span className="library-card-foot">{rootCardCounts.get(entity.id) ?? 0} archivos <ArrowRight size={14} /></span>
      </button>)}
      {!entities.length && !loading && <div className="empty-inline">No hay entidades disponibles para organizar.</div>}
    </div> : <>
      <div className="library-toolbar">
        <div className="library-breadcrumb"><button onClick={() => setSelectedFolderId(null)}>{selectedEntity.name}</button>{folderPath.map((folder) => <span key={folder.id}><ChevronRight size={14} /><button onClick={() => setSelectedFolderId(folder.id)}>{folder.name}</button></span>)}</div>
        <div className="library-actions">{availableProjects.length > 0 && <select className="library-project-select" value={selectedProjectId ?? ""} onChange={(event) => { setSelectedProjectId(event.target.value || null); setSelectedFolderId(null); }} aria-label="Filtrar por proyecto"><option value="">Espacio general</option>{availableProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>}<label className="library-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar archivos" aria-label="Buscar archivos" /></label><button className="button button-outline" onClick={() => fileInput.current?.click()} disabled={busy}><Upload size={15} /> Agregar contenido</button><input ref={fileInput} className="visually-hidden" type="file" multiple accept={uploadAccept} onChange={(event) => { if (event.currentTarget.files) void uploadFiles(event.currentTarget.files); event.currentTarget.value = ""; }} /></div>
      </div>

      <form className="library-folder-form" onSubmit={createFolder}><Folder size={16} /><input value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={120} placeholder="Nombre de nueva carpeta" aria-label="Nombre de nueva carpeta" /><button className="button button-light" disabled={busy || !folderName.trim()}><Plus size={14} /> Crear carpeta</button><small>Máximo 50 MB por archivo</small></form>

      <div className={`library-dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) void uploadFiles(event.dataTransfer.files); }}>
        <span>{area === "ai_concepts" && selectedConceptId ? "Adjuntos del concepto seleccionado · arrastra aquí o" : "Arrastra archivos aquí o"}</span><button className="button button-light" onClick={() => fileInput.current?.click()} disabled={busy}><Upload size={14} /> Elegir archivos</button>
      </div>

      {area === "ai_concepts" && <section className="ai-concepts-panel"><div className="library-section-heading"><div><span className="eyebrow">CONTENIDO MARKDOWN</span><h3>Conceptos de {selectedEntity.name}</h3></div><div className="library-actions"><button className="button button-outline" onClick={() => conceptImportInput.current?.click()}><Upload size={15} /> Importar .md</button><input ref={conceptImportInput} className="visually-hidden" type="file" accept=".md,.markdown,text/markdown" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void importConceptFile(file); event.currentTarget.value = ""; }} /><button className="button button-dark" onClick={() => { setConceptPreview(false); setConceptDraft({ id: null, title: "", content_md: "", tags: "", status: "draft" }); }}><Plus size={15} /> Nuevo concepto</button></div></div>
        {conceptDraft && <form className="concept-editor" onSubmit={saveConcept}><label>Título<input required maxLength={240} value={conceptDraft.title} onChange={(event) => setConceptDraft({ ...conceptDraft, title: event.target.value })} /></label><label>Etiquetas separadas por coma<input value={conceptDraft.tags} onChange={(event) => setConceptDraft({ ...conceptDraft, tags: event.target.value })} placeholder="agentes, contexto, proceso" /></label><label>Estado<select value={conceptDraft.status} onChange={(event) => setConceptDraft({ ...conceptDraft, status: event.target.value as AiConcept["status"] })}><option value="draft">Borrador</option><option value="approved">Aprobado</option><option value="archived">Archivado</option></select></label><div className="concept-preview-toggle"><span>Contenido Markdown</span><div className="settings-segmented" role="group" aria-label="Modo de edición Markdown"><button type="button" className={!conceptPreview ? "selected" : ""} onClick={() => setConceptPreview(false)}>Editar</button><button type="button" className={conceptPreview ? "selected" : ""} onClick={() => setConceptPreview(true)}>Previsualizar</button></div></div>{conceptPreview ? <article className="concept-markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{conceptDraft.content_md}</ReactMarkdown></article> : <textarea className="concept-markdown-input" rows={12} value={conceptDraft.content_md} onChange={(event) => setConceptDraft({ ...conceptDraft, content_md: event.target.value })} placeholder="# Objetivo&#10;&#10;Contexto, instrucciones y límites para el sistema de IA." />}<div className="modal-actions"><button type="button" className="button button-outline" onClick={() => { setConceptDraft(null); setConceptPreview(false); }}>Cancelar</button><button className="button button-dark" disabled={busy || !conceptDraft.title.trim()}><Check size={15} /> Guardar concepto</button></div></form>}
        <div className="concept-list">{entityConcepts.map((concept) => <article className={`concept-row ${selectedConceptId === concept.id ? "selected" : ""}`} key={concept.id}><div><span className={`status-pill ${concept.status}`}>{concept.status === "approved" ? "Aprobado" : concept.status === "archived" ? "Archivado" : "Borrador"}</span><h4>{concept.title}</h4><small>{concept.tags.join(" · ") || "Sin etiquetas"} · {resources.filter((resource) => resource.ai_concept_id === concept.id).length} adjuntos · Actualizado {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(concept.updated_at))}</small></div><div className="concept-actions"><button className="button button-light" onClick={() => setSelectedConceptId(selectedConceptId === concept.id ? null : concept.id)}>{selectedConceptId === concept.id ? "Adjuntos seleccionados" : "Adjuntar archivos"}</button><button className="button button-light" onClick={() => setConceptDraft({ id: concept.id, title: concept.title, content_md: concept.content_md, tags: concept.tags.join(", "), status: concept.status })}>Editar</button><button className="button button-light" onClick={() => void openConceptHistory(concept)}>Historial</button><button className="button button-light" onClick={() => exportConceptFile(concept)}>Exportar .md</button><button className="icon-button danger-hover" onClick={() => void deleteConcept(concept)} aria-label={`Eliminar ${concept.title}`}><Trash2 size={15} /></button></div></article>)}{!entityConcepts.length && <div className="empty-inline">Todavía no hay conceptos para esta entidad.</div>}</div>
      </section>}

      {currentFolders.length > 0 && <div className="library-folder-grid">{currentFolders.map((folder) => <article key={folder.id} className="library-folder-card"><button className="library-folder-open" onClick={() => setSelectedFolderId(folder.id)}><Folder size={21} /><span><b>{folder.name}</b><small>{folder.category.replaceAll("_", " ")} · {folderCounts.get(folder.id) ?? 0} archivos</small></span><ChevronRight size={15} /></button><div className="library-folder-tools"><button className="icon-button" onClick={() => setFolderDraft({ id: folder.id, name: folder.name })} aria-label={`Renombrar ${folder.name}`}>Editar</button><button className="icon-button danger-hover" onClick={() => void deleteFolder(folder)} aria-label={`Eliminar ${folder.name}`}><Trash2 size={14} /></button></div>{folderDraft?.id === folder.id && <form className="library-folder-rename" onSubmit={renameFolder}><input value={folderDraft.name} onChange={(event) => setFolderDraft({ ...folderDraft, name: event.target.value })} maxLength={120} aria-label="Nuevo nombre de carpeta" /><button className="icon-button" disabled={busy || !folderDraft.name.trim()} aria-label="Guardar nombre"><Check size={14} /></button><button type="button" className="icon-button" onClick={() => setFolderDraft(null)} aria-label="Cancelar"><X size={14} /></button></form>}</article>)}</div>}

      {area === "gallery" && <div className="library-file-grid">{visibleResources.map((resource) => {
        const kind = fileKind(resource);
        return <article className="library-file-card" key={resource.id}>
          <button className="library-file-preview" onClick={() => void openPreview(resource)} aria-label={`Previsualizar ${resource.name}`}>
            {kind === "image" && thumbUrls[resource.storage_path] ? <img src={thumbUrls[resource.storage_path]} alt={resource.alt_text || resource.name} loading="lazy" onError={() => setThumbUrls((current) => { const next = { ...current }; delete next[resource.storage_path]; return next; })} /> : <span>{kind === "video" ? <Video size={28} /> : kind === "image" ? <ImageIcon size={28} /> : <FileText size={28} />}</span>}
          </button>
          <div className="library-file-meta"><b title={resource.name}>{resource.caption || resource.name}</b><small>{resource.mime_type || "Formato desconocido"} · {formatBytes(resource.byte_size)}</small><div><button className="button button-light" onClick={() => void openPreview(resource)}>Abrir</button><button className="icon-button" onClick={() => setResourceDraft(resource)} aria-label={`Editar detalles de ${resource.name}`}><Pencil size={14} /></button><button className="icon-button" onClick={() => void downloadResource(resource)} aria-label={`Descargar ${resource.name}`}><ArrowDownToLine size={15} /></button><button className="icon-button danger-hover" onClick={() => void deleteResource(resource)} aria-label={`Eliminar ${resource.name}`}><Trash2 size={15} /></button></div>{renderMoveSelect(resource)}</div>
        </article>;
      })}</div>}

      {area !== "gallery" && <div className="library-file-list">{visibleResources.map((resource) => <article className="library-file-row" key={resource.id}><span className="library-file-type">{fileKind(resource) === "image" ? <ImageIcon size={18} /> : fileKind(resource) === "video" ? <Video size={18} /> : <FileText size={18} />}</span><div><b>{resource.caption || resource.name}</b><small>{resource.mime_type || "Formato desconocido"} · {formatBytes(resource.byte_size)} · {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(resource.created_at))}</small></div>{renderMoveSelect(resource)}<button className="button button-light" onClick={() => void openPreview(resource)}>Previsualizar</button><button className="icon-button" onClick={() => setResourceDraft(resource)} aria-label={`Editar detalles de ${resource.name}`}><Pencil size={14} /></button><button className="icon-button" onClick={() => void downloadResource(resource)} aria-label={`Descargar ${resource.name}`}><ArrowDownToLine size={15} /></button><button className="icon-button danger-hover" onClick={() => void deleteResource(resource)} aria-label={`Eliminar ${resource.name}`}><Trash2 size={15} /></button></article>)}</div>}

      {loading && <div className="library-loading" role="status">Cargando contenido…</div>}
      {!loading && !currentFolders.length && !visibleResources.length && area !== "ai_concepts" && <div className="empty-inline">Esta carpeta está vacía. Usa “Agregar contenido” o crea una carpeta para empezar.</div>}
      {!loading && hasMore && <button className="button button-outline library-more" onClick={() => void load(false)} disabled={busy}>Cargar más archivos</button>}
      {uploadStates.length > 0 && <div className="upload-queue" aria-live="polite"><div className="library-section-heading"><h3>Cola de carga</h3><button className="icon-button" onClick={() => setUploadStates([])} aria-label="Limpiar cola"><X size={15} /></button></div>{uploadStates.map((item) => <div className="upload-queue-row" key={item.id}><span>{item.status === "listo" ? <Check size={14} /> : item.status === "error" ? <X size={14} /> : <Upload size={14} />}</span><b>{item.name}</b><small>{item.message || item.status}</small></div>)}</div>}
    </>}

    {preview && <div className="library-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}><section className="library-preview-dialog" role="dialog" aria-modal="true" aria-label={`Previsualización de ${preview.resource.name}`}><header><div><b>{preview.resource.name}</b><small>{preview.resource.mime_type} · {formatBytes(preview.resource.byte_size)}</small></div><button className="icon-button" onClick={() => setPreview(null)} aria-label="Cerrar previsualización"><X size={18} /></button></header>{preview.text != null ? <pre>{preview.text}</pre> : preview.url && fileKind(preview.resource) === "image" ? <img src={preview.url} alt={preview.resource.alt_text || preview.resource.name} onError={() => setPreview({ resource: preview.resource })} /> : preview.url && fileKind(preview.resource) === "video" ? <video src={preview.url} controls playsInline onError={() => setPreview({ resource: preview.resource })} /> : preview.url && fileKind(preview.resource) === "audio" ? <audio src={preview.url} controls onError={() => setPreview({ resource: preview.resource })} /> : preview.url && fileKind(preview.resource) === "pdf" ? <iframe title={preview.resource.name} src={preview.url} sandbox="allow-same-origin" onError={() => setPreview({ resource: preview.resource })} /> : <p>Este formato o codec no se puede previsualizar en este navegador; descarga el archivo para abrirlo con una aplicación compatible.</p>}<footer><button className="button button-outline" onClick={() => void downloadResource(preview.resource)}><ArrowDownToLine size={15} /> Descargar</button></footer></section></div>}
    {resourceDraft && <div className="library-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setResourceDraft(null); }}><form className="resource-detail-form" role="dialog" aria-modal="true" aria-label={`Editar ${resourceDraft.name}`} onSubmit={saveResourceMetadata}><header><div><span className="eyebrow">DETALLES DEL ARCHIVO</span><h3>{resourceDraft.name}</h3></div><button type="button" className="icon-button" onClick={() => setResourceDraft(null)} aria-label="Cerrar"><X size={18} /></button></header><label>Leyenda<input name="caption" maxLength={240} defaultValue={resourceDraft.caption} /></label>{fileKind(resourceDraft) === "image" && <label>Texto alternativo<input name="alt_text" maxLength={240} defaultValue={resourceDraft.alt_text} placeholder="Describe brevemente la imagen" /></label>}<label>Categoría<select name="category" defaultValue={resourceDraft.category}><option value="general">General</option><option value="icon">Icono</option><option value="cover">Portada</option><option value="secondary_icon">Icono secundario</option><option value="special">Especial</option><option value="photo">Foto real</option><option value="gallery_extra">Galería extra</option></select></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setResourceDraft(null)}>Cancelar</button><button className="button button-dark" disabled={busy}><Check size={15} /> Guardar detalles</button></div></form></div>}
    {revisionConcept && <div className="library-preview-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRevisionConcept(null); }}><section className="concept-history-dialog" role="dialog" aria-modal="true" aria-label={`Historial de ${revisionConcept.title}`}><header><div><span className="eyebrow">VERSIONES ANTERIORES</span><h3>{revisionConcept.title}</h3></div><button className="icon-button" onClick={() => setRevisionConcept(null)} aria-label="Cerrar historial"><X size={18} /></button></header>{conceptRevisions.length ? conceptRevisions.map((revision) => <article className="concept-revision-row" key={revision.id}><div><b>{String(revision.snapshot.title ?? "Versión")}</b><small>{new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.created_at))}</small><pre>{String(revision.snapshot.content_md ?? "").slice(0, 360)}</pre></div><button className="button button-light" onClick={() => void restoreConceptRevision(revision)}>Restaurar</button></article>) : <div className="empty-inline">Todavía no hay versiones anteriores.</div>}</section></div>}
  </section>;
}
