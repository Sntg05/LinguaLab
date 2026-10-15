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
    // POR QUE NO SE REUTILIZA UN SERVIDOR EXISTENTE, NI EN LOCAL
    //
    // `reuseExistingServer: true` es la comodidad habitual de Playwright, y aquí
    // es una trampa silenciosa: si hay un `astro dev` escuchando en el puerto
    // —cosa que pasa todo el tiempo mientras alguien mira el sitio— la puerta lo
    // reutiliza y termina probando el servidor de DESARROLLO. Ese servidor no
    // aplica la CSP, sirve los módulos sin empaquetar y compila a demanda, así
    // que las pruebas miden un artefacto que nadie publica; encima, con 56
    // pruebas golpeándolo, casi todas se caen por tiempo de espera y el fallo
    // parece un problema de las pruebas en vez de lo que es.
    //
    // Un verde que no significa lo que dice es peor que un rojo: nadie investiga
    // un verde. Con `false`, Playwright exige el puerto libre y, si está ocupado,
    // falla diciendo qué lo ocupa. Es un segundo de fricción a cambio de que
    // «pasa» signifique «pasa contra lo que se despliega».
    reuseExistingServer: false,
  },
});
