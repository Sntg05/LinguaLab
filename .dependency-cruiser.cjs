/**
 * Reglas de dependencia de la arquitectura hexagonal.
 *
 * Estas reglas son la parte ejecutable de la decisión ADR 0001: sustituyen a
 * la buena voluntad por una comprobación que falla en CI. Si alguien invierte
 * una flecha —el núcleo importando un adaptador, un adaptador importando la
 * interfaz— `npm run deps:check` lo detiene antes del merge.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment:
        "Un ciclo de imports significa que dos modulos se conocen mutuamente: no hay direccion de dependencia que respetar. Las aristas puramente de tipo se excluyen porque el compilador las borra: un ciclo que no existe en el JavaScript emitido no puede producir un error de inicializacion.",
      from: {},
      to: { circular: true, dependencyTypesNot: ["type-only", "type-import"] },
    },
    {
      name: "no-unresolvable",
      severity: "error",
      comment:
        "Un import que no se puede resolver compila en el editor pero explota en el build. Mejor detenerlo aquí.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "core-is-hermetic",
      severity: "error",
      comment:
        "El núcleo (dominio, puertos, casos de uso) no puede depender de adaptadores ni de la UI. Las flechas apuntan hacia adentro.",
      from: { path: "^packages/core" },
      to: { path: "^(packages/adapters|src)" },
    },
    {
      name: "adapters-do-not-know-the-ui",
      severity: "error",
      comment:
        "Un adaptador secundario implementa un puerto; nunca conoce la pantalla que lo invoca. Si necesita la UI, el puerto está mal diseñado.",
      from: { path: "^packages/adapters" },
      to: { path: "^src" },
    },
    {
      name: "ui-to-adapters-only-from-composition-root",
      severity: "error",
      comment:
        "Los componentes de la interfaz solo pueden importar el núcleo. Cablear adaptadores es responsabilidad exclusiva del composition root.",
      from: {
        path: "^src",
        pathNot: "^src/composition-root\\.ts$",
      },
      to: { path: "^packages/adapters" },
    },
    {
      name: "no-reaching-into-core-internals",
      severity: "error",
      comment:
        "Nadie importa archivos sueltos del núcleo por ruta profunda: sus DOS entradas públicas son el índice del paquete y el subpath de pruebas, tal como los declara packages/core/package.json. Cualquier otra ruta profunda queda prohibida.",
      from: { pathNot: "^packages/core" },
      to: { path: "^packages/core/src/(?!index\\.ts$)(?!testing/index\\.ts$)" },
    },
  ],
  options: {
    doNotFollow: { path: "(^|/)(node_modules|dist|\\.astro)/" },
    exclude: { path: "(^|/)(node_modules|dist|\\.astro|coverage)/" },
    // El proyecto es ESM puro; el compilador de TypeScript resuelve los
    // alias de workspace igual que lo hará Vite.
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "types", "default"],
      extensions: [".ts", ".tsx", ".mjs", ".js", ".json"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
