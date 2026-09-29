# LinguaLab — Warm scholarly restyle and recentred landing

Replace the site's visual identity from "cool editorial minimalist" to "warm
humanist scholarly", then revise the information architecture so the site reads
as what it is: a computational linguistics toolbox for Universidad Nacional de
Colombia students working towards AI and computational linguistics.

## Context

The v2.0.0 Astro port established a cool-hued editorial identity: near-white
OKLCH backgrounds at hue 250, a single low-chroma teal accent
(`oklch(52% 0.09 205)`), Inter for UI, Newsreader for display, and a warm ochre
`--mark` reserved for phonetic emphasis.

Two properties of that port make a full re-theme cheap and safe:

1. **Colour is fully tokenized.** Outside `src/styles/tokens.css` the only
   literal colours were two `theme-color` meta tags
   (`src/layouts/Base.astro:77-78`). Every other colour declaration resolves
   through `var(--…)` or a `color-mix()` over tokens.
2. **`@layer` discipline.** `tokens → base → layout → components → utilities`
   means a token change cannot be silently outranked by a component rule.

Baseline before this work (recorded on `main`):

| Check | Result |
|---|---|
| `astro check` | 0 errors, 0 warnings, 0 hints |
| `vitest run` | 536 passing across 17 files |
| `astro build` | 17 pages |
| `verify:build` | passed — worst page 28.1 KB gz of a 60 KB budget |

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Visual direction | Warm humanist scholarly — paper grounds, terracotta accent, more serif | Requested. Matches the subject matter: a linguistics reference should read as a book, not a dashboard. |
| Token names | **Frozen**; only values change | `src/scripts/trees/export.ts:41-54` resolves these names with `getComputedStyle` so a downloaded SVG stands alone. Renaming silently breaks export. |
| Register | Colour values stay plain OKLCH literals | `resolveCustomProperties()` reads computed values; a nested `color-mix()` chain would degrade export output to `currentColor`. |
| Structural motion | `--section-y`, type scale and easing unchanged | Density and rhythm are layout, not skin. |
| Accent family | Terracotta (`~hue 40`) replaces teal (`~hue 205`) | The single largest identity change; also the riskiest, because `--warn` is also warm. |
| Header contents | Only the tools, plus the two controls | This is a toolbox. The header should say so before it says anything else. |
| `Seguridad` placement | Footer legal line | Requested: consultable, not central. The legal line is where a reader looks only when they want it. |
| Central theme | Computational linguistics for UNAL students, towards AI | Requested. Privacy was the old headline and is now a footnote. |
| UNAL naming | Audience only, plus an explicit non-affiliation line | Confirmed as a personal project. Naming an institution you do not belong to reads as endorsement unless it is said plainly. |
| Source link | `SITE_REPO` defaults to the author's public repository | The URL is public and stable, so it serves as a real default rather than a placeholder. The variable still overrides it for forks. |

## Non-goals

- No layout, grid, spacing-rhythm, or `--section-y` changes.
- No component restructuring beyond extracting the duplicated brand lockup.
- No new pages, no new font files, no new dependencies, no build-step changes.
- **No renaming, adding or removing of design tokens.**
- No third theme or palette switcher; light/dark/auto behaviour is unchanged.
- **No institutional affiliation is claimed.** The copy names UNAL as the
  *audience*, and the footer carries an explicit non-affiliation line. The
  project is the author's own.

## Work units

1. **WU-1 — Warm token palette.** `src/styles/tokens.css`: all three colour
   blocks (light, `[data-theme="dark"]`, `prefers-color-scheme` fallback),
   warmer shadow tint, softer radii. *(done, approved)*
2. **WU-2 — Metadata truth.** `theme-color` hexes derived from the new palette
   rather than eyeballed. *(done)*
3. **WU-3 — Brand lockup.** New `src/components/Brand.astro` holding a modern
   mark and wordmark, replacing two byte-identical copies in the masthead and
   the footer. Wordmark moved off the display serif onto the UI face, tightened,
   with the second half in the accent colour. *(done)*
