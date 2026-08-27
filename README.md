# Democratic Power Index

A source-first dashboard for measuring which organised factions are gaining power inside the Democratic coalition.

The phrase “party civil war” is treated as a research question, not a literal description. The project separates five kinds of power:

1. **Institutional:** membership, leadership offices and committee ranking members.
2. **Electoral:** candidate pipelines, endorsements and documented primary traction.
3. **Money:** FEC receipts, donor mix, direct candidate support and independent spending.
4. **Agenda:** current platforms, policy output and documented conversion into law.
5. **Momentum:** a transparent, inspectable event log.

It also keeps broad-wing primary results separate from formal congressional caucuses. A candidate may be progressive, anti-establishment, labor-populist or institutionally backed without yet being a member of a House caucus.

## Current dataset

- 3 formal ideological caucuses
- 22 populated index measures
- 12 recent and current high-salience primary or special-election records
- 6 candidate-finance comparison cases
- 6 public-opinion indicators
- 88-measure research coverage map
- 57 linked sources
- 1 dated baseline snapshot, with weekly snapshots appended going forward

The editorial snapshot is current through 28 August 2026. FEC PAC totals refresh weekly through GitHub Actions; every run appends or replaces that day’s raw metric snapshot without advancing the editorial review date. The interface shows each feed’s freshness and recalculates historical scores from measures shared across every displayed date.

## Run locally

Open `index.html` directly, or run any static file server. The JavaScript deliberately uses classic scripts rather than module imports so the dashboard still works from a `file://` URL.

No dependency installation is required. To regenerate and validate the embedded snapshot:

```sh
npm test
```

To refresh the three affiliated PAC summaries from OpenFEC:

```sh
npm run refresh:fec
npm test
```

`FEC_API_KEY` is optional locally; the script falls back to the public `DEMO_KEY` with its lower rate limit.

## Scoring model

For each included, cross-faction-complete measure, the highest observed faction receives 100 and the lowest receives 0 using min–max normalisation. A tie receives 50. Measures are averaged inside domains, then combined using the visible user weights.

This makes the score easy to inspect, but it has important limits:

- It ranks factions within one snapshot; it is not an absolute power scale.
- Caucus memberships overlap. The totals must not be added together.
- A nomination win is not a general-election win.
- Unitemized FEC receipts are a reporting category, not a unique small-donor count.
- PAC finance does not include every allied organisation or every form of outside spending.
- Incomplete measures remain visible but cannot enter the score.
- Broad-wing candidate momentum is not formal caucus power, so it remains outside the default score.
- Historical comparisons use only active measures available for every recorded date.

The dashboard stores custom weights and enabled measures in the viewer’s browser only.

## Data layout

- `data/power-data.json` — hand-reviewable source of truth, including append-only dated metric snapshots
- `src/data.js` — generated browser snapshot
- `scripts/build-data.mjs` — deterministic JSON-to-JavaScript build
- `scripts/validate-data.mjs` — IDs, references, caveats and URL checks
- `scripts/refresh-fec.mjs` — OpenFEC committee-total refresh

Every populated metric includes an `asOf` date, source IDs and a caveat. Candidate alignment records also state the basis for the label when available.

The FEC updater records a minimum shared reporting date plus per-faction coverage dates. It updates `generatedOn`, not `editorialAsOf`, and stores the refreshed raw values in `history` so future changes remain visible in the dashboard rather than only in Git history.

## Attribution rules

- Use official caucus membership rather than assigning ideology to every member.
- Preserve multiple faction labels and overlap.
- Distinguish `direct`, `incorporated` and `claimed` legislative wins.
- Prefer certified state results and government finance data.
- Label editorial coding and missing denominators.
- Do not convert “none tracked” into “none happened.”

## Licence

Code is released under the MIT License. Source publishers retain rights in their underlying material and data.
