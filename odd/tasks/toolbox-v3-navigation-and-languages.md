# Toolbox v3: navigation by level of analysis, example languages, audio tool

Three product moves that share one cause: the toolbox grew from four tools to seven, and the header
still behaves like it holds four. This document covers the navigation, the example corpora in two new
languages, and segment 6 of the prompt (audio viewer, spectrogram and TextGrid).

## Specs

**S1 — The header stops being a list of tools and becomes an entrance.** Verbatim: «quiero que revises
la barra de las herramientas y las reorganices para que al añadir más herramientas sean más fáciles de
llegar». Adding tool number eight must not lengthen the header.

**S2 — The catalog button becomes the toolbox entrance.** Verbatim: «propongo que hagas del botón
catálogo algo como "Catálogo de herramientas" y ahí condensarlas todas en orden por nivel de análisis
que propone cada herramienta». Every tool reachable from there, ordered by level of analysis, with the
label «Catálogo de herramientas» / «Tool catalog».

**S3 — The header stays consistent, accessible and ordered.** Verbatim: «que en la barra de arriba sea
más consistente, accesible y ordenado». Concretely: one visual weight for every item, `aria-current`
on the current page, no item rendered differently from its siblings, keyboard and screen-reader
behaviour unchanged, and the axe gate green on all pages in both themes.

**S4 — More example languages, synthetic and short.** Verbatim: «quiero que hagas de forma sintética
ejemplos de más lenguas aparte del español y el inglés para las herramientas que ofrecen texto de
ejemplo».

**S5 — At least two new languages: one majority, one living and well-documented Colombian minority
language.** Verbatim: «explora bibliografía relacionada para poder construir al menos 2 lenguas más,
una lengua mayoritaria y una lengua minoritaria de Colombia que esté vital y bien documentada».

**S6 — The no-invented-data rule survives.** The prompt's non-negotiable principle 2 says: «No inventes
datos lingüísticos. Para lenguas indígenas, entrega plantillas vacías y mensajes que pidan verificar
con hablantes y fuentes. Solo el español y el inglés llevan ejemplos de demostración.»

S4 and S6 collide, and S5 is how the user resolves the collision: the new material must be **built from
bibliography**, not from memory. Therefore every example ships with its provenance in the interface,
and the indigenous examples keep the warning to verify with speakers. The decision is recorded in an
ADR (see T4) rather than left implicit.

## Tasks

| ID | Task | Spec | Route | Commit |
|---|---|---|---|---|
| T1 | Design the header: brand + «Catálogo de herramientas» entrance + language/theme controls | S1, S2, S3 | inline | `feat(ui): …` |
| T2 | Order the catalog by level of analysis and make every tool reachable from it | S2 | inline | `feat(catalogo): …` |
| T3 | Verify the header with the axe gate in both themes and both locales | S3 | inline | included in T1 |
| T4 | Research bibliography for the two new languages and record the provenance ADR | S5, S6 | research + ADR | `docs(adr): …` |
| T5 | Implement the example corpora for the two languages in every tool that offers example text | S4, S5 | inline | `feat(datos): …` |
| T6 | Segment 6: audio viewer, spectrogram and TextGrid | — | see below | `feat(herramientas): …` |

T6 is the largest item and arrives last on purpose: the header redesign (T1) is what makes room for it.

## Log

- **L1 — Pedido original del usuario (verbatim).** See `odd/tasks/security-and-doc-hygiene.md`, L1.