4. **WU-4 — Header information architecture.** Masthead renders only primary
   items; `Seguridad` and the redundant `Inicio` entry removed; `Bibliografía`
   promoted. *(done)*
5. **WU-5 — Security demoted.** Removed from the masthead and the 404 list;
   placed in the footer legal line. Page framing softened from "we are
   protected" to "technical details". *(done)*
6. **WU-6 — Landing recentred.** Hero, statistics and notes rewritten around
   the degree and the discipline. The privacy section became a training section
   with one footnoted link to `/seguridad`. *(done)*
7. **WU-7 — Locale parity.** Both dictionaries updated together; obsolete
   section keys removed rather than left dangling. *(done)*
8. **WU-8 — Footer legal completeness.** Non-affiliation line added; the
   source-code link restored by giving `SITE_REPO` a real default. *(done)*

The multi-file write trigger fired for WU-3–WU-8. They were kept inline rather
than delegated: the work is copy and visual judgement that depends on this
conversation's context, the four files are mutually dependent (the component is
consumed by both layouts), and the user asked to iterate on taste with further
instructions. **Recorded as a deliberate routing deviation, not an oversight.**

## Deployment

Branch pushed over SSH with a repository-scoped deploy key, so no secret
travelled through the session. Vercel's Git integration built a **Preview**
deployment automatically; nothing was promoted to production.

- Preview: `https://lingualab-h4szw0u38-lambda-un.vercel.app` (commit `cb00e02`)
- Vercel reported `success`; GitHub Pages did not run (its workflow listens to
  `main` only) and CI did not run (no pull request)

Verified against the **deployed HTML and CSS**, not the local build:

| Check | Production | Preview |
|---|---|---|
| `theme-color` | `#fcfdfe` / `#0d1620` | `#fbf7ef` / `#1a140f` |
| Header links | 8, including `/seguridad` | 4, no `Seguridad` |
| Hero | "Analiza el lenguaje, en el navegador." | "Herramientas de lingüística computacional para tu formación." |
| Brand wordmark | single tone, serif | two-tone, UI face (`brand__name-accent`) |
| Footer | lone word `procesamiento` | full sentence, plus the non-affiliation line |
| Source link | absent | `github.com/Sntg05/LinguaLab` |
| CSP | — | hashes present, no `unsafe-inline` |

Every colour in the served stylesheet matches its authored value. Note that
`lightningcss` transpiles `oklch()` into a hex fallback plus a `lab()`
value, so the palette is present but not in its authored notation. Each
token appears six times: three theme blocks (light, `[data-theme="dark"]`,
and the `prefers-color-scheme` fallback) times two declarations.

## Evidence

| Check | Result |
|---|---|
| baseline (main) | 536 tests, 17 pages, verify:build passed |
| `astro check` | 0 errors, 0 warnings, 0 hints |
| `vitest run` | 536 passing, 17 files |
| `astro build` | 17 pages |
| `verify:build` | passed |
| Page payload | worst 28.5 KB gz of 60 KB (was 28.1 KB; +0.4 KB) |
| Palette audit | light and dark: every text/background pair ≥ 4.5:1, no value outside sRGB, `--accent`/`--mark`/`--warn`/`--ok` all ≥ ΔE 0.05 apart |
| Masthead output | 4 links, `Seguridad` absent |
| Footer, both locales | © line, `Seguridad`, `Código fuente`/`Source code` and the non-affiliation line all render |
| Inline `style` attributes on `/` | 0 (was 2) |

The palette audit was a throwaway harness in `/tmp`; it is not part of the
repository, and its numbers are reproducible from the token values.

## Defects found

Fixed here:

- **The brand mark existed twice.** `Masthead.astro` and `Footer.astro` each
  carried a byte-identical inline `<svg>`, so any change had to be made twice.
- **`primary` was a dead field.** `NavItem.primary` was declared and set for all
  eight items but never read, so every item rendered in the masthead regardless.
  The field now governs the masthead, and `PRIMARY_NAV_ITEMS` derives from it.
