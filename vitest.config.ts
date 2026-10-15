import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // El sitio Astro y los paquetes del workspace comparten una sola corrida de
    // Vitest: mismo reporter, mismo umbral, un solo comando que recordar.
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
    // Los tests del nucleo son TypeScript puro y los adaptadores usan
    // `fake-indexeddb`, asi que el entorno de Node alcanza para todo.
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/scripts/**", "src/data/**", "packages/*/src/**"],
      reporter: ["text", "html"],
    },
  },
});
