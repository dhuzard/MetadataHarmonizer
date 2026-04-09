# Grid Migration Status Report

## 1. Executive summary
- Current migration phase: groundwork and decision-gating, not adapter implementation. The repository contains engine-selection plumbing, a frozen Handsontable surface audit, spike harnesses, ADRs, scorecards, and CI guarding, but no production dual-engine runtime.
- The repo is still Handsontable-first. `lib/utils/gridEngine.js` marks only `handsontable` as implemented, `lib/AppContext.js` resolves any unimplemented request back to Handsontable, and `lib/DataHarmonizer.js` still imports and instantiates `Handsontable` directly.
- There is no real runtime adapter implementation yet. The closest thing to an adapter is documentation-only scope definition in `docs/grid-engine/adapter-contract.md` and the matching audit generator inputs in `script/grid-engine-audit-config.mjs`.
- Engine decision: yes, in repository evidence. The documented spike verdict is `Tabulator = no-go`, `RevoGrid = go`, and the passing Playwright spike test currently asserts that same verdict. This is a candidate decision, not a shipped runtime switch.

## 2. Verified current artifacts

| File path | Purpose | Status |
| --- | --- | --- |
| `docs/adr/0001-grid-engine-feasibility-spike.md` | Accepted ADR that defines the feasibility gate, 8 critical behaviors, candidate order, and consequence that Handsontable remains default until parity work exists. | documentation-only |
| `docs/grid-engine/README.md` | Index for the migration artifacts, experiment routes, audit outputs, fixture note, and explicit statement that the repo is not dual-engine ready. | documentation-only |
| `docs/grid-engine/grid-engine-scorecard.md` | Records the behavior-by-behavior spike verdicts for Tabulator 6.4.0 and RevoGrid 4.21.3. | documentation-only |
| `docs/grid-engine/spike-findings.md` | Summarizes what the spike tested, why Tabulator failed, why RevoGrid passed, and that the repo should remain in selection-plumbing mode. | documentation-only |
| `docs/grid-engine/adapter-contract.md` | Documents the intended minimal audited contract; explicitly says there is not yet a production candidate adapter. | documentation-only |
| `docs/grid-engine/baseline-debt.md` | Freezes known non-migration lint and Jest failures to separate baseline debt from migration attribution. | documentation-only |
| `docs/grid-engine/hot-surface-audit.md` | Generated Markdown snapshot of current direct `.hot` reach-through usage and contract inputs. | documentation-only |
| `docs/grid-engine/hot-surface-audit.json` | Generated machine-readable baseline used by the `.hot` guard. Current summary: 79 callsites, 28 methods, 4 buckets, 24 exporter `getTrimmedData()` callsites. | active |
| `script/audit-grid-usage.mjs` | Regenerates the Handsontable surface audit artifacts under `docs/grid-engine/`. | active |
| `script/check-grid-usage.mjs` | CI guard that fails on any new raw `.hot` callsite outside the frozen baseline. | active |
| `script/grid-engine-audit-lib.mjs` | Shared audit helpers that scan repo sources for `.hot` reach-throughs and exporter reads. | active |
| `script/grid-engine-audit-config.mjs` | Defines `.hot` method buckets and the documentation-only minimal adapter contract inputs used by the audit generator. | active |
| `lib/utils/gridEngine.js` | Canonical engine constants and resolution logic; only Handsontable is currently in `IMPLEMENTED_GRID_ENGINES`. | active |
| `lib/AppContext.js` | Resolves requested vs active engine, writes HTML root metadata, and passes engine state into each `DataHarmonizer`. | active |
| `web/index.js` | Renders the selection-only warning banner and exposes runtime engine state for tests/manual inspection. | active |
| `lib/DataHarmonizer.js` | Current shipped grid runtime; wraps and directly uses Handsontable throughout, with many remaining `.hot` reach-throughs. | active |
| `lib/editors/FlatpickrEditor.js` | Handsontable-specific custom editor that still reaches through `this.hot` DOM/runtime internals. | active |
| `lib/editors/KeyValueEditor.js` | Handsontable-specific custom editor/renderer coupling by inheritance from Handsontable editor classes. | active |
| `lib/utils/1m.js` | One-to-many coordination logic with remaining direct `dh.hot` hook/state usage. | active |
| `web/spikes/grid-engine/index.js` | Non-default spike loader gated behind `gridSpike=1`; mounts Tabulator or RevoGrid harnesses only for review paths. | transitional |
| `web/spikes/grid-engine/shared.js` | Shared spike fixtures, hard-behavior metadata, scorecard rendering, and final verdict emission to `window.__GRID_ENGINE_SPIKE__`. | transitional |
| `web/spikes/grid-engine/tabulatorSpike.js` | Tabulator-only feasibility harness; not wired into the default runtime. | transitional |
| `web/spikes/grid-engine/revoGridSpike.js` | RevoGrid-only feasibility harness; not wired into the default runtime. | transitional |
| `script/dev-experiment.mjs` | Convenience launcher for the normal runtime and the two candidate spike harnesses. | transitional |
| `tests/gridEngine.test.js` | Unit tests for engine normalization/resolution plumbing. | active |
| `tests/e2e/grid-engine-smoke.spec.js` | Verifies app boot, engine metadata, and that unimplemented engines fall back to Handsontable. | active |
| `tests/e2e/grid-engine-spike.spec.js` | Verifies the current spike verdicts reported by the candidate harnesses. | active |
| `playwright.config.js` | E2E configuration; noteworthy because `webServer.command` currently depends on `npx`. | active |
| `.github/workflows/main.yaml` | CI workflow that runs `guard:grid`, formatting/lint, builds, Jest, and Playwright. | active |
| `README.md` | Top-level repo statement that Handsontable is still the active shipped runtime and RevoGrid is the current preferred migration target. | documentation-only |

