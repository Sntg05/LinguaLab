/* ============================================================
   LinguaLab — guardrail and security-check definitions
   Bilingual copy lives here so the panels can render in either locale
   at build time, with no runtime dictionary.
   ============================================================ */

export type LocalizedText = { es: string; en: string };

/** A guardrail that describes a property the build guarantees. */
export interface Guardrail {
  id: string;
  title: LocalizedText;
  desc: LocalizedText;
}

/** A check evaluated live in the visitor's browser. */
export interface SecurityCheckDef {
  id: SecurityCheckId;
  label: LocalizedText;
}

export type SecurityCheckId =
  | "https"
  | "csp"
  | "sri"
  | "thirdparty"
  | "cookies"
  | "storage"
  | "xss"
  | "sandbox";

export const GUARDRAILS: readonly Guardrail[] = [
  {
    id: "input",
    title: { es: "Límites de entrada", en: "Input limits" },
    desc: {
      es: "Textos hasta 100 KB, extensiones en lista blanca y marcado activo bloqueado.",
      en: "Texts up to 100 KB, whitelisted extensions and active markup blocked.",
    },
  },
  {
    id: "xss",
    title: { es: "Escape de contenido (anti-XSS)", en: "Content escaping (anti-XSS)" },
    desc: {
      es: "El texto del usuario se inserta como nodos de texto, nunca como HTML.",
      en: "User text is inserted as text nodes, never as HTML.",
    },
  },
  {
    id: "csp",
    title: { es: "Política de seguridad de contenido", en: "Content Security Policy" },
    desc: {
      es: "CSP con hashes por script, sin 'unsafe-inline' y sin object-src.",
      en: "CSP with per-script hashes, no 'unsafe-inline' and no object-src.",
    },
  },
  {
    id: "sri",
    title: { es: "Sin dependencias de terceros", en: "No third-party dependencies" },
    desc: {
      es: "Fuentes y scripts servidos desde el propio origen: no hay peticiones a terceros que verificar.",
      en: "Fonts and scripts are served from our own origin: there are no third-party requests to verify.",
    },
  },
  {
    id: "perf",
    title: { es: "Presupuesto de rendimiento", en: "Performance budget" },
    desc: {
      es: "Análisis en el cliente con una carga inicial de ~15 KB comprimidos.",
      en: "Client-side analysis with a ~15 KB compressed initial payload.",
    },
  },
  {
    id: "privacy",
    title: { es: "Privacidad por diseño", en: "Privacy by design" },
    desc: {
      es: "Sin cookies, sin telemetría, sin seguimiento. Nada sale de tu navegador.",
      en: "No cookies, no telemetry, no tracking. Nothing leaves your browser.",
    },
  },
  {
    id: "integrity",
    title: { es: "Integridad y licencia de datos", en: "Data integrity & licensing" },
    desc: {
      es: "Los datos de AFI y bibliografía llevan versión y licencia en cada descarga.",
      en: "IPA and bibliography data carry a version and a licence on every download.",
    },
  },
  {
    id: "storage",
    title: { es: "Datos locales controlables", en: "Controllable local data" },
    desc: {
      es: "localStorage solo en tu equipo, con un botón para borrarlo todo.",
      en: "localStorage only on your device, with a button to wipe it all.",
    },
  },
];

export const SECURITY_CHECKS: readonly SecurityCheckDef[] = [
  { id: "https", label: { es: "Conexión cifrada (HTTPS)", en: "Encrypted connection (HTTPS)" } },
  {
    id: "csp",
    label: { es: "Política de seguridad de contenido (CSP)", en: "Content Security Policy (CSP)" },
  },
  { id: "sri", label: { es: "Sin dependencias externas", en: "No external dependencies" } },
  { id: "thirdparty", label: { es: "Sin rastreadores de terceros", en: "No third-party trackers" } },
  { id: "cookies", label: { es: "Sin cookies", en: "No cookies" } },
  { id: "storage", label: { es: "Datos solo en tu dispositivo", en: "Data stays on your device" } },
  {
    id: "xss",
    label: { es: "Sin ejecución dinámica insegura", en: "No unsafe dynamic execution" },
  },
  { id: "sandbox", label: { es: "Análisis local (100% en navegador)", en: "Local analysis (100% in browser)" } },
];

/** Date of the last manual review of the policies and data licences. */
export const REVIEW_DATE = "2026-09-27";
