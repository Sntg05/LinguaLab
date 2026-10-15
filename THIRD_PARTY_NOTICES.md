# Avisos de terceros

LinguaLab se apoya en software de otras personas. Esta tabla registra **qué** se usa y **bajo qué
licencia**, para que cualquiera pueda comprobarlo sin leer `package-lock.json`.

Reglas de esta tabla:

- Una dependencia nueva no entra hasta estar anotada aquí. Si no sabes su licencia, es que todavía
  no la revisaste.
- Las versiones son las instaladas de verdad, no un rango. Se comprueban con
  `node -e "console.log(require('<paquete>/package.json').version)"`.
- El audio y las fuentes tienen su propio registro: `public/audio/ATTRIBUTION.md` para las
  grabaciones y `src/styles/fonts.css` para las familias tipográficas. No se duplican aquí.

## Herramientas de construcción y calidad

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| [astro](https://www.npmjs.com/package/astro) | 7.3.5 | MIT | Generador del sitio estático: rutas, empaquetado y CSP con hashes |
| [typescript](https://www.npmjs.com/package/typescript) | 6.0.3 | Apache-2.0 | Compilador y comprobación de tipos |
| [vitest](https://www.npmjs.com/package/vitest) | 5.0.2 | MIT | Pruebas unitarias del sitio, del núcleo y de los adaptadores |
| [@biomejs/biome](https://www.npmjs.com/package/@biomejs/biome) | 2.5.15 | MIT OR Apache-2.0 | Linter y formateador |
| [dependency-cruiser](https://www.npmjs.com/package/dependency-cruiser) | 18.5.0 | MIT | Comprueba que las flechas del hexágono apunten hacia adentro (ADR 0001) |
| [@commitlint/cli](https://www.npmjs.com/package/@commitlint/cli) | 21.2.3 | MIT | Valida los mensajes de commit |
| [@commitlint/config-conventional](https://www.npmjs.com/package/@commitlint/config-conventional) | 21.2.3 | MIT | Conjunto de reglas de Conventional Commits |
| [husky](https://www.npmjs.com/package/husky) | 9.1.7 | MIT | Ganchos de git: lint de lo que se está commiteando |
| [lint-staged](https://www.npmjs.com/package/lint-staged) | 17.6.0 | MIT | Ejecuta el linter solo sobre los archivos preparados |
| [@astrojs/sitemap](https://www.npmjs.com/package/@astrojs/sitemap) | 3.7.4 | MIT | Genera el `sitemap.xml` en la compilación |
| [@playwright/test](https://www.npmjs.com/package/@playwright/test) | 1.63.0 | Apache-2.0 | Recorre los flujos de la interfaz en un navegador de verdad |
| [playwright](https://www.npmjs.com/package/playwright) | 1.63.0 | Apache-2.0 | El motor de navegador que Playwright controla |
| [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright) | 4.13.0 | MPL-2.0 | Comprueba accesibilidad WCAG 2.2 AA en las páginas publicadas |
| [axe-core](https://www.npmjs.com/package/axe-core) | 4.13.0 | MPL-2.0 | El motor de reglas que usa axe |
| [fake-indexeddb](https://www.npmjs.com/package/fake-indexeddb) | 6.2.5 | Apache-2.0 | IndexedDB en memoria, para probar el adaptador en Node sin navegador |

### Sobre la MPL-2.0 de axe

`axe-core` y `@axe-core/playwright` son MPL-2.0, que es copyleft **a nivel de archivo**: obliga a
publicar las modificaciones a *sus* archivos, no a contaminar el resto del proyecto. Aquí se usan sin
modificarlos y solo como dependencias de desarrollo, así que no afectan a la licencia de LinguaLab ni a
lo que se publica. Se anota porque una licencia con condiciones merece estar declarada y no descubierta
después.

## Tipografía

Autoalojada: no hay petición a Google Fonts en ningún momento.

| Paquete | Versión | Licencia | Uso |
|---|---|---|---|
| [@fontsource-variable/inter](https://www.npmjs.com/package/@fontsource-variable/inter) | 5.3.0 | OFL-1.1 | Texto de la interfaz |
| [@fontsource-variable/newsreader](https://www.npmjs.com/package/@fontsource-variable/newsreader) | 5.3.0 | OFL-1.1 | Titulares |
| [@fontsource-variable/jetbrains-mono](https://www.npmjs.com/package/@fontsource-variable/jetbrains-mono) | 5.3.0 | OFL-1.1 | Transcripciones y código |
| [@fontsource/noto-sans](https://www.npmjs.com/package/@fontsource/noto-sans) | 5.3.0 | OFL-1.1 | Cobertura de los símbolos del AFI |

## Herramientas previstas (segmentos 5 a 9 del prompt)

Se anotan aquí **antes** de integrarse, con la versión que se fijó y la licencia leída de su propio
paquete. Si alguna se descarta, pasa a la sección de descartadas con el motivo: una dependencia que
se probó y no sirvió también es una decisión que conviene poder auditar.

| Paquete | Versión | Licencia | Uso | Estado |
|---|---|---|---|---|
| _pendiente_ | — | — | — | Sin integrar |

## Descartadas

| Paquete | Motivo |
|---|---|
| _ninguna todavía_ | — |
