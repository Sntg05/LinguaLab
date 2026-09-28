/* ============================================================
   LinguaLab — anti-flash theme script
   This must run before the first paint, so it cannot be deferred to an
   external file: a request would let the page paint in the wrong theme
   first. It therefore ships as an inline script, which means the
   Content-Security-Policy needs its hash.

   The source lives here as a single constant so the build can hash the
   exact bytes it is about to emit. Editing the string without updating
   the hash would break the policy, so src/scripts/core/anti-flash.test.ts
   asserts the two stay in step.
   ============================================================ */

export const ANTI_FLASH_SOURCE = `(function(){try{var s=localStorage.getItem("lingualab-theme");if(s==="light"||s==="dark"){document.documentElement.dataset.theme=s;}}catch(e){}})();`;
