"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowDown, Bot, Check, LockKeyhole, Plus, Send, Sparkles, UserRound } from "lucide-react";
import type { getSupabase } from "@/lib/supabase";

type PendingAction = {
  operation: "create" | "update" | "delete";
  table: string;
  record_id?: string;
  values?: Record<string, unknown>;
  label: string;
  warning?: string;
};
type ChatMessage = { role: "user" | "assistant"; content: string; pendingAction?: PendingAction; actionCancelled?: boolean };

const suggestions = [
  "¿Qué tareas están bloqueadas y de qué entidad dependen?",
  "Resume las misiones activas y sus próximos pasos.",
  "¿Qué dicen mis documentos sobre la estrategia de Soverath?",
];

export function AIAssistant({ client, onActionComplete }: { client: ReturnType<typeof getSupabase> | null; onActionComplete: () => Promise<unknown> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function sendMessage(content: string) {
    const question = content.trim();
    if (!client || !question || busy) return;
    setDraft("");
    setError("");
    const nextMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(nextMessages);
    setBusy(true);
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión para continuar.");
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      const result = await response.json() as { reply?: string; error?: string; pendingAction?: PendingAction };
      if (!response.ok) throw new Error(result.error || "No se pudo completar la consulta.");
      if (!result.reply) throw new Error("El asistente devolvió una respuesta vacía.");
      setMessages((current) => [...current, { role: "assistant", content: result.reply!, ...(result.pendingAction ? { pendingAction: result.pendingAction } : {}) }]);
    } catch (sendError) {
      setMessages(messages);
      setDraft(question);
      setError(sendError instanceof Error ? sendError.message : "No se pudo conectar con el asistente.");
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  async function confirmAction(index: number, action: PendingAction) {
    if (!client || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión para continuar.");
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ mode: "execute", confirmed: true, action }),
      });
      const result = await response.json() as { reply?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "SIS no pudo completar la acción.");
      setMessages((current) => [...current.map((message, messageIndex) => messageIndex === index ? { ...message, pendingAction: undefined } : message), { role: "assistant", content: result.reply || "Acción completada." }]);
      await onActionComplete().catch(() => undefined);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No se pudo ejecutar la acción.");
    } finally {
      setBusy(false);
    }
  }

  function cancelAction(index: number) {
    setMessages((current) => current.map((message, messageIndex) => messageIndex === index ? { ...message, pendingAction: undefined, actionCancelled: true } : message));
  }

  return <section className="ai-assistant" aria-label="Asistente AI">
    <div className="ai-chat-topline">
      <div className="ai-identity"><span className="ai-mark"><Sparkles size={17} /></span><span><b>Asistente SIS</b><small>Gemini · contexto privado del sistema</small></span></div>
      <button className="button button-outline" onClick={() => { setMessages([]); setError(""); setDraft(""); textareaRef.current?.focus(); }} disabled={busy}><Plus size={15} /> Nueva conversación</button>
    </div>

    <div className="ai-chat-log" role="log" aria-live="polite" aria-relevant="additions text">
      {messages.length === 0 ? <div className="ai-welcome">
        <span className="ai-welcome-mark"><Sparkles size={22} /></span>
        <span className="eyebrow">SOVERATH · ASISTENTE INTERNO</span>
        <h2>¿Qué necesitas resolver?</h2>
        <p>Consulta, organiza y actualiza información de SIS. Cada cambio requiere tu confirmación.</p>
        <div className="ai-suggestions">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={busy}>{suggestion}<ArrowDown size={14} /></button>)}</div>
      </div> : <div className="ai-message-list">{messages.map((message, index) => <article className={`ai-message ${message.role}`} key={`${index}-${message.role}`}>
        <span className="ai-message-avatar">{message.role === "assistant" ? <Bot size={16} /> : <UserRound size={15} />}</span>
        <div className="ai-message-body">
          {message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : <p>{message.content}</p>}
          {message.pendingAction && <div className={`ai-action-card ${message.pendingAction.operation === "delete" ? "destructive" : ""}`}>
            <div className="ai-action-heading"><b>{message.pendingAction.label}</b><span>{message.pendingAction.operation === "delete" ? "BORRADO" : "CAMBIO PENDIENTE"}</span></div>
            {message.pendingAction.warning && <p className="ai-action-warning">{message.pendingAction.warning}</p>}
            {message.pendingAction.values && <details className="ai-action-details"><summary>Revisar campos</summary><dl>{Object.entries(message.pendingAction.values).map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd></div>)}</dl></details>}
            <div className="ai-action-buttons"><button className={message.pendingAction.operation === "delete" ? "button button-danger" : "button button-dark"} disabled={busy} onClick={() => void confirmAction(index, message.pendingAction!)}><Check size={14} /> Confirmar y ejecutar</button><button className="button button-outline" disabled={busy} onClick={() => cancelAction(index)}>Cancelar</button></div>
          </div>}
          {message.actionCancelled && <span className="ai-action-cancelled">Acción cancelada.</span>}
        </div>
      </article>)}{busy && <article className="ai-message assistant"><span className="ai-message-avatar"><Bot size={16} /></span><div className="ai-thinking"><i /><i /><i /><span>Consultando el contexto de SIS…</span></div></article>}</div>}
      {error && <div className="ai-error" role="alert">{error}</div>}
      <div ref={endRef} />
    </div>

    <form className="ai-composer" onSubmit={submitMessage}>
      <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Pregunta, crea o actualiza algo en SIS…" aria-label="Mensaje para el asistente" rows={1} maxLength={5000} disabled={busy || !client} />
      <button className="ai-send" type="submit" aria-label="Enviar mensaje" title="Enviar mensaje" disabled={busy || !draft.trim() || !client}>{busy ? <span className="ai-spinner" /> : <Send size={17} />}</button>
      <div className="ai-privacy-note"><LockKeyhole size={12} /><span>Los cambios requieren confirmación · Procesado con Google AI Studio.</span><span className="ai-char-count">{draft.length}/5000</span></div>
    </form>
  </section>;
}