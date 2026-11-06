"use client";

import { useEffect, useState } from "react";
import { ArrowDownToLine, Check, Clock3, LockKeyhole, LogOut, MonitorCog, ShieldCheck } from "lucide-react";

type Density = "comfortable" | "compact";

export function SettingsPanel({ email, onSignOut, onExport }: { email: string; onSignOut: () => void; onExport: () => void }) {
  const [density, setDensity] = useState<Density>("comfortable");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [timeZone, setTimeZone] = useState("Detectada por el navegador");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("sis:preferences:density");
      if (stored === "comfortable" || stored === "compact") setDensity(stored);
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "Detectada por el navegador");
    } catch { setTimeZone("Detectada por el navegador"); }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    document.documentElement.dataset.density = density;
    try {
      window.localStorage.setItem("sis:preferences:density", density);
      setSaved(true);
      const timer = window.setTimeout(() => setSaved(false), 1800);
      return () => window.clearTimeout(timer);
    } catch { setSaved(false); }
  }, [density, preferencesLoaded]);

  return <section className="settings-workspace" aria-label="Configuración general">
    <div className="settings-intro"><span className="eyebrow">PREFERENCIAS Y CUENTA</span><h2>Configuración</h2><p>Preferencias de presentación y controles de la cuenta Founder.</p></div>
    <div className="settings-grid">
      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><MonitorCog size={18} /></span><div><h3>Presentación</h3><p>Se guarda en este navegador.</p></div></div><div className="settings-field"><span>Densidad de la interfaz</span><div className="settings-segmented" role="group" aria-label="Densidad de la interfaz"><button className={density === "comfortable" ? "selected" : ""} onClick={() => setDensity("comfortable")}>Cómoda</button><button className={density === "compact" ? "selected" : ""} onClick={() => setDensity("compact")}>Compacta</button></div></div><div className="settings-fact"><span>Idioma y formato</span><b>Español · Colombia (COP)</b></div><div className="settings-fact"><span>Zona horaria del dispositivo</span><b>{timeZone}</b></div><small className="settings-save-status">{saved && <><Check size={13} /> Preferencia guardada</>}</small></section>

      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><ShieldCheck size={18} /></span><div><h3>Cuenta y seguridad</h3><p>Acceso privado con segundo factor.</p></div></div><div className="settings-fact"><span>Cuenta</span><b>{email || "Cuenta Founder"}</b></div><div className="settings-fact"><span>Autenticación</span><b className="settings-secure"><LockKeyhole size={14} /> Contraseña + TOTP</b></div><div className="settings-card-actions"><button className="button button-outline" onClick={onSignOut}><LogOut size={15} /> Cerrar sesión</button></div></section>

      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><LockKeyhole size={18} /></span><div><h3>Archivos privados</h3><p>Almacenamiento protegido por sesión y AAL2.</p></div></div><div className="settings-fact"><span>Bucket</span><b>Privado · SIS</b></div><div className="settings-fact"><span>Límite actual</span><b>50 MB por archivo</b></div><div className="settings-fact"><span>Enlaces de descarga</span><b>Firmados · 60 segundos</b></div><p className="settings-note">Los límites de Storage dependen del proyecto y se cambian en Supabase.</p></section>

      <section className="settings-card"><div className="settings-card-heading"><span className="settings-icon"><Clock3 size={18} /></span><div><h3>Respaldo de datos</h3><p>Exporta tablas y metadatos de SIS en JSON.</p></div></div><p className="settings-note">Los archivos binarios no se incluyen en el JSON; deben respaldarse por separado desde Storage.</p><div className="settings-card-actions"><button className="button button-dark" onClick={onExport}><ArrowDownToLine size={15} /> Exportar respaldo JSON</button></div></section>
    </div>
  </section>;
}
