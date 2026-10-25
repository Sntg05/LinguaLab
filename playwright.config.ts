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
 * El puerto de la puerta es 4331, distinto del 4321 de `npm run dev`, y eso es la
 * mejora de **P7**: mientras los dos compartian puerto, la puerta dependia de que
 * nadie estuviera mirando el sitio, y el fallo que se veia entonces —«la url ya esta
 * en uso»— culpaba a las pruebas de una decision del entorno. Separarlos elimina la
 * clase entera de defecto en vez de solo el caso.
 *
 * **No se reutiliza un servidor que ya este escuchando, ni en local** —ver el
 * comentario de `reuseExistingServer` mas abajo—: reutilizar el de desarrollo probaba
 * un artefacto que nadie publica. Una version anterior de este comentario decia lo
 * contrario, que se reutilizaba por comodidad; quedo falso cuando la guarda se volvio
 * estructural y se corrige aqui.
 */

const PORT = 4331;

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
    // `--ignore-lock` es la unica pieza que no es obvia, y no es un truco: desde Astro 7 el CLI
    // detecta que lo lanza un agente (`am-i-vibing`, que lee `AI_AGENT`, `PI_CODING_AGENT` y una
    // veintena mas) y manda `astro preview` al fondo solo, porque asume que un agente no quiere un
    // proceso en primer plano. Playwright exige justo lo contrario: un servidor en primer plano que
    // viva mientras corre la suite, y si el proceso termina aborta con `Process from config.webServer
    // exited early`, sin decir por que. La bandera significa exactamente lo que necesitamos —servidor
    // de una sola corrida, en primer plano, sin escribir el archivo de bloqueo— y la soporta el propio
    // CLI. Ver **P16** de `docs/PENDING.md`: las dos alternativas que se habian descartado eran
    // reutilizar el servidor (P7) y sembrar la variable para enganar al detector.
    command: "npm run build && npm run preview:e2e",
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
    // falla avisando que la url ya esta en uso. Es un segundo de friccion a cambio de que
    // «pasa» signifique «pasa contra lo que se despliega».
    reuseExistingServer: false,
  },
});
