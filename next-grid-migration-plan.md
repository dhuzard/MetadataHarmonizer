# Next Grid Migration Plan

## 1. Current starting point
- Established fact: the repository remains Handsontable-first and not dual-engine ready.
- Established fact: a production adapter seam now exists in [lib/grid/createGridAdapter.js](lib/grid/createGridAdapter.js), [lib/grid/HandsontableAdapter.js](lib/grid/HandsontableAdapter.js), and [lib/grid/RevoGridAdapter.js](lib/grid/RevoGridAdapter.js).
- Established fact: runtime engine selection is template-scoped in [lib/utils/gridEngine.js](lib/utils/gridEngine.js), with RevoGrid enabled only for `canada_covid19/CanCOGeNCovid19`.
- Established fact: the bounded RevoGrid runtime-v1 path supports boot/render/programmatic edit/controlled value edit/validate/visible validation feedback (banner semantics).
- Established fact: focused unit and E2E coverage exists in [tests/gridEngine.test.js](tests/gridEngine.test.js) and [tests/e2e/grid-engine-runtime.spec.js](tests/e2e/grid-engine-runtime.spec.js).
- Established fact: raw `.hot` audit surface is still frozen and concentrated in [lib/DataHarmonizer.js](lib/DataHarmonizer.js), [lib/editors/FlatpickrEditor.js](lib/editors/FlatpickrEditor.js), and [lib/utils/1m.js](lib/utils/1m.js).
- Established fact: the guard script currently hard-depends on `rg` via [script/grid-engine-audit-lib.mjs](script/grid-engine-audit-lib.mjs), which failed in constrained environments.
- Plausible inference: the adapter seam is proven for one real template but not yet stress-tested against broader template variability.
- Plausible inference: second-template evidence will likely expose hidden coupling earlier than visual parity work.
- Open unknown: how much non-1:m template variability (headers/editors/filters/validation edge cases) breaks current RevoGrid runtime-v1 behavior.
- Open unknown: whether runtime-v2 per-cell invalid styling can be achieved without broad RevoGrid DOM/cell-template coupling.

## 2. Candidate next steps

### A. Portable verification guard
- Problem solved:
  - Makes `.hot` surface guard runnable in environments without `rg`, restoring consistent migration safety checks.
- Repo evidence for doing it now:
  - [script/grid-engine-audit-lib.mjs](script/grid-engine-audit-lib.mjs) calls `execFileSync('rg', ...)` with no fallback.
  - Verification already failed on `rg` availability, while code-level migration work is intended to rely on that guard.
- Expected implementation scope:
  - Small: update [script/grid-engine-audit-lib.mjs](script/grid-engine-audit-lib.mjs) to detect `rg` and fallback to portable scanning (Node fs walk + regex scan, or `grep` fallback).
  - Add focused tests for parsing/collection behavior (likely new script-level tests or fixture-based assertion script).
- Expected migration-risk reduction:
  - Medium safety gain: prevents accidental audited-surface drift from going undetected in constrained local/CI setups.
- Key risks / hidden coupling:
  - Line-number and match-format parity between `rg` and fallback implementation may differ and cause false positives/negatives.
  - Performance risk on large scans if fallback is naive.
- Timing recommendation:
  - **Now (high-priority hardening), but secondary to the primary runtime evidence target.**

### B. Second bounded RevoGrid template path
- Problem solved:
  - Validates that current seam is not overfit to one template and can support a second real bundled non-1:m path.
- Repo evidence for doing it now:
  - Current allowlist in [lib/utils/gridEngine.js](lib/utils/gridEngine.js) contains one template.
  - Menu and schemas show multiple likely-simple non-1:m candidates with bundled example inputs (for example `grdi/GRDI`, `phac_dexa/PHACDexa`) in [web/templates/menu.json](web/templates/menu.json).
  - Current runtime-v1 tests are intentionally bounded to one template path in [tests/e2e/grid-engine-runtime.spec.js](tests/e2e/grid-engine-runtime.spec.js).
