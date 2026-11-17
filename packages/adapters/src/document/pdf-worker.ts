/**
 * El worker de pdf.js, como entrada propia para que Vite lo empaquete y lo
 * sirva desde este mismo origen (la CSP no admite workers de otro sitio).
 * Al cargarse dentro de un worker, el módulo de pdf.js se conecta solo a los
 * mensajes del hilo principal.
 */
import "pdfjs-dist/build/pdf.worker.mjs";
