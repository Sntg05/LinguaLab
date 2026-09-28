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
2. **Core** — guardrails, security panel, input limits, error boundaries. **(done)**
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
| `vitest run` | 102 passing across 6 files |
| `astro build` | 4 pages (es/en x home, security) |
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

## WU-2 — Core runtime (complete)

Added: input guardrails with byte-exact limits, live security checks, panel
renderers with no `innerHTML`, a `safeInit` boundary so one failing widget
cannot take down a page, a hash-based CSP, a post-build verifier and CI.

### CSP

Astro 7's `security.csp` generates the policy with a hash per inline script and
style, which is required here because GitHub Pages cannot set response
headers. `unsafe-inline` is gone from both `script-src` and `style-src`.

The anti-flash theme script must stay inline (it runs before first paint), so
its hash is derived at build time from the same constant that is emitted
(`src/lib/anti-flash.ts`), and the two cannot drift.

### Post-build verification

`scripts/verify-build.mjs` fails the build on an unhashed inline script,
`unsafe-inline` returning to the policy, a third-party subresource, a
duplicate `<h1>`, a missing `lang` or description, or a page exceeding its
60 KB gzipped budget. It was checked against deliberate regressions
(unhashed script, remote `<script src>`, second `<h1>`) and catches all three.

### Incident: unreadable working directory

The original path `/home/santi/Documentos/Opencode projects/LinguaLab` became
unreadable mid-session: directory listings intermittently showed a partial
tree while `open()` returned ENOENT for files that `ls` and `stat` reported as
present. `git` reported "not a repository" despite `.git` being listed.

This was a btrfs-level fault on that path, not a file-level one: every file
outside it read normally, and `cp -a` of the tree produced 14,095 files that
were all readable elsewhere.

Recovery: copied the tree to `/home/santi/LinguaLab`, which passed 12/12
consecutive read probes and a full-integrity check, and `git fsck` clean.
Both commits and all uncommitted work were preserved. The work continued there.

Note for the maintainer: the repository now lives at `/home/santi/LinguaLab`.
The untouched original site is at `/home/santi/Documentos/LinguaLab`, and the
problematic directory still exists and should be removed once its contents are
confirmed redundant.

## WU-3 — FonoLab (complete)

The IPA chart, the articulatory diagram, licensed audio and the transcriber.

### Articulatory model (`src/data/articulation.ts`)

Maps a symbol to a drawable state of the vocal tract: tongue shape, up to two
constriction points, lip shape, velum position and glottis state. 29 tests
assert that all 108 symbols resolve, that every tongue shape has a path, that
markers stay inside the drawing area, and that constrictions run front-to-back
in the right order (bilabial < alveolar < velar < glottal).

Vowels are generated from height and backness; consonants use authored tongue
shapes, because a single hump cannot express an independent tongue tip.

Two bugs the tests caught:
- `"sin redondeo"` (unrounded) CONTAINS `"redondeo"`, so a naive substring test
  marked every unrounded vowel as rounded. Matching on `"redondead"` fixes it.
- Vowels use Front/Central/Back on a separate axis from consonant places, so
  the two are validated separately rather than through one table.

### Mid-sagittal diagram (`src/components/VocalTract.astro`)

Face points left. Static anatomy plus a dynamic layer. All 23 tongue shapes are
rendered once and the active one is marked, so switching phoneme is a few
attribute writes rather than a re-parse.

Verified by rasterising the diagram for 23 phonemes and inspecting the result.
The first attempt was wrong — the tongue spilled below the jaw, the teeth and
lips floated detached, the palate labels collided, and the airstream never
appeared because no initial route was marked active. All four were fixed.

### Audio

35 real recordings fetched from Wikimedia Commons, all CC BY-SA 3.0, committed
so the build stays offline. `scripts/fetch-ipa-audio.mjs`:

- batches the licence lookup into ONE API request (one request per file tripped
  the rate limit almost immediately), with backoff and a metadata cache so
  re-runs need no network at all
- normalises to mono Ogg Vorbis via ffmpeg: 1.1 MB of WAV became 456 KB
- refuses any licence outside CC0 / CC BY / CC BY-SA / public domain
- writes the attribution table, and says "not stated on Commons" rather than
  inventing an author

Playback has two tiers and always reports which was used. Speech synthesis
cannot pronounce an IPA glyph — handing it "θ" makes it say "theta" — so the
fallback speaks a carrier word instead (`src/data/ipa-carriers.ts`).

`pickVoice` had a real bug: scoring language match and voice quality together
let a `localService` bonus qualify an unrelated language, so a French voice
could be chosen for Spanish. Language is now a hard gate.

