# Grid Engine Spike Findings

## What Was Tested

- The spike stayed behind the non-default `?gridEngine=...&gridSpike=1` path and kept Handsontable as the shipped runtime.
- The browser harness exercised the 8 decision-critical behaviors from ADR 0001:
  - enum editing
  - multivalue editing
  - validation repaint
  - spreadsheet paste
  - nested headers
  - hidden rows / columns with dependent filtering
  - date / datetime / time editing
  - row insertion / deletion with stable identity
- Candidate order followed the approved gate:
  1. Tabulator
  2. RevoGrid only after Tabulator failed

## What Passed And Failed

### Tabulator

- Passed:
  - enum editing
  - multivalue editing with a bounded translation layer
  - validation repaint with formatter replay
  - nested headers
  - temporal editing
  - row identity
- Failed:
  - spreadsheet paste
  - hidden rows / columns plus dependent filtering

### RevoGrid

- Passed:
  - all 8 required behaviors
- Failed:
  - none

## Viability Verdict

- Tabulator is **not viable** for the audited DH behavior surface.
  - The failure is not about cosmetic gaps.
  - It misses two critical behaviors in exactly the risk clusters the migration was trying to de-risk:
    - cell-range spreadsheet paste
    - hidden-row state combined with dependent filtering
  - Both failures push Tabulator toward brittle Handsontable-style emulation, which violates the spike gate.
- RevoGrid **was needed** and became the stronger candidate.
  - The hardest behaviors mapped to engine primitives such as `trimmedRows`, grouped `children` columns, and range paste.
  - The remaining gaps were bounded DH-owned workarounds:
    - custom select / multivalue / temporal editors
    - validation class replay via `cellTemplate`
    - source-driven row CRUD

## Fixture Note

- `grdi_1m` is present in the repository but is not currently loadable through the bundled template menu, and a local scan of the loadable bundled templates showed single-tab runtime behavior across the menu.
- To avoid pretending there was live bundled dependent-tab coverage where there is not, the 1:m behavior checks ran inside the isolated child-grid fixture in [`web/spikes/grid-engine`](../../web/spikes/grid-engine).

## Recommended Next Step

- Keep the repo in selection-plumbing mode.
- Do not broaden the abstraction.
- Start the next phase only with a narrow internal migration path aimed at `revogrid`:
  - preserve Handsontable as default
  - keep `dh.hot` transitional and audited
  - extract only the audited behaviors needed for:
    - selection and range focus
    - hidden-row / hidden-column state
    - validation repaint
    - DH-owned custom editors
