/* ============================================================
   LinguaLab — navigation disclosure (DOM)
   The nav is a plain list of links in the markup; this only adds the
   open/close behaviour for viewports below the nav breakpoint.
   ============================================================ */

export function initNavDisclosure(): void {
  const toggle = document.querySelector<HTMLButtonElement>("[data-nav-toggle]");
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!toggle || !nav) return;

  const setOpen = (open: boolean): void => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.dataset["open"] = String(open);
  };

  setOpen(false);

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Escape closes and returns focus to the control that opened the panel.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (toggle.getAttribute("aria-expanded") !== "true") return;

    setOpen(false);
    toggle.focus();
  });

  // A click outside the panel dismisses it.
  document.addEventListener("click", (event) => {
    if (toggle.getAttribute("aria-expanded") !== "true") return;

    const target = event.target;
    if (target instanceof Node && (nav.contains(target) || toggle.contains(target))) return;

    setOpen(false);
  });

  // Following a link inside the panel should not leave it open behind the
  // next page's header. Same-page anchors need the panel closed first.
  nav.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") ?? "";
    if (href.startsWith("#")) {
      setOpen(false);
    }
  });

  // Trap-free: on wide viewports the panel is a normal horizontal list, so
  // make sure a stale `data-open` never hides it after a resize.
  const wide = window.matchMedia("(min-width: 64rem)");
  const sync = (): void => {
    if (wide.matches) {
      nav.dataset["open"] = "true";
      toggle.setAttribute("aria-expanded", "true");
    } else if (toggle.getAttribute("aria-expanded") === "true") {
      // Keep the open state across a rotate; only close on explicit action.
      nav.dataset["open"] = "true";
    }
  };
  wide.addEventListener("change", sync);
  sync();
}