- Expected implementation scope:
  - Narrow: allowlist one additional template path, add one focused runtime E2E path, and update docs/status assertions.
  - No broad adapter expansion beyond behavior needed for that second template.
- Expected migration-risk reduction:
  - **High**: gives direct runtime evidence of seam generalization while still bounded and conservative.
- Key risks / hidden coupling:
  - Template-specific editor/validation/visibility behavior may require targeted RevoGrid adapter tweaks.
  - Some templates may implicitly pull in behavior close to 1:m or custom export assumptions.
- Timing recommendation:
  - **Now (primary next implementation target).**

### C. RevoGrid runtime-v2 invalid-state styling/per-cell parity
- Problem solved:
  - Moves from runtime-v1 visible validation feedback semantics to Handsontable-like per-cell invalid styling parity.
- Repo evidence for doing it now:
  - Current bounded behavior intentionally uses feedback banner semantics, not per-cell parity.
  - Prior debugging showed RevoGrid rendered DOM/cell class hooks are not a trivial drop-in parity match.
- Expected implementation scope:
  - Moderate-to-large: revisit rendering strategy in [lib/grid/RevoGridAdapter.js](lib/grid/RevoGridAdapter.js), cell templates, and likely test assertions/UI CSS.
- Expected migration-risk reduction:
  - Low-to-medium for migration sequence right now: mostly UX parity, less evidence of seam portability across templates.
- Key risks / hidden coupling:
  - High chance of engine-specific DOM coupling and brittle selector logic.
  - Risk of broadening adapter abstraction prematurely.
- Timing recommendation:
  - **Later / not yet.**

## 3. Primary recommendation
**Primary next target: B. Extend the bounded RevoGrid path to one additional non-1:m bundled template.**

Why this is the best next move:
- It produces the strongest migration evidence for minimal additional scope: whether the existing seam generalizes beyond one template.
- It keeps the migration strategy aligned with current constraints: no default-engine switch, no broad abstraction growth, no 1:m parity claim.

Why the other two are secondary:
- A (portable guard) is critical hardening but mostly tooling safety, not runtime seam evidence; it should be executed immediately after (or in parallel as a small subtask).
- C (per-cell invalid styling parity) is more invasive and likely to increase coupling before we have enough multi-template runtime evidence.

What success would prove:
- RevoGrid runtime-v1 can support at least two real bundled non-1:m paths behind existing selection plumbing.
- Current adapter seam is not only template-specific scaffolding for CanCOGeN.

What it would still not prove:
- Dual-engine readiness.
- 1:m parity.
- Full Handsontable plugin/editor parity.
- Broad runtime-v2 visual parity.

## 4. Proposed implementation slice

### Narrow slice definition
- Add exactly one additional non-1:m template path to RevoGrid allowlist.
- Add one focused bounded E2E for that second template.
- Keep runtime-v1 behavior semantics (including validation feedback banner) unless second-template behavior forces a minimal bounded fix.

### Likely files/modules involved
- Engine gating:
  - [lib/utils/gridEngine.js](lib/utils/gridEngine.js)
  - [tests/gridEngine.test.js](tests/gridEngine.test.js)
- Runtime test coverage:
  - [tests/e2e/grid-engine-runtime.spec.js](tests/e2e/grid-engine-runtime.spec.js) (extend/parameterize)
  - optionally add a dedicated second-template runtime spec if clarity is better
- If minimal adapter fix is required:
  - [lib/grid/RevoGridAdapter.js](lib/grid/RevoGridAdapter.js)
- Status/docs:
  - [docs/grid-engine/README.md](docs/grid-engine/README.md)
  - [migration-status-report.md](migration-status-report.md)
  - [first-runtime-adapter-summary.md](first-runtime-adapter-summary.md) (or successor status note)

### In-scope behaviors
- For second template path only:
  - boot
  - render
  - basic programmatic edit flow
  - controlled-value edit flow (if template supports it)
  - validation trigger
  - visible validation feedback
  - data persistence across edit + validate

### Explicit out-of-scope
- Default runtime switch away from Handsontable.
- 1:m support expansion.
- Tabulator reintroduction.
- Runtime-v2 per-cell invalid-style parity.
- Broad adapter API expansion beyond proven usage needs.

