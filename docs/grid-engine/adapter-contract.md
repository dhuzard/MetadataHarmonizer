# Minimal Adapter Contract

This document now describes the implemented runtime-v1 adapter seam.

It remains intentionally narrow and internal. It is not a claim of dual-engine readiness.

Current state:

- Handsontable remains the default shipped runtime.
- RevoGrid runtime support is template-scoped to one bounded bundled path:
  - `canada_covid19/CanCOGeNCovid19`
- The repo still carries audited direct engine reach-through outside this seam.

## Behavior Buckets

The current audited `.hot` usage should be treated as four behavior clusters:

1. Read-only data access
2. Mutation/editing
3. Selection/navigation/render lifecycle
4. Plugin/state features

The migration difficulty is expected to concentrate in clusters 2-4, especially editor semantics, validation repaint timing, selection/range behavior, and hidden row/column state.

## Runtime-v1 Contract

### load/get data

- Load matrix data into the active grid.
- Read full and trimmed table data.
- Read individual cell and row values.
- Count rows, columns, source rows, and empty trailing rows.

### update cell(s) and row mutation

- Set one or more cell values.
- Load source-data values where existing DH row-coordination logic requires it.
- Insert and remove rows while preserving current DH semantics.
- Keep undo out of scope for RevoGrid runtime-v1.

### selection, navigation, and render lifecycle

- Get current selection and focused row.
- Programmatically select and scroll to cells.
- Render or batch-render after state changes.
- Register the small hook set DH currently depends on.
- Destroy the active grid instance cleanly.

### plugin/state features

- Show and hide rows and columns.
- Apply filtering and visibility state.
- Update column settings and editing configuration.
- Replay invalid-cell state after validation.
- Keep any future engine-specific escape hatch explicit and temporary.

## Explicit Runtime-v1 Omissions

- Full Handsontable API emulation
- Broad plugin parity
- New public adapter API
- Broad engine-neutral editor inheritance
- Full dependent-table (`1:m`) parity
- Header double-click help hooks on RevoGrid
- Any broad migration beyond the bounded template path above
