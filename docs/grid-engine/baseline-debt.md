# Baseline Debt Snapshot

This note freezes the known repo-wide failures that were present while the grid-engine migration groundwork was introduced.

These are baseline issues, not migration blockers, unless a future change touches the same seam and changes their behavior.

## Lint Baseline

`yarn lint` currently fails on existing unused-variable debt in:

- `lib/AppContext.js`
- `lib/DataHarmonizer.js`
- `lib/Toolbar.js`
- `lib/editors/KeyValueEditor.js`
- `lib/utils/1m.js`

The migration-specific new files were checked separately with focused ESLint runs and pass.

## Jest Baseline

`yarn test` currently fails in existing suites unrelated to the new grid-engine scaffolding:

- `tests/templates.test.js`
  - missing `schemas` resolution in the Jest environment
- `tests/fields.test.js`
  - expectations currently do not match the repo's active field serialization behavior
- `tests/Validator.test.js`
  - expectations currently do not match the repo's active validator behavior

## Migration Attribution Rule

For migration work before the candidate engine is selected:

- treat `build:lib`, `build:web`, `test:e2e`, and the grid hot-surface guard as the primary green gates
- treat the failures above as known baseline debt unless the touched change set modifies the same files or behaviors
- if a migration change affects one of the failing suites directly, re-baseline explicitly instead of letting attribution stay ambiguous
