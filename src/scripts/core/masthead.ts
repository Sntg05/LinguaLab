/* ============================================================
   LinguaLab — masthead (DOM)
   Adds the hairline border once the page has scrolled, and keeps the
   skip-link target clear of the sticky header.
   ============================================================ */

export function initMasthead(): void {
  const masthead = document.querySelector<HTMLElement>("[data-masthead]");
  if (!masthead) return;

  // A sentinel above the masthead avoids listening to scroll positions:
  // when it leaves the viewport the header is no longer at the top.
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;pointer-events:none";
  document.body.prepend(sentinel);

  const observer = new IntersectionObserver(
    ([entry]) => {
      masthead.dataset["stuck"] = String(!entry?.isIntersecting);
    },
    { threshold: 0 },
  );

  observer.observe(sentinel);
}
