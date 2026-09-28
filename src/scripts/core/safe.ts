/* ============================================================
   LinguaLab — safe module initialisation
   A failing widget must never take down the page. Each initialiser is
   wrapped so a throw is contained and reported instead of leaving the
   page half-initialised.
   ============================================================ */

export interface InitResult {
  name: string;
  ok: boolean;
  error?: string;
}

const NAMESPACE = "lingualab";

/**
 * Run an initialiser, capturing any failure.
 * Returns a result so callers (and the build's error panel) can report
 * which widget degraded.
 */
export function safeInit(name: string, init: () => void): InitResult {
  try {
    init();
    return { name, ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Structured, non-noisy: one line per genuine failure.
    console.warn(`[${NAMESPACE}] "${name}" failed to initialise:`, message);
    return { name, ok: false, error: message };
  }
}

/** Run several initialisers, collecting their results. */
export function safeInitAll(
  entries: Record<string, () => void>,
): InitResult[] {
  return Object.entries(entries).map(([name, init]) => safeInit(name, init));
}

/** Announce a failure to assistive tech without stealing focus. */
export function announceFailure(message: string): void {
  const region = document.querySelector<HTMLElement>("[data-live-region]");
  if (region) region.textContent = message;
}
