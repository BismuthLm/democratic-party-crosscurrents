# Democratic Faction Research Workbench

An evidence-first research console for studying which organizations, networks, strategies, and ideological tendencies are gaining power inside the Democratic coalition.

The workbench does **not** force people into one mutually exclusive faction and does not declare a headline winner. It separates:

1. observed organization relationships, such as caucus membership, endorsement, party-program support, spending, and leadership;
2. transparent, multi-label analytical camps derived only from reviewed evidence; and
3. continuous measurements of institutions, elections, networks, money, recruitment, and eventually roll-call behavior.

The production site remains at <https://bismuthlm.github.io/democratic-party-crosscurrents/>. Workbench v3 is developed on `codex/research-workbench` and must not replace production until the acceptance gaps below are closed.

## Research coverage

- Official FEC House and Senate compilations for 2018, 2020, and 2022: **3,640 Democratic source rows** reconcile at 100%, producing 3,427 canonical candidacies and 3,511 candidate-stage result facts. The difference is explicit: 185 `Scattered` write-in aggregates do not create fictitious people, while duplicate ballot lines and 27 overlapping special-election observations retain lineage without double-counting canonical results.
- Regular primary dates come from each workbook's official primary-date sheet. Special-election dates come from row footnotes with conservative block propagation; 11 still-undated contests remain review-required.
- FEC `W`, `*`, `#`, and `W#` values are preserved as advancement, party-selection, or footnote-review signals. They never become nomination wins without a reviewed contest-system rule.
- 2024: explicitly marked `pending_fec_publication` because the [FEC election-results archive](https://www.fec.gov/introduction-campaign-finance/election-results-and-voting-information/) has not yet published a comparable complete congressional results workbook.
- 2026: explicitly partial state coverage and excluded from national rate denominators.
- Five overlapping analytical camps: movement-left network, CPC-aligned, national party network, New Dem-aligned, and Blue Dog-aligned.
- Temporal starter relationships and regression fixtures for Sarah McBride, Adam Gray, Alexandria Ocasio-Cortez, Derek Tran, and Kirsten Engel. This is not yet the complete historical caucus/endorsement universe.
- All 57 sources, 22 measures, 12 race records, 6 finance cases, 6 opinion indicators, 13 events, and the v2.1 baseline are preserved in the v3 migration archive.

## Interface

The React research console includes:

- a faction-by-domain evidence matrix with raw inputs, denominators, intervals, coverage, and freshness;
- linked camp comparisons;
- virtualized people, relationship, and election tables;
- a reviewed organization network;
- election-universe coverage grids and filtered CSV/JSONL exports;
- money and institutional modules;
- a secondary `balanced-core-v1` Model Lab with fixed provisional anchors, Jeffreys 80%/95% rate intervals, coverage gates, leave-one-out tests, URL-shareable weight sensitivity, and attribution sensitivity;
- source-to-claim reverse lookup, release hashes, and data-quality warnings; and
- a device-local Dexie workspace for saved views, watchlists, notes, source bookmarks, sessions, and evidence-backed camp overlays. Workspace state can be exported and imported as `democratic-research-workspace.v1.json` without cloud sync.

## Public data interfaces

Every build generates immutable, hash-listed release artifacts under the GitHub Pages project path:

- `data/v3/latest.json`
- `data/v3/releases/{releaseId}/manifest.json`
- `data/v3/releases/{releaseId}/{domain}/{partition}.json`
- `downloads/{releaseId}/democratic-factions.sqlite`
- `downloads/{releaseId}/core-csv.zip`

The manifest is the partition registry. Consumers should resolve the current release through `latest.json` instead of guessing filenames.

## Local development

Requirements: Node.js 22 or newer, `unzip`, and `zip`.

```sh
npm ci
npm run dev
```

The configured project-site base is `/democratic-party-crosscurrents/`.

## Reproducible build and validation

```sh
npm test
```

That command:

1. verifies the SHA-256 of each raw FEC workbook;
2. rebuilds normalized entities, temporal facts, evidence, metrics, the Model Lab release, static JSON partitions, SQLite, and zipped CSV;
3. checks every manifest byte count and hash;
4. checks stable IDs, identity-conflict separation, foreign keys, evidence links, temporal intervals, null-versus-zero handling, source-row/canonical-result reconciliation, and immutable release fingerprints;
5. runs taxonomy, URL-state, workspace-envelope, and model-formula regression fixtures;
6. runs SQLite integrity and foreign-key checks plus ZIP integrity; and
7. type-checks and builds the Vite production client into `dist`.

The official source workbooks are retained under `data/v3/raw/fec/`. The original monolithic schema remains at `data/power-data.json` and is copied to `data/v3/archive/power-data-v2.1.json` for audit.

## Evidence rules

- **A/direct:** official roster, announcement, filing, government result, or first-person statement; weight 1.0.
- **B/corroborated:** historical official artifact or two independent established sources; weight 0.8.
- **C/derived:** deterministic camp result from reviewed A/B evidence; inherits the weakest trigger.
- **D/disputed or stale:** visible for research, weight 0, and excluded from published comparisons.

Endorsement never becomes membership. Media adjectives, donation patterns, demographics, and district type never establish camp identity. Democratic-caucusing independents retain their actual party.

## Model limits

`balanced-core-v1` is a documented lens, not the product’s default conclusion. It weights institutional power 25%, electoral performance 25%, networks and endorsements 20%, money 15%, and recruitment 15%. A domain needs 70% of configured measure weight; the overall score requires all five domains.

Current formal-caucus-aligned aggregates can satisfy that mathematical gate. Movement-left and national-party-network records remain visible but report insufficient coverage where complete institutional or finance inputs do not yet exist. Policy, opinion, media, source coverage, freshness, and editorial event points are unscored.

The current `fixed-anchor-provisional-v1` anchors are versioned and do not rescale against whichever camps are visible, but they are not yet the complete empirical 2018–present reference distribution required for production acceptance. Model results are therefore labelled provisional.

Voteview-derived roll-call dimensions are staged but not redistributed in this release while longitudinal joins and redistribution terms are reviewed. AP Elections, Cook PVI, Roper, contributor addresses, and other licensed or sensitive datasets are excluded.

## Production acceptance hold

Do not merge this branch to `main` until all of the following are true:

- complete official 2024 federal Democratic primary coverage has been reconstructed from redistributable government sources;
- historical/current caucus rosters, endorsements, party programs, office roles, finance, outside spending, and recruitment records meet the planned federal coverage gate;
- contest-system rules turn advancement/selection signals into reviewed nomination outcomes without top-two, runoff, convention, or withdrawal errors;
- the longitudinal reference distribution and Voteview joins are complete and reproducible; and
- the root, manifest, partitions, downloads, metadata, and social card pass direct production verification.

## Licence

Code is MIT licensed. Official public-data citations and source-level reuse notes are preserved. Source publishers retain rights in linked underlying material.