The build verifier now also fails if a manifest entry has no shipped file, or
if a file ships with no attribution row. Both were confirmed against
deliberate regressions.

### Defects fixed in the transcriber

- Spanish orthographic `v` had no rule, so `llave` came out as `/ʎave/` with a
  segment Spanish does not have. `v` now merges into `/b/`.
- English `a` in a closed syllable was unhandled, so `cat` was `/kat/`. It is
  now `/kæt/`.
- Two dead rules removed, and the rule tables no longer share `/g/` regex
  state between calls.

Known limitations are pinned by tests rather than left implicit: English short
`i` and magic-e lengthening are not modelled, and Spanish `d` is always a stop.

### Note for ArborLab

Astro renders scoped-style markers as VALUELESS attributes
(`data-astro-cid-xxx`), which is valid HTML but invalid XML. The FonoLab page
carries 88 of them. Any SVG that ArborLab offers for download must strip these,
or the exported file will not open in Illustrator, Inkscape or rsvg.

## WU-4 — ArborLab (complete)

The tree workbench: 23 tree types, four input formats, six export formats.

### Modules

| Module | What it owns |
|---|---|
| `parse.ts` | brackets/Penn, dependency/CoNLL-U, indented outline, sentence heuristic |
| `layout.ts` | Reingold–Tilford placement, forest support, metrics |
| `render.ts` | label notation, node boxes, elbow connectors, movement arrows |
| `checks.ts` | dependency, constituency and movement validation |
| `solvers.ts` | BST, AVL, red-black, heap, trie, expression, Huffman |
| `export.ts` | SVG, PNG, JSON, Newick, CoNLL-U, Brat |
| `pipeline.ts` | one entry point that picks the parser per tree type |

The layout returns a separate `LayoutNode` graph instead of mutating the tree
with `_`-prefixed fields, so a tree can be laid out repeatedly without stale
coordinates and the renderer never reads underscore fields.

### Bugs found and fixed

- **Infinite loop on a mismatched bracket.** `[S (x)]` hung forever: the
  loose-text reader stopped on the bracket without consuming it, so the parse
  loop never advanced. Present in the legacy code too. Now a positioned
  `ParseError`. A hang is far worse than an error.
- **The `_i` index notation was destroyed.** `leaf()` replaced every
  underscore with a space, so `el_i` became the two words "el i" — even though
  `_i` is the documented index marker. A trailing `_x` or `_{x}` is now kept
  for the renderer, while a longer run like `_city` is still a word separator.
- **X-bar projection check never fired.** `/^([A-Z]+)P?$/` is greedy, so `NP`
  yielded the category "NP" and every projection matched its own label. The
  category is now the label minus its trailing P or prime.
- **The projection check then over-corrected**, flagging a bare `N` as its own
  missing head. Only labels ending in P or a prime are projections now.
- **`badProjections` searched `JSON.stringify(subtree)`** for the category
  name, so a word containing those letters satisfied the check by accident. It
  walks real labels now.
- **Movement c-command was backwards.** The original asked whether the landing
  site sits inside the trace, which is never true for real movement. It now
  asks whether the trace is dominated by the landing site's parent.
- **`DP^` (triangle) and `X^max` (superscript) were conflated.** Every
  non-braced caret was treated as a triangle, silently eating the bare
  superscript form. Only a trailing caret marks a triangle.
- **Two red-black tree bugs** in the solvers (found by the delegated port): the
  build returned the logger object instead of its lines, and the LR/RL cases
  omitted the outer rotation, leaving the tree structurally broken.
- **A `[NP [N (x)]]` input used to hang** for the same reason as the first bug.

### Verified visually

The tree SVG is built at runtime, so it cannot be extracted from `dist`. It was
rendered through a minimal DOM shim and rasterised, then inspected across eight
cases: constituency, X-bar, movement with an arrow, the full notation, boxes and
triangles, dependency, outline and a deep chain. All eight draw correctly.

### XML validity

`svgString()` resolves every CSS custom property to a concrete value and
`renderTree` gives every attribute a value, so the exported file is valid XML
that opens in Illustrator, Inkscape and rsvg. This is the issue first seen in
WU-3, where Astro's valueless `data-astro-cid-*` attributes made an
Astro-rendered SVG unreadable to XML tools. The ArborLab drawing is built at
runtime, so it never carries those attributes.

### Build verifier

The payload budget now charges each page only for what it loads. Counting every
file in `dist/assets` as shared made the figure grow with the site rather than
with the page. ArborLab is 31.3 KB gz including its own scripts.
