# Grid Engine Spike Assets

This directory holds the migration artifacts for the spreadsheet-engine feasibility spike.

## Current Non-Default Spike Path

- Default runtime remains Handsontable.
- The repo is still not dual-engine ready.
- A first production runtime adapter seam now exists, but RevoGrid runtime support is bounded to one bundled template path:
  - `canada_covid19/CanCOGeNCovid19`
- A local spike can request a candidate engine with the undocumented query param:
  - `?gridEngine=tabulator`
  - `?gridEngine=revogrid`
- The application records:
  - `data-grid-engine-requested`
  - `data-grid-engine-active`
  - `data-grid-engine-implemented`
  on the root HTML element and falls back to Handsontable for unsupported engine/template combinations.

## Quick Experiment Paths

- `yarn experiment:tabular`
  - Starts the app with `validTestData_2-1-2.csv` preloaded into the standard runtime.
- `yarn experiment:validation`
  - Starts the app with `invalidTestData_1-0-0.csv` preloaded and validation already run.
- `yarn experiment:tabulator`
  - Starts the dev server for the undocumented Tabulator spike harness.
- `yarn experiment:revogrid`
  - Starts the dev server for the RevoGrid spike harness.

The launcher prints the exact local URL to open. You can also drive the same flows directly with query params:

- Full app with bundled example input:
  - `/?template=canada_covid19%2FCanCOGeN_Covid-19&exampleInput=validTestData_2-1-2.csv`
- Full app with bundled invalid CSV and auto-validation:
  - `/?template=canada_covid19%2FCanCOGeN_Covid-19&exampleInput=invalidTestData_1-0-0.csv&validate=1`
- Candidate spike harnesses:
  - `/?template=canada_covid19%2FCanCOGeN_Covid-19&gridEngine=tabulator&gridSpike=1`
  - `/?template=canada_covid19%2FCanCOGeN_Covid-19&gridEngine=revogrid&gridSpike=1`

The `exampleInput` query param resolves files from `/templates/<schema>/exampleInput/` and supports `csv`, `tsv`, `xls`, `xlsx`, and `json`.

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
- `adapter-contract.md` documents the runtime-v1 contract and explicit omissions for the bounded adapter path.