## 3. Current code state
- Engine selection is resolved in `lib/AppContext.js` by `resolveGridEngine(options.gridEngine ?? getGridEngineInScope())`, using the constants in `lib/utils/gridEngine.js`.
- The default runtime is still Handsontable. Evidence:
  - `lib/utils/gridEngine.js` sets `DEFAULT_GRID_ENGINE = 'handsontable'`.
  - `IMPLEMENTED_GRID_ENGINES` contains only `handsontable`.
  - `resolveGridEngine()` keeps the requested engine for metadata but falls back `active` to Handsontable when the request is not implemented.
  - `lib/DataHarmonizer.js` imports `handsontable` and still constructs the grid through `new Handsontable(...)`.
- Tabulator code remains only as spike code in `web/spikes/grid-engine/tabulatorSpike.js`. It is mounted only by `web/spikes/grid-engine/index.js` when `gridSpike=1` and `gridEngine=tabulator`; it is not part of the default runtime.
- RevoGrid code remains only as spike code in `web/spikes/grid-engine/revoGridSpike.js`. It is mounted only by the same non-default spike path and is not part of the shipped runtime.
- An adapter contract exists only as documentation and audit metadata:
  - `docs/grid-engine/adapter-contract.md`
  - `script/grid-engine-audit-config.mjs` (`GRID_ADAPTER_CONTRACT`)
- No real adapter implementation exists in runtime code. This is a fact from negative evidence: there is no adapter class/module in `lib/` or `web/`, and `lib/DataHarmonizer.js` still calls Handsontable APIs directly instead of delegating through a runtime abstraction.
- Raw `.hot` access is still allowed only within the frozen audited baseline. Current audit summary from `docs/grid-engine/hot-surface-audit.json`:
  - 79 direct `.hot` callsites
  - confined to `lib/DataHarmonizer.js`, `lib/editors/FlatpickrEditor.js`, and `lib/utils/1m.js`
