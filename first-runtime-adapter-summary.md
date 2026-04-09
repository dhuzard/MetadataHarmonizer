# First Runtime Adapter Summary

## What Was Implemented

- Added a production runtime adapter seam under `lib/grid/`:
  - `lib/grid/createGridAdapter.js`
  - `lib/grid/HandsontableAdapter.js`
  - `lib/grid/RevoGridAdapter.js`
  - `lib/grid/adapterContract.js`
- Refactored grid creation in `lib/DataHarmonizer.js` to instantiate runtime via adapter selection.
- Preserved Handsontable as the default runtime.
- Added bounded RevoGrid runtime-v1 support behind existing engine-selection plumbing.
- Added template-scoped engine support gating in `lib/utils/gridEngine.js`.
- Added focused tests for template-scoped engine resolution and bounded runtime behavior.
- Updated migration docs to reflect implemented runtime-v1 seam and explicit scope limits.

## Exact RevoGrid Path Now Supported

- Engine: `revogrid`
- Template path: `canada_covid19/CanCOGeNCovid19`
- Scope: one bounded bundled-template runtime path only.

Supported for this bounded path:

- App boot and template load
- Visible RevoGrid render
- Programmatic basic text editing flow
- Programmatic controlled-value/dropdown edit path
- Validation trigger
- Visible invalid-state feedback via runtime-v1 RevoGrid validation feedback banner
- Data preservation through edit + validate flow

## Still Unsupported

- Broad dual-engine runtime parity
- Full migration away from direct Handsontable coupling
- Full `1:m` dependent-table parity on RevoGrid
- Full plugin parity / generic plugin abstraction
- Full editor inheritance compatibility parity
- RevoGrid runtime-v1 undo parity
- Header double-click help parity in RevoGrid path
- Any claim that the repo is dual-engine ready

## Remaining Blockers

- Significant Handsontable-specific logic remains outside the bounded seam.
- The `.hot` frozen audit guard command currently fails in this environment because `rg` is missing on PATH.
- Repository-wide lint debt remains; focused changed-path checks are passing functionally but global lint baseline is still broader than this migration scope.

## Recommended Next Step

- Expand runtime-v1 RevoGrid support to one additional non-`1:m` bundled template path using the same conservative process:
  - Keep Handsontable as default
  - Keep adapter contract narrow and usage-derived
  - Add one focused runtime test per newly supported template path
  - Maintain explicit doc statements about non-parity and remaining gaps
