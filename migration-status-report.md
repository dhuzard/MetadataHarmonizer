# Grid Migration Status Report

## 1. Executive Summary

- Current migration phase: first runtime adapter seam is implemented, but the repository is still not dual-engine ready.
- Handsontable remains the default runtime engine.
- RevoGrid is now available through the existing engine-selection plumbing only for bounded bundled-template runtime paths:
  - `canada_covid19/CanCOGeNCovid19`
  - `phac_dexa/PHACDexa`
- Tabulator remains rejected for production migration based on prior spike evidence.

## 2. What Is Implemented Now

- Runtime adapter layer in code under `lib/grid/`:
  - `createGridAdapter.js`
  - `HandsontableAdapter.js`
  - `RevoGridAdapter.js`
  - `adapterContract.js`
- `DataHarmonizer` now creates grid runtime instances through the adapter seam.
- Default Handsontable behavior is preserved for existing runtime paths.
- RevoGrid runtime path supports the bounded flow for the selected template:
  - app boot
  - template load
  - visible grid render
  - text editing
  - controlled-value dropdown editing
  - validation trigger and visible invalid-cell feedback
  - data retention through edit + validate
- Engine resolution is template-scoped for RevoGrid activation:
  - enabled: `canada_covid19/CanCOGeNCovid19`
  - enabled: `phac_dexa/PHACDexa`
  - all other template paths continue to fallback to Handsontable.

## 3. What Is Deliberately Not Implemented

- Full dual-engine parity.
- Broad migration of direct Handsontable reach-through.
- Full `1:m` dependent-table behavior parity on RevoGrid.
- Generic plugin abstraction across engines.
- Full undo parity on RevoGrid runtime-v1.
- Header double-click help parity on RevoGrid runtime-v1.

## 4. Frozen Handsontable Surface Status

- The raw `.hot` surface remains frozen and audited.
- No new raw `.hot` usage should be introduced outside the existing audited surface files.
- Guard command remains:
  - `node script/check-grid-usage.mjs`

## 5. Testing Scope Added

- Unit coverage updated for template-scoped engine resolution behavior.
- New focused E2E runtime coverage added for:
  - Handsontable default runtime path
  - bounded RevoGrid runtime path (`canada_covid19/CanCOGeNCovid19`)
  - bounded RevoGrid runtime path (`phac_dexa/PHACDexa`)

## 6. Remaining Migration Blockers

- Repository still has significant Handsontable-specific coupling outside the bounded seam.
- RevoGrid runtime support is intentionally narrow and template-scoped.
- Dependent-table parity and broader toolbar/plugin parity remain future work.

## 7. Recommended Next Step

- Expand RevoGrid runtime support to one additional non-`1:m` bundled template path while preserving:
  - Handsontable default runtime
  - bounded contract growth from audited usage only
  - explicit scope statements in docs and tests
