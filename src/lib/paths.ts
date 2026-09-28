/* ============================================================
   LinguaLab — path resolution under a deployment subpath

   GitHub Pages serves a project repository from a SUBPATH, for example
   `https://sntg05.github.io/LinguaLab/`. Every root-absolute URL — links,
   assets, audio — then needs that prefix, or it resolves against the domain
   root and 404s.

   Astro exposes the configured `base` as `import.meta.env.BASE_URL`, which
   Vite substitutes in both server and client code. These helpers turn a
   root-absolute path into a correctly prefixed one.

   With `base: "/"` (local development) the prefix is empty and every path is
   returned unchanged, so the same code works in both cases.
   ============================================================ */

/** The configured base with any trailing slash removed: "" or "/LinguaLab". */
export const BASE: string = (import.meta.env.BASE_URL ?? "/").replace(/\/+$/, "");

/**
 * Prefix a root-absolute path with the deployment base.
 *
 * Relative paths and protocol-relative URLs are returned unchanged, so this
 * is safe to apply to any href.
 */
export function withBase(path: string): string {
  const value = String(path ?? "");
  if (!value.startsWith("/")) return value; // relative or absolute URL
  if (value.startsWith("//")) return value; // protocol-relative
  if (BASE === "") return value;
  return `${BASE}${value}`;
}

/** The site root, correctly prefixed. */
export function baseRoot(): string {
  return BASE === "" ? "/" : `${BASE}/`;
}
