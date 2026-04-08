# ADR 0001: Grid Engine Feasibility Spike Gate

## Status

Accepted

## Context

DataHarmonizer is still operationally coupled to Handsontable through `DataHarmonizer`, `AppContext`, `Toolbar`, `utils/1m`, custom editors, and legacy CSS selectors. The migration must preserve current behavior and keep the exported library shape stable while we evaluate replacement engines.

The approved approach is compatibility-first, but engine choice remains open. We will probe Tabulator first and keep RevoGrid as the explicit fallback if Tabulator requires excessive semantic emulation, especially around editor behavior or validation repaint timing.

## Decision

Before extracting a generic adapter or changing the default runtime engine, perform a mandatory feasibility spike:

1. Audit the exact repo-local `.hot` reach-through surface and use that as the maximum initial adapter scope.
2. Evaluate Tabulator first against the 8 critical behaviors below.
3. Stop and switch the candidate to RevoGrid if Tabulator shows friction on editor semantics or validation repaint behavior.
4. Keep all spike code behind non-default paths so the shipped runtime stays on Handsontable until the spike produces a go/no-go verdict.

## Critical Behaviors

| #   | Behavior                                                | Evidence Needed                                                                    |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Matrix load/read/write for open, save, export, validate | Fixture loads, edited cells persist, exports read expected values                  |
| 2   | Row selection semantics                                 | Toolbar and dependent filtering observe the selected row correctly                 |
| 3   | Row add/remove including FK autofill                    | Parent-driven row insertion and removal behave as today                            |
| 4   | Column/row visibility controls                          | Required/recommended/section filtering and hidden-row rules still work             |
| 5   | Nested headers and help hooks                           | Header grouping renders and column-help DOM hooks still fire                       |
| 6   | Editor semantics                                        | Text, date, datetime, time, single-select, multivalue editing behave correctly     |
| 7   | Change hook semantics                                   | Before/after change logic still supports uniqueness and field-change rules         |
| 8   | Validation repaint                                      | Invalid-cell classes and rerender behavior remain stable after validate/pre-repair |

## Candidate Decision Rule

| Candidate | Continue When                                                                                                           | Reject When                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Tabulator | All 8 behaviors work without broad synthetic emulation of Handsontable plugins/hooks and without unstable repaint hacks | Editor semantics or validation repaint require excessive shims, or the audited subset widens materially |
| RevoGrid  | Tabulator fails the gate and RevoGrid can satisfy the same 8 behaviors inside the audited subset                        | RevoGrid requires the same category of excessive shim work                                              |

## Evidence Table

| Fixture          | Behavior                     | Tabulator Evidence | RevoGrid Evidence | Notes |
| ---------------- | ---------------------------- | ------------------ | ----------------- | ----- |
| `canada_covid19` | 1. Matrix load/read/write    | Pending            | Pending           |       |
| `canada_covid19` | 2. Row selection             | Pending            | Pending           |       |
| `canada_covid19` | 3. Row add/remove            | Pending            | Pending           |       |
| `canada_covid19` | 4. Visibility controls       | Pending            | Pending           |       |
| `canada_covid19` | 5. Nested headers/help hooks | Pending            | Pending           |       |
| `canada_covid19` | 6. Editor semantics          | Pending            | Pending           |       |
| `canada_covid19` | 7. Change hook semantics     | Pending            | Pending           |       |
| `canada_covid19` | 8. Validation repaint        | Pending            | Pending           |       |
| `grdi_1m`        | 1. Matrix load/read/write    | Pending            | Pending           |       |
| `grdi_1m`        | 2. Row selection             | Pending            | Pending           |       |
| `grdi_1m`        | 3. Row add/remove            | Pending            | Pending           |       |
| `grdi_1m`        | 4. Visibility controls       | Pending            | Pending           |       |
| `grdi_1m`        | 5. Nested headers/help hooks | Pending            | Pending           |       |
| `grdi_1m`        | 6. Editor semantics          | Pending            | Pending           |       |
| `grdi_1m`        | 7. Change hook semantics     | Pending            | Pending           |       |
| `grdi_1m`        | 8. Validation repaint        | Pending            | Pending           |       |

## Spike Addendum: April 8, 2026

- `grdi_1m` remains on disk in the repository, but it is not currently loadable through the bundled template menu.
- A local scan across the loadable bundled templates showed single-tab runtime behavior for every menu entry.
- To avoid claiming bundled dependent-tab coverage that the current app no longer exposes, the feasibility spike used the isolated 1:m child-grid fixture under `web/spikes/grid-engine/` for the dependent-filtering and hidden-row behaviors.
- The resulting candidate evidence is recorded in:
  - `docs/grid-engine/grid-engine-scorecard.md`
  - `docs/grid-engine/spike-findings.md`

## Consequences

- The adapter remains internal and behavior-scoped until the spike selects a winner.
- `dh.hot` remains temporary and audited; no new raw engine dependencies should be added.
- Engine-selection plumbing does not imply dual-engine readiness. Until a candidate adapter exists, all non-Handsontable requests are selection-only spike inputs that fall back to Handsontable.
- The default runtime stays on Handsontable until the chosen candidate passes the spike gate and the dual-engine parity checks.
