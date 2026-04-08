# Minimal Adapter Contract

This is the narrow contract the migration should target from the current Handsontable audit.

It is intentionally not a generic spreadsheet abstraction and it is not evidence that the repo is dual-engine ready. At this stage the repo has:

- engine selection and fallback plumbing
- a frozen audit of current raw `.hot` usage
- a small set of behavior-level helpers already moved out of direct `dh.hot` reach-throughs

It does not yet have a production candidate adapter.

## Behavior Buckets

The current audited `.hot` usage should be treated as four behavior clusters:

1. Read-only data access
2. Mutation/editing
3. Selection/navigation/render lifecycle
4. Plugin/state features

The migration difficulty is expected to concentrate in clusters 2-4, especially editor semantics, validation repaint timing, selection/range behavior, and hidden row/column state.

## Initial Contract

### load/get data

- Load matrix data into the active grid.
- Read full and trimmed table data.
- Read individual cell and row values.
- Count rows, columns, source rows, and empty trailing rows.

### update cell(s) and row mutation

- Set one or more cell values.
- Load source-data values where existing DH row-coordination logic requires it.
- Insert and remove rows while preserving current DH semantics.
- Support undo only where the current audited DH logic already depends on it.

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
- Support header/help metadata and the narrow editor DOM/runtime hooks DH already uses.
- Keep any future engine-specific escape hatch explicit and temporary.

## Explicit Non-Goals For The First Adapter

- Full Handsontable API emulation
- Generic plugin abstraction
- New public adapter API
- Broad engine-neutral editor inheritance
- Expanding the audited surface before the candidate spike proves the hard behaviors
