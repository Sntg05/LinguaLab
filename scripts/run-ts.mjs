/**
 * Ejecuta un script TypeScript del repositorio que importa código del núcleo.
 *
 * POR QUÉ EXISTE
 *
 * `node --experimental-strip-types` quita los tipos, pero no resuelve
 * importaciones sin extensión (`./trim-edges`), que es como está escrito
 * `packages/core`. Vite sí las resuelve y ya está instalado: este envoltorio
 * carga el script con el mismo resolvedor que usan el build y las pruebas, sin
 * añadir dependencias.
 *
 * Uso: node scripts/run-ts.mjs scripts/eval-g2p.mts
 */
import { resolve } from "node:path";
import { createServer } from "vite";

const target = process.argv[2];
if (!target) {
  console.error("uso: node scripts/run-ts.mjs <script.mts>");
  process.exit(2);
}
const server = await createServer({
  logLevel: "error",
  server: { middlewareMode: true, hmr: false, watch: null },
  appType: "custom",
});
try {
  await server.ssrLoadModule(resolve(target));
} finally {
  await server.close();
}
