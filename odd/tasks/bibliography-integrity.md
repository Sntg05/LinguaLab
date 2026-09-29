# Bibliography integrity

Add a computational linguistics reading list, and repair the records that were
already there. The repair turned out to be the larger and more important half.

## Context

`src/data/bibliography.ts` held 12 records, ported verbatim from the legacy
site. Two checks guarded them: a `license` must be non-empty, and a record must
declare a `file` or a `url`. Neither check asks whether the work exists or
whether the link resolves.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Broken links | Find and verify replacements | Requested. Where nothing real exists, the record is replaced rather than left dangling. |
| Wrong attributions | Trust the DOI | A DOI identifies a work. If the registered author differs from what was typed, the typing is wrong. |
| Missing `file` targets | Set to `null` | The PDFs were never in `public/`. A link to nothing is worse than no link: the UI already renders "Sin enlace público". |
| Fabricated records | Replace with real works on the same topic | Requested. Keeps the topic filters (Corpus, Métodos, Fonética) with their coverage intact. |
| Licence vocabulary | Reuse `Consulta` | Already the convention for non-open resources in five existing records. No new value invented. |

## Method

No web search was available in this environment, so verification used three
routes that each answer a different question:

1. **Liveness** — every URL fetched, following redirects, classified as
   reachable, dead (404/410), or refused (401/402/403/429/503). A refusal is
   reported separately because bot protection is not evidence of death.
2. **Identity** — every DOI resolved through the Crossref API, which returns
   the registered title, publisher, year and authors. These were compared
   against what had been typed, so a DOI belonging to a different work shows up
   as a mismatch instead of hiding behind a redirect. `10.48550/...` is minted by
   **DataCite**, not Crossref, so those were resolved through DataCite — the
   first pass wrongly reported the arXiv DOIs as unregistered.
3. **Existence** — works with no DOI were searched in Crossref by title and
   author, then in OpenLibrary. A work with no trace in either, whose domain or
   journal path does not resolve, is not a work.

## Defects found

**Four records cited works that do not exist.**

| Record | Evidence |
|---|---|
| `corpus-statistics` — Szpakowicz, 2019 | No OpenLibrary trace, no Crossref match for the author, and its DOI belongs to *Switch Reference 2.0* |
| `zipf` — Tuldavilla, 2018 | No trace anywhere; the domain does not resolve |
| `readability` — Gutiérrez Ordóñez, 2016 | No trace; the domain does not resolve |
| `bilabial-glottal` — Martínez del Río, 2021 | No trace; the journal path `rev_CMYL` does not exist on `revistas.ucm.es` (404) |

The author names belong to real linguists; the works do not. Each is replaced
with a real, verified work: Gries (2021, 87 citations), Piantadosi (2014, 561),
Barrio Cantalejo & Simón Lorda (2003, 21) and Davidson (2021).

**Two DOIs pointed at unrelated works.** `es-phonology` resolved to a book on
building construction; `corpus-statistics` to *Switch Reference 2.0*. The first
now carries `10.1017/cbo9780511719943`, the registered DOI for *Los sonidos del
español*.

**Three records offered a PDF that was never added.** `ipa-handbook.pdf`,
`zipf-diversidad.pdf` and `tesniere-1959.pdf` were referenced but absent from
`public/`, so all three download links 404ed in production. The old assertion
passed for any non-empty string. A test now fails the build when a declared file
is not on disk.

**Five urls were dead**, two of them entire domains (`rla.junin.edu.ar`,
`revistasinvestigacion.filo.unam.mx`). Replaced where something real exists,
otherwise the record was replaced as above.

## Evidence

| Check | Result |
|---|---|
| Records | 12 → 54, ids unique |
| `astro check` | 0 errors, 0 warnings, 0 hints |
| `vitest run` | 537 passing (536 before, plus the new file assertion) |
| `verify:build` | passed, worst page 28.5 KB gz |
| Links fetched | 54, of which **0 dead**, 44 reachable, 9 refused to an automated client, 1 transient DOI timeout that resolved 200 on retry |
| DOIs verified | all, against Crossref or DataCite; 0 mismatches after correcting the checker |
| Production, both targets | Vercel and GitHub Pages render 54 records, 54 links, 0 download links |

## Corrections made to this session's own claims

- The arXiv DOIs (`10.48550/...`) were reported as unregistered. They are valid;
  DataCite mints them and the check used Crossref only.
- `espinosa2017estadistica` was reported as pointing at the wrong page. The
  entire `digitk.areandina.edu.co` domain serves a bot-detection page to
  automated clients. Inconclusive, not broken. Same for the three
  `mitpress.mit.edu` links.
- A `barrio2003-legibilidad` DOI mismatch was reported. The checker compared the
  English title against a Spanish registered title; the Spanish title matches
  exactly.
- Two runs of the edit script produced a file that did not parse: `trim()` ate
  the indent of the opening brace and the last record lacked a comma. Both were
  caught by `astro check` before committing, and the script now asserts the
  file's structure.

## Known limitations

- `pierdant2006-elementos-basica` and `pena1997-estadistica-sociales` link to an
  **OpenLibrary search** rather than a work page, because neither has a
  resolvable publisher page. A search page allows exploration but is a weaker
  citation than a stable identifier; both would be better with a `worldcat.org`
  or a specific OpenLibrary work id.
- Nine links refuse automated clients. They are presumed alive because the
  refusals are Cloudflare or `Access Denied` pages, but no browser test was run.
- The `Consulta` licence covers both paywalled works and freely readable but
  copyright works. The field does not distinguish them, so a reader cannot tell
  from the catalogue alone which links will ask for a subscription.