### Acceptance criteria
- Handsontable remains default runtime and fallback.
- RevoGrid activates only for explicitly allowlisted bounded template paths.
- New second template bounded path passes focused runtime E2E.
- No new raw `.hot` surfaces outside audited files.
- Docs explicitly state bounded scope and non-parity status.

### Tests to add/update
- Update [tests/gridEngine.test.js](tests/gridEngine.test.js): assert second template allowlisted activation and non-allowlisted fallback.
- Update/extend [tests/e2e/grid-engine-runtime.spec.js](tests/e2e/grid-engine-runtime.spec.js): include second-template bounded path assertions.
- Keep [tests/e2e/grid-engine-smoke.spec.js](tests/e2e/grid-engine-smoke.spec.js) as regression guard for default behavior/fallback.

## 5. Dependency and verification notes
- `rg` dependency portability:
  - Implement fallback behavior in [script/grid-engine-audit-lib.mjs](script/grid-engine-audit-lib.mjs):
    - preferred: `rg` when present
    - fallback: Node-based recursive scanner over `lib/` and `web/` with equivalent comment filtering and method extraction
  - Keep output/signature format compatible with [script/check-grid-usage.mjs](script/check-grid-usage.mjs).
- Blockers vs baseline debt:
  - Not blockers for this slice:
    - repo-wide Prettier baseline failures in unrelated files
    - existing lint/test debt outside focused migration files
  - Blocker for confidence if unaddressed soon:
    - non-portable `.hot` guard in constrained environments
- Verification commands for this slice:
  - `node script/check-grid-usage.mjs`
  - `./node_modules/.bin/jest tests/gridEngine.test.js --runInBand`
  - `./node_modules/.bin/playwright test tests/e2e/grid-engine-smoke.spec.js --config playwright.config.js`
  - `./node_modules/.bin/playwright test tests/e2e/grid-engine-runtime.spec.js --config playwright.config.js`
  - `./node_modules/.bin/rollup --config lib/rollup.config.js`
  - `./node_modules/.bin/webpack --mode=production --config web/webpack.config.js`

## 6. Sequencing after the chosen slice
1. Implement candidate A immediately after the second-template slice: make the guard portable (`rg` optional) and add focused verification for fallback behavior.
2. Re-evaluate candidate C only after two-template bounded runtime evidence is stable and guard portability is in place; if pursued, keep it as an explicitly bounded runtime-v2 UX parity increment.

## 7. Suggested agent execution prompt
Implement the next bounded grid migration increment in MetadataHarmonizer by extending RevoGrid runtime-v1 support to exactly one additional non-1:m bundled template path while preserving Handsontable as the default runtime and fallback.

Constraints:
- Do not broaden into dual-engine claims.
- Do not touch Tabulator paths.
- Do not implement 1:m parity.
- Keep adapter contract narrow and usage-derived.

Required work:
1. Update allowlist gating in `lib/utils/gridEngine.js` to include one additional non-1:m template path (choose a bundled template with existing example input and low complexity, e.g., `grdi/GRDI` or `phac_dexa/PHACDexa`).
2. Update `tests/gridEngine.test.js` for positive activation on both bounded paths and fallback on a non-allowlisted path.
3. Extend `tests/e2e/grid-engine-runtime.spec.js` with one focused runtime test flow for the second template path covering boot/render/basic edit/validation feedback/data persistence.
4. Keep RevoGrid validation semantics as runtime-v1 visible feedback (do not attempt full per-cell parity in this slice).
5. Update docs (`docs/grid-engine/README.md` and `migration-status-report.md`) to state exact bounded support scope.
6. Run and report verification commands with clear separation of code failures vs environment/tooling failures.

Acceptance:
- Handsontable default behavior unchanged.
- Second bounded RevoGrid path works via explicit non-default selection only.
- Focused unit/E2E pass.
- No new `.hot` surface expansion claims.
- Documentation remains explicit that repository is not dual-engine ready.