- Handsontable coupling remains broader than raw `.hot` alone:
  - `lib/editors/KeyValueEditor.js` inherits from Handsontable editor classes
  - `lib/DataHarmonizer.js` registers Handsontable cell types and renderers
  - `lib/AppContext.js` and surrounding UI still construct `DataHarmonizer` directly around that runtime
- The guard that prevents new raw `.hot` usage is `script/check-grid-usage.mjs`, which compares the current scan to `docs/grid-engine/hot-surface-audit.json`. CI enforces it through `.github/workflows/main.yaml` with `yarn guard:grid`.
- Repo state is explicitly not dual-engine ready. This is a documented fact in `docs/grid-engine/README.md` and also an inference supported by code because only one runtime is marked implemented.

## 4. Current tested verdict
- Tabulator failed the spike gate for two documented hard behaviors:
  - spreadsheet paste
  - hidden rows / hidden columns plus dependent filtering
- The repo’s documented reason is not cosmetic incompatibility; `docs/grid-engine/spike-findings.md` and `docs/grid-engine/grid-engine-scorecard.md` both state that Tabulator would require brittle Handsontable-style emulation in exactly the risk clusters the spike was intended to de-risk.
- RevoGrid passed all 8 documented hard behaviors in the spike. The scorecard records bounded DH-owned workarounds for editors, validation class replay, and source-driven row CRUD, while the hardest behaviors map to RevoGrid features such as grouped columns, range paste, and `trimmedRows`.
- What the spike proved:
  - engine-selection plumbing works for non-default experimentation
  - the candidate harnesses can produce stable go/no-go verdicts
  - Tabulator is rejected for the audited behavior surface
  - RevoGrid is the selected candidate for the next migration phase
- What the spike did not prove:
  - no production adapter exists
  - no dual-engine runtime exists
  - no default-runtime RevoGrid path exists
  - no bundled-template dependent-table parity was proven; the repo documents that `grdi_1m` is on disk but not currently loadable through the bundled template menu, so dependent-table behavior evidence came from the isolated spike fixture instead
- Important remaining gaps directly supported by repo evidence:
  - 79 audited `.hot` callsites still exist in active code
  - Handsontable-specific custom editors and cell-type registration still own the shipped runtime
  - the documented adapter contract is not implemented in code

## 5. Verification results

