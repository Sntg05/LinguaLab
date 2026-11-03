import { configDefaults, defineConfig } from "vitest/config";

// Los orquestadores del navegador se prueban en un DOM simulado; todo lo demas
// no. El sufijo decide el entorno, no un comentario dentro del archivo: asi una
// prueba del nucleo no puede empezar a usar `document` sin que falle, y una
// prueba de orquestador no puede olvidarse de pedir el DOM.
const DOM_TESTS = "src/**/*.dom.test.ts";

export default defineConfig({
  test: {
    // El sitio Astro y los paquetes del workspace comparten una sola corrida de
    // Vitest: mismo reporter, mismo umbral, un solo comando que recordar. Los
    // dos proyectos heredan esta configuracion (`extends: true`) y solo cambian
    // que archivos toman y en que entorno los corren.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
          exclude: [...configDefaults.exclude, DOM_TESTS],
          // Los tests del nucleo son TypeScript puro y los adaptadores usan
          // `fake-indexeddb`, asi que el entorno de Node alcanza para todo.
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: [DOM_TESTS],
          // happy-dom y no jsdom: arranca en una fraccion del tiempo y alcanza
          // para lo que estos orquestadores hacen —atributos, `textContent`,
          // eventos—. El comportamiento en un navegador real lo sigue fijando
          // Playwright.
          environment: "happy-dom",
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/scripts/**", "src/data/**", "packages/*/src/**"],
      reporter: ["text", "html"],
    },
  },
});
