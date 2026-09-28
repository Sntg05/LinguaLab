/* ============================================================
   LinguaLab — security and guardrail panels (DOM)
   Every string reaches the page through textContent. There is no
   innerHTML in this module, so the panels cannot introduce markup
   even if a check detail ever contained angle brackets.
   ============================================================ */

import { GUARDRAILS, REVIEW_DATE, SECURITY_CHECKS } from "../../data/guardrails";
import type { Locale } from "../../i18n";
import { wipeLocalData } from "./guardrails";
import { readProbe, score } from "./security";

type MessageFn = (key: string) => string;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Replace {placeholders} in a message with the supplied values. */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

export function renderSecurityPanel(container: HTMLElement, t: MessageFn, locale: Locale): void {
  const result = score(readProbe());

  const list = el("ul", "check-list");
  list.setAttribute("role", "list");

  for (const check of result.checks) {
    const def = SECURITY_CHECKS.find((d) => d.id === check.id);
    const label = def ? def.label[locale] : check.id;

    const item = el("li", `check-item ${check.ok ? "is-ok" : "is-warn"}`);
    item.append(el("span", "check-dot"));
    item.append(el("span", "check-label", label));
    item.append(
      el("span", "check-detail", interpolate(t(check.detailKey), check.detailValues)),
    );
    item.append(
      el(
        "span",
        "check-state",
        check.ok ? "✓" : "!",
      ),
    );
    item.querySelector(".check-state")?.setAttribute("aria-hidden", "true");
    // The state is not conveyed by the symbol alone.
    item.setAttribute(
      "aria-label",
      `${label}: ${check.ok ? t("sec.stateOk") : t("sec.stateFail")}`,
    );

    list.append(item);
  }

  container.replaceChildren(
    list,
    el(
      "p",
      "check-summary",
      `${t("sec.passed")
        .replace("{passed}", String(result.passed))
        .replace("{total}", String(result.total))} · ${t("sec.reviewed").replace(
        "{date}",
        REVIEW_DATE,
      )}`,
    ),
  );
}

export function renderGuardrailPanel(
  container: HTMLElement,
  t: MessageFn,
  locale: Locale,
): { passed: number; total: number } {
  const grid = el("div", "guardrail-grid");

  for (const guardrail of GUARDRAILS) {
    const card = el("article", "card guardrail-card is-ok");
    const head = el("div", "guardrail-head");
    head.append(el("span", "guardrail-state", "✓"));
    head.querySelector(".guardrail-state")?.setAttribute("aria-hidden", "true");
    head.append(el("span", "badge badge--ok", t("sec.stateOn")));
    card.append(head);
    card.append(el("h3", "card__title", guardrail.title[locale]));
    card.append(el("p", "card__body", guardrail.desc[locale]));
    grid.append(card);
  }

  container.replaceChildren(grid);
  return { passed: GUARDRAILS.length, total: GUARDRAILS.length };
}

/** Wire every [data-wipe] button on the page. */
export function initWipeButtons(t: MessageFn): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-wipe]")) {
    button.addEventListener("click", () => {
      let local: Storage | null = localStorage;
      let session: Storage | null = sessionStorage;
      try {
        // Touch the storages first: Safari private mode throws on access.
        void local.length;
        void session.length;
      } catch {
        local = null;
        session = null;
      }

      const ok = wipeLocalData(local, session);
      button.textContent = ok ? t("sec.wipeDone") : t("sec.wipeFail");
      button.disabled = true;
    });
  }
}
