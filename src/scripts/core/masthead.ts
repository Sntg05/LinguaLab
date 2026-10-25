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
  //
  // La clase y no `style.cssText`: la CSP del sitio es `style-src 'self'` con
  // hashes, y eso **bloquea los atributos `style`**, incluidos los que se ponen
  // desde JavaScript con `cssText` o `setAttribute`. Medido en un navegador: el
  // centinela quedaba sin `position: absolute` y sin `pointer-events: none`, o
  // sea un div de 1x1 en el flujo del documento, en la parte de arriba de todas
  // las páginas. La consola lo decía —«Applying inline style violates the
  // following Content Security Policy directive»— y nadie lo estaba leyendo.
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.className = "u-sentinel";
  document.body.prepend(sentinel);

  const observer = new IntersectionObserver(
    ([entry]) => {
      masthead.dataset["stuck"] = String(!entry?.isIntersecting);
    },
    { threshold: 0 },
  );

  observer.observe(sentinel);
}