| Scope | Exact command run | Result | Attribution |
| --- | --- | --- | --- |
| `.hot` guard | `node script/check-grid-usage.mjs` | Pass | Migration-specific guard passed: `79` direct callsites remain within the frozen baseline. |
| `build:lib` | `yarn build:lib` | Fail | Environment/toolchain issue in this shell: `yarn` is not installed on `PATH`. |
| `build:lib` equivalent | `./node_modules/.bin/rimraf lib/dist && ./node_modules/.bin/rollup --config lib/rollup.config.js` | Fail / inconclusive | Did not terminate within `120s` when bounded with `timeout`; exit code `124`. It emitted Rollup warnings but no successful completion. This is not clearly migration-related from current evidence. |
| `build:web` | `yarn build:web` | Fail | Environment/toolchain issue in this shell: `yarn` is not installed on `PATH`. |
| `build:web` equivalent | `./node_modules/.bin/rimraf web/dist && ./node_modules/.bin/webpack --mode=production --config web/webpack.config.js && ./node_modules/.bin/rimraf web/dist/dist-schemas web/dist/templates && ./node_modules/.bin/webpack --config web/webpack.schemas.js` | Fail | First production webpack step was killed with exit `137`. Evidence is insufficient to label this migration-specific; likely environment/resource-related until reproduced elsewhere. |
| E2E smoke, first attempt | `./node_modules/.bin/playwright test tests/e2e/grid-engine-smoke.spec.js` | Fail | Tooling/config issue: Playwright tried to use `playwright.config.js` `webServer.command`, which calls `npx`, and this shell has no `npx`. |
| E2E spike, first attempt | `./node_modules/.bin/playwright test tests/e2e/grid-engine-spike.spec.js` | Fail | Same `npx`-missing tooling issue as above. |
| Manual dev server for E2E reuse | `./node_modules/.bin/webpack serve --mode=development --config web/webpack.config.js --port 4173 --host 127.0.0.1` | Pass | Dev server compiled successfully and was reused for Playwright verification. |
| E2E smoke, with reused server | `./node_modules/.bin/playwright test tests/e2e/grid-engine-smoke.spec.js --config playwright.config.js` | Pass | Migration-relevant Playwright smoke coverage passed: Handsontable boot path and fallback metadata behave as expected. |
| E2E spike, with reused server | `./node_modules/.bin/playwright test tests/e2e/grid-engine-spike.spec.js --config playwright.config.js` | Pass | Migration-relevant Playwright spike coverage passed: Tabulator remains `no-go`, RevoGrid remains `go`. |
| `lint` | `./node_modules/.bin/prettier --check . && ./node_modules/.bin/eslint .` | Fail | Failed in Prettier before ESLint. Current formatting issues included `web/spikes/grid-engine/shared.js`, `web/spikes/grid-engine/tabulatorSpike.js`, `docs/preclinical-hcmo-sample.json`, and `docs/inputs/hcmo.json`. This does not match the older ESLint-only baseline note in `docs/grid-engine/baseline-debt.md`, so treat current lint state as broader than the documented baseline. |
| `test` | `./node_modules/.bin/jest tests/` | Fail | Mostly baseline debt, consistent with `docs/grid-engine/baseline-debt.md`: `tests/templates.test.js` failed on missing `schemas` resolution; `tests/fields.test.js` and `tests/Validator.test.js` failed on expectation mismatches. `tests/gridEngine.test.js` passed. |

## 6. Migration blockers and open questions

### Proven blockers
- The shipped runtime is still Handsontable-only: `IMPLEMENTED_GRID_ENGINES` contains only `handsontable`, and unimplemented requests fall back to Handsontable.
- No production adapter exists in code; the adapter contract is still documentation-only.
- The repo is not dual-engine ready; this is stated in `docs/grid-engine/README.md` and reflected by runtime code.
- Direct Handsontable coupling remains substantial: the frozen audit still reports 79 raw `.hot` callsites across active code, plus additional Handsontable-specific editor/cell-type inheritance.
- Dependent-table migration evidence is still isolated-spike-only because `grdi_1m` is on disk but not currently loadable from the bundled template menu.

### Likely blockers
- Production build verification is currently unstable in this environment: `build:web` equivalent was killed with exit `137`, and the `build:lib` equivalent timed out. These are real verification gaps, but current evidence is not sufficient to call them migration regressions.
- Current lint reality appears to have drifted from the documented baseline note, because Prettier now fails before the previously documented ESLint-only debt can be assessed.

### Unknowns that need verification
- Whether the `build:web` failure is reproducible in CI or on a less constrained machine, versus being local resource pressure.
- Whether the non-terminating `rollup` build is a local execution anomaly or a standing repo issue.
- Whether there is any migration-relevant example-input E2E regression; the grid-focused specs passed, but `example-input.spec.js` was not part of this inspection.

## 7. Recommendation for the next planning step
Primary recommendation: `implement first real RevoGrid adapter behind the existing seam`.

That recommendation is directly supported by current repo evidence, not speculation. The candidate decision is already settled in repository artifacts: Tabulator is documented and tested as rejected, while RevoGrid is documented and tested as the passing candidate. The repo already has the prerequisites for a narrow implementation prompt: engine-selection plumbing, a frozen `.hot` audit baseline, a documented minimal contract, and CI guarding against new raw Handsontable reach-through. What it does not have is any runtime adapter code, so the next useful planning prompt should be about implementing the first bounded RevoGrid-backed path without widening the abstraction or claiming dual-engine readiness.
