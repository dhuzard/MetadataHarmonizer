# Grid Engine Spike Assets

This directory holds the migration artifacts for the spreadsheet-engine feasibility spike.

## Current Non-Default Spike Path

- Default runtime remains Handsontable.
- The repo is not dual-engine ready at this stage. It only has engine-selection plumbing plus a fallback to the current Handsontable runtime.
- A local spike can request a candidate engine with the undocumented query param:
  - `?gridEngine=tabulator`
  - `?gridEngine=revogrid`
- Until a candidate adapter exists, the application records:
  - `data-grid-engine-requested`
  - `data-grid-engine-active`
  - `data-grid-engine-implemented`
  on the root HTML element and falls back to Handsontable.

## Audit

- `hot-surface-audit.md` and `hot-surface-audit.json` are generated snapshots of the repo's direct `.hot` reach-throughs.
- Regenerate them with:

```sh
node script/audit-grid-usage.mjs
```

## Spike Fixtures

- Single-table fixture: `canada_covid19`
- 1:m fixture: `grdi_1m`

If later audit evidence shows `grdi_1m` no longer exercises dependent tabs meaningfully, replace it with the first still-valid dependent-table template and record that substitution in the ADR before proceeding.

## Spike Outputs

- `grid-engine-scorecard.md` records the 8 hard-behavior verdicts for Tabulator and RevoGrid.
- `spike-findings.md` summarizes the go/no-go decision and the recommended next migration step.
