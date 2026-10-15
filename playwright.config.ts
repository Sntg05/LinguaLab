import { defineConfig, devices } from "@playwright/test";

/**
 * Configuracion de las pruebas de extremo a extremo.
 *
 * POR QUE CONTRA EL RESULTADO COMPILADO Y NO CONTRA EL SERVIDOR DE DESARROLLO
 *
 * `astro dev` sirve los modulos sin empaquetar, con recarga en caliente y sin
 * pasar por la verificacion de la compilacion. Es comodo, pero probaria un sitio
 * que nadie publica: la CSP viaja como metaetiqueta generada en la compilacion,
 * los estilos se inlinean segun el presupuesto y el JavaScript se agrupa por
 * pagina. Por eso el `webServer` compila y sirve `dist/` — lo mismo que se
 * despliega.
 *
 * El puerto 4321 es el de `astro preview`. En local, si ya hay un servidor
 * levantado se reutiliza en vez de fallar: mientras se escribe una prueba,
 * reiniciar el servidor en cada corrida es la diferencia entre usarla y no usarla.
 */

const PORT = 4321;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  // En CI, un `test.only` olvidado no debe reducir la suite a un caso sin que
  // nadie se entere.
  forbidOnly: Boolean(process.env.CI),
  // Un reintento en CI absorbe la intermitencia de un servidor que arranca; en
  // local, un reintento esconde un fallo real detras de un verde.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Un rastro solo cuando algo ya fallo y hubo que reintentar: es la evidencia
    // que se quiere tener entonces, y no el ruido de cada corrida en verde.
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
