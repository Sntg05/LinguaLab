---
status: active
updated: 2026-11-03
---

# Frontend rework: a toolbox that invites you in

Objective: a more modern, elegant, accessible interface that separates integrated tools from external links and only states true facts.
Branch: `feat/frontend-rework` (from `main` @ 9b779ab). Delivery: `ask-on-risk`, work-unit commits, no push until the owner reviews with `npm run dev`.
Runner: `npm test` (vitest), `npm run check`, `npm run test:e2e` (accessibility, reflow 320 px, console errors).

## Specs

- S1 Accessibility: "siento la página poco accesible". Readable type, AA contrast in both themes, visible focus, reduced motion, reflow at 320 px.
- S2 Separation: "las herramientas que están fusionadas dentro de la página y que funcionan están mezcladas con links a herramientas externas y eso genera una confusión clara, quisiera que estuvieran separados de alguna forma".
- S3 True copy: "la información contenida en los headers y demás cuadros textuales sea real, la página sigue diciendo que hay 3 herramientas no más". Counts are derived from `src/data/tools.json`, never typed.
- S4 Logo: "el logo de la página no me gusta". New mark and favicon.
- S5 Tree: "el arbol que aparece al comienzo está mal". The hero tree must be a well-formed constituency tree.
- S6 Phoneme of the day: "quiero que revises lo del fonema del día, dale un aire más moderno, algo llamativo pero elegante".
- S7 Toolbox feel: "una caja de herramientas interactivas que den ganas de entrar a ella, que contenga información claramente organizada ... si somos lingüistas los que lo vamos a usar quisiera que fuera claro con la información y con la organización que mantiene a la vista".
- S8 Scope: "por el momento hagamos un rework del frontend dónde nos centremos claramente en que sea más bonito, elegante y dinámico". No tool behavior changes.
- S9 Workflow: "realiza los cambios en una rama que yo pueda ver desde npm run dev en local ... antes de llevar a main".

## Design plan

- Palette (light): paper `#F4F5F9`, ink `#161A35`, indigo `#3730A3` (actions, links), saffron `#F5B83D` (highlighter, never text on light), slate `#585E77` (secondary text). Dark: night `#0F1226`, surface `#181C38`, ink `#E9EAF5`, indigo `#A9ADFF`, saffron `#F7C35A`.
- Type: Bricolage Grotesque (display, uses its width and optical-size axes), Atkinson Hyperlegible Next (body and UI: designed for low-vision readability), JetBrains Mono (only notation and code), Noto Sans for IPA.
- No ALL-CAPS labels, no middle-dot meta strings, no decorative numbering.
- One bold element: a live transcriber in the hero (Spanish orthography to IPA with the core engine), next to a correct tree.
- Integrated tools: grouped by level of analysis, rich tiles with a notation sample. External tools: a compact, visibly different directory with the destination domain.

## Tasks

| ID | Specs | Route | Status | Commit |
|---|---|---|---|---|
| T1 | S1, S8 | inline | pending | |
| T2 | S4 | inline | pending | |
| T3 | S2, S3, S5, S7 | inline | pending | |
| T4 | S6 | inline | pending | |
| T5 | S2, S3 | inline | pending | |
| T6 | S1, S3 | inline | pending | |

- T1 Tokens, fonts, base and component styles (both themes).
- T2 New logo, favicon, masthead and footer.
- T3 Home: hero with live transcriber and correct tree, integrated tools by level, separate external directory, derived counts.
- T4 Phoneme of the day redesign.
- T5 Catalog: integrated and external in separate sections.
- T6 Copy sweep for stale claims, accessibility and e2e gate.

Route evidence: one owner, sequential units that all depend on T1's tokens; no Writer trigger.

## Log

- L1 (2026-11-03, owner): "acabamos de hacer auditoria a la página de LinguaLab, ahora necesito que utilizando todos los plugins necesarios, arreglemos el frontend sobre todo porque siento la página poco accesible, las herramientas que están fusionadas dentro de la página y que funcionan están mezcladas con links a herramientas externas y eso genera una confusión clara, quisiera que estuvieran separados de alguna forma, adicionalmente necesito que la información contenida en los headers y demás cuadros textuales sea real, la página sigue diciendo que hay 3 herramientas no más, el logo de la página no me gusta y el arbol que aparece al comienzo está mal, quiero que revises lo del fonema del día, dale un aire más moderno, algo llamativo pero elegante, quiero que sea una caja de herramientas interactivas que den ganas de entrar a ella, que contenga información claramente organizada, si somos lingüistas los que lo vamos a usar quisiera que fuera claro con la información y con la organización que mantiene a la vista, por el momento hagamos un rework del frontend dónde nos centremos claramente en que sea más bonito, elegante y dinámico, realiza los cambios en una rama que yo pueda ver desde npm run dev en local y poder ir viendo los cambios antes de llevar a main o mergear a alguna branch nueva, para poder en cualquier caso empezar desde dónde quedamos con el último commit que consolidó la auditoria de seguridad y demás, estamos?"
- L2 Diagnosis: the home says "Tres laboratorios" while `tools.json` holds 10 embedded and 10 external; the hero tree has NP dominating two leaves directly and an empty VP; the palette is the generic warm-cream and terracotta look; the catalog mixes embedded and external cards in one grid per area.