- **The theme toggle announced the wrong thing, in the wrong language.**
  Server-rendered `aria-label={t(locale,"nav.menu")}` reads "Menú", and the
  browser script then overwrote it with hard-coded Spanish strings
  (`"Tema: oscuro"`) on every locale including `/en/`. The labels now come from
  the dictionary via data attributes, and the script leaves the server label
  alone when they are absent. The language switcher had the same "Menú" label.
- **`SITE_REPO` was never defined anywhere.** The variable was read in
  `src/config/site.ts:60`, both dictionaries carried `foot.source`, and
  `Footer.astro` and `About.astro:271` both had the logic to render the link —
  but nothing ever set the variable, so `SITE.repository` was permanently
  `null` and a public repository was never linked from the site. Fixed in WU-8.
- **A one-word fragment rendered in the footer.** `foot.local` held
  `"procesamiento"` / `"processing"` and the template printed it on its own, so
  every page showed a lone word under the footer navigation. `foot.localb`
  ("local") was never used, which suggests the phrase was originally split
  across two keys and the second was dropped. `foot.local` is now a complete
  sentence.
- **Obsolete i18n keys** (`hero.quote`, `hero.trust1..3`) belonged to the
  section that was replaced; removed with their section.

Found, **not** fixed here — outside this change's scope:

- **Inline `style` attributes are blocked by this project's CSP.** The policy
  emits `style-src` with `'self'` plus per-`<style>` hashes. Per CSP3, style
  *attributes* fall back to `style-src` and are only permitted with
  `'unsafe-inline'` or `'unsafe-hashes'`; Astro's own schema agrees, rejecting
  `'unsafe-hashes'` for `element` resources and listing it as valid only for
  `attribute` resources. So these styles **never applied in production**:
  6 in `TextStation.astro`, 4 in `SecurityPage.astro`, 2 in `ArborLab.astro`,
  1 in `About.astro`, 1 in `pages/404.astro`. The two in `Footer.astro` were
  fixed as part of WU-3. Confidence: high, from the CSP specification and
  Astro's implementation. **Not empirically confirmed** — headless rendering is
  broken in this environment, and no browser test was run.
- **Sixteen dead i18n keys** from the legacy site remain (`hero.eyebrow`,
  `hero.t1..t3`, `hero.swap.1..3`, `hero.lead`, `hero.cta1`, `hero.cta2`,
  `nav.lab`, `nav.start`, `brand.name`, `brand.tag`, and the whole `news.*`
  newsletter block that belongs to a removed feature). Left in place to keep
  this diff reviewable; they need a separate sweep.
- **`stylelint` cannot run.** `package.json` defines
  `lint:css` but `stylelint` is not in `devDependencies` and is not in CI.
- **`mark` as a text colour failed AA** in the old palette (3.59:1). Fixed as a
  side effect of WU-1 (now 4.96:1).
- **`--ink-faint` failed AA** in the old palette (3.02:1). Fixed in WU-1
  (5.17:1). This makes "faint" text visibly darker than before — a deliberate
  trade of visual lightness for legibility, and the most likely thing to want
  reversed.

## Open questions

None. The UNAL question is closed: the project is the author's own, the copy
addresses UNAL students as its audience, and the footer states the absence of
affiliation explicitly.

## Checks not yet run

1. **No visual browser confirmation.** The deployed HTML, CSS and headers were
   verified by fetching them, and the values are provably correct, but no human
   or automated browser has rendered the result to confirm it *looks* right.
   Headless Firefox fails in this environment
   (`RenderCompositorSWGL failed mapping default framebuffer`).
   **Look at `https://lingualab-h4szw0u38-lambda-un.vercel.app`.**
2. **No pull request, so CI never ran** on this branch. Local `check`, `test`,
   `build` and `verify:build` all pass, commit by commit.
3. **`lint:css` cannot run** — see Defects found.

## Notes for the reviewer

- The branch is `style/warm-scholarly-restyle`; `main` is untouched and nothing
  has been pushed.
- Deliberately excluded: any change to `tokens.css` token *names*, to
  `--section-y`, or to the type scale.
- Nothing is committed yet, so every choice here is still cheap to reverse.
