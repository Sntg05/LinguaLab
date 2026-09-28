/* ============================================================
   LinguaLab — live security checks
   Each check reads from an injectable Probe rather than the globals
   directly, so the decision logic is unit tested and the DOM access
   stays in one place.
   ============================================================ */

import { SECURITY_CHECKS, type SecurityCheckId } from "../../data/guardrails";

export interface Probe {
  protocol: string;
  hostname: string;
  /** Whether a CSP meta element is present. */
  hasCspMeta: boolean;
  externalScriptCount: number;
  externalScriptWithIntegrity: number;
  externalStyleCount: number;
  externalStyleWithIntegrity: number;
  thirdPartyScriptCount: number;
  cookieLength: number;
  /** -1 when storage is unavailable. */
  localStorageKeyCount: number;
  /** Count of inline event handlers and javascript: URLs. */
  unsafeAttributeCount: number;
}

export interface CheckResult {
  id: SecurityCheckId;
  ok: boolean;
  detailKey: string;
  /** Values interpolated into the localised detail message. */
  detailValues?: Record<string, string | number>;
}

/** Hosts where a plain-HTTP dev server is expected and acceptable. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function evaluate(probe: Probe): CheckResult[] {
  const isLocal = LOCAL_HOSTS.has(probe.hostname);

  const httpsOk =
    probe.protocol === "https:" || probe.protocol === "file:" || isLocal;

  const externalTotal = probe.externalScriptCount + probe.externalStyleCount;
  const externalWithSri = probe.externalScriptWithIntegrity + probe.externalStyleWithIntegrity;

  return [
    {
      id: "https",
      ok: httpsOk,
      detailKey: "check.detail.protocol",
      detailValues: { protocol: probe.protocol },
    },
    {
      id: "csp",
      ok: probe.hasCspMeta,
      detailKey: probe.hasCspMeta ? "check.detail.cspOn" : "check.detail.cspOff",
    },
    {
      // With no third-party assets there is nothing to verify, which is the
      // strongest possible outcome rather than a pass by omission.
      id: "sri",
      ok: externalTotal === 0 || externalWithSri === externalTotal,
      detailKey: "check.detail.sri",
      detailValues: { withSri: externalWithSri, total: externalTotal },
    },
    {
      id: "thirdparty",
      ok: probe.thirdPartyScriptCount === 0,
      detailKey:
        probe.thirdPartyScriptCount === 0
          ? "check.detail.noTrackers"
          : "check.detail.trackers",
      detailValues: { count: probe.thirdPartyScriptCount },
    },
    {
      id: "cookies",
      ok: probe.cookieLength === 0,
      detailKey: probe.cookieLength === 0 ? "check.detail.noCookies" : "check.detail.cookies",
    },
    {
      id: "storage",
      ok: true,
      detailKey:
        probe.localStorageKeyCount < 0
          ? "check.detail.storageUnavailable"
          : "check.detail.storage",
      detailValues: { count: Math.max(probe.localStorageKeyCount, 0) },
    },
    {
      id: "xss",
      ok: probe.unsafeAttributeCount === 0,
      detailKey:
        probe.unsafeAttributeCount === 0 ? "check.detail.noUnsafe" : "check.detail.unsafe",
      detailValues: { count: probe.unsafeAttributeCount },
    },
    {
      id: "sandbox",
      ok: true,
      detailKey: "check.detail.local",
    },
  ];
}

export interface SecurityScore {
  passed: number;
  total: number;
  checks: CheckResult[];
}

export function score(probe: Probe): SecurityScore {
  const checks = evaluate(probe);
  return {
    passed: checks.filter((c) => c.ok).length,
    total: checks.length,
    checks,
  };
}

/** The DOM-backed probe used in the browser. */
export function readProbe(): Probe {
  const externalScripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[src^="http"]'),
  );
  const externalStyles = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href^="http"]'),
  );

  let localStorageKeyCount = -1;
  try {
    localStorageKeyCount = localStorage.length;
  } catch {
    localStorageKeyCount = -1;
  }

  return {
    protocol: location.protocol,
    hostname: location.hostname,
    hasCspMeta: document.querySelector('meta[http-equiv="Content-Security-Policy" i]') !== null,
    externalScriptCount: externalScripts.length,
    externalScriptWithIntegrity: externalScripts.filter((el) => el.integrity).length,
    externalStyleCount: externalStyles.length,
    externalStyleWithIntegrity: externalStyles.filter((el) => el.integrity).length,
    thirdPartyScriptCount: document.querySelectorAll(
      'script[src*="googlesyndication"],script[src*="google-analytics"],script[src*="analytics"],script[src*="facebook.net"],script[src*="doubleclick"]',
    ).length,
    cookieLength: document.cookie.length,
    localStorageKeyCount,
    unsafeAttributeCount: document.querySelectorAll(
      "[onclick],[onerror],[onload],[onmouseover],[href^='javascript:']",
    ).length,
  };
}

export { SECURITY_CHECKS };
