# LinguaLab — Astro port

Full port of the legacy vanilla-JS LinguaLab site to Astro 7 + strict
TypeScript, with a minimalist redesign and per-tool work units.

## Context

The legacy site (preserved verbatim in `legacy/`) was ~7,000 lines of
hand-maintained HTML with 23 `window.X = …` IIFE scripts, 4 CSS files,
and no build, no tests, no type checking and no version control.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Framework | Astro 7, static output | Ships ~0 KB runtime by default |
| UI framework | **none** | The tools are pure computation + DOM. React/Svelte would add a runtime for zero benefit. Interactivity is per-page bundled TypeScript in `<script>` blocks. |
| TypeScript | 6.0.3 | Newest version `@astrojs/check` supports; TS 7 is not yet accepted by its peer range. |
| Styling | Hand-written CSS with `@layer` | Full control, no runtime, no build-time dependency. Tokens in OKLCH. |
| i18n | Build-time, per-locale static routes (`/`, `/en/…`) | Removes the legacy runtime `data-i18n` engine, its `innerHTML`/`sanitizeRich` path, and the duplicated translation payload. |
| Typefaces | Self-hosted via `@fontsource`, declared with explicit `@font-face` | Removes the Google Fonts request that contradicted the no-tracking promise. |
| Tests | Vitest, pure logic only | The ported pure functions are the regression surface. |

## Non-goals

- No backend, no newsletter. The legacy form had no endpoint and only
  faked a success message; it was removed rather than ported.
- No UI framework, deliberately.
- Audio samples are not authored. `audio/ipa/` remains empty, so playback
  falls back to the Web Speech API, as the legacy build already did.

## Work units

Each closes with a work-unit commit on the feature branch.

1. **Foundation** — git, Astro scaffold, tokens, shell, i18n, landing.
2. **Core** — guardrails, security panel, input limits, error boundaries.
3. **FonoLab** — IPA chart, audio, transcriber.
4. **ArborLab** — parsers, layout, render, checks, solvers, export.
5. **Text station** — tokenize, frequency, KWIC, stats, n-grams, readability.
6. **Glossary + bibliography**.
7. **Security + about**.
8. **Audit + publish** — SEO, a11y, perf budget, README, GitHub Pages.

## Evidence

| Check | Result |
|---|---|
| `astro check` | 0 errors, 0 warnings, 0 hints |
| `vitest run` | 44 passing |
| `astro build` | 2 pages (es, en) |
| Page payload | 15.0 KB gz (4.9 HTML + 3.1 JS + 7.0 CSS) |
| `dist/` size | 540 KB (was 2.4 MB before the font-face fix) |

## Defects found and fixed

- **False claim on the landing page.** The legacy page advertised "170 AFI
  symbols covered" while the data contained 104. Counts are now derived
  from the data, and `src/data/data.test.ts` pins the real numbers.
- **Four missing core IPA symbols.** `l` (alveolar lateral approximant),
  `j` (palatal approximant), `ɪ` and `æ` had audio mappings but no chart
  entry, so they were unreachable. Added with bilingual articulatory data.
- **Orphan audio key.** The manifest mapped `tʃ` while the chart uses the
  correct tie-bar form `t͡ʃ`, so that recording could never be reached.
- **Fonts called out to Google.** Replaced with self-hosted faces.
- **IPA could render as tofu.** Phonetic symbols previously relied on system
  fallback. The IPA face now covers Latin-Ext, IPA Extensions, Spacing
  Modifiers and Greek (θ is U+03B8, i.e. Greek — not IPA).

## Notes for the reviewer

- `legacy/` is the porting reference. Delete it once every tool is ported.
- The git author is a placeholder (`LinguaLab Port`) because no git identity
  was configured in this environment. Amend before publishing.
- `SITE.repository` in `src/config/site.ts` is a placeholder.
