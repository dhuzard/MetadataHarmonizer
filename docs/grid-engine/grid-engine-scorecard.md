# Grid Engine Scorecard

This scorecard records the hard-feature feasibility spike required by [ADR 0001](../adr/0001-grid-engine-feasibility-spike.md).

## Scope

- Default runtime remains Handsontable.
- The spike uses the non-default `?gridEngine=...&gridSpike=1` path only.
- Host route for the browser runs below: `canada_covid19/CanCOGeN_Covid-19`.

## Fixture Note

- `grdi_1m` exists on disk but is not loadable through the current bundled template menu, and a local menu scan showed every currently loadable bundled template rendering a single tab.
- For the audited 1:m behaviors, the spike therefore used the isolated child-grid fixture in [`web/spikes/grid-engine`](../../web/spikes/grid-engine) instead of claiming live bundled dependent-tab coverage that the current app no longer exposes.

## Tabulator 6.4.0

| Behavior                                                      | Audited Handsontable Bucket(s)                                   | Support Path | Complexity | Key Technical Risk                                                                                                  | Spike | Notes                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------ | ---------- | ------------------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled vocabulary / enum dropdown editing                 | `mutation/editing`, `plugin/state features`                      | native       | low        | Range-selection mode must avoid focus-triggered edits.                                                              | pass  | Used Tabulator `editor: 'list'` plus `cell.edit()` without extra glue.                                                                   |
| Multivalue workflow compatibility                             | `mutation/editing`, `plugin/state features`                      | workaround   | medium     | Native multiselect is array-first and drops autocomplete, so DH needs a string translation layer.                   | pass  | Worked only by adding `mutatorEdit` to rejoin array output into DH-style `'; '` strings.                                                 |
| Invalid-cell highlighting after validation and repaint timing | `selection/navigation/render lifecycle`, `plugin/state features` | workaround   | medium     | DH validation stays external, so invalid state must be replayed through formatters on redraw.                       | pass  | `formatter` replay kept the invalid class stable after redraw and column hide/show.                                                      |
| Paste from spreadsheet tools                                  | `mutation/editing`, `selection/navigation/render lifecycle`      | missing      | high       | Clipboard actions are row-oriented, not active-cell range paste semantics.                                          | fail  | `clipboardPasteAction: 'insert'` inserted a new row from TSV instead of updating the focused cell range.                                 |
| Grouped / nested headers                                      | `plugin/state features`                                          | native       | low        | Minimal.                                                                                                            | pass  | Native `columns: [...]` groups rendered as expected.                                                                                     |
| Hidden rows / hidden columns plus dependent filtering         | `plugin/state features`, `selection/navigation/render lifecycle` | workaround   | high       | No native row-hide API composes cleanly with dependent filtering, so both concerns collapse into one custom filter. | fail  | The only working path merged hidden-row ids and parent selection into `setFilter(...)`, which is the brittle emulation the gate rejects. |
| Date / datetime / time editing                                | `mutation/editing`, `plugin/state features`                      | native       | low        | Browser input variance exists, but the engine path is bounded.                                                      | pass  | Native `date`, `datetime`, and `time` editors committed the expected strings.                                                            |
| Row insertion / deletion with stable row identity             | `mutation/editing`, `selection/navigation/render lifecycle`      | native       | low        | Low once the explicit index field is fixed.                                                                         | pass  | `addRow` and `deleteRow` preserved explicit id-based row identity.                                                                       |

**Tabulator verdict:** `no-go`  
Pass count: `6/8`  
Critical failures: `spreadsheet-paste`, `hidden-state-filtering`

## RevoGrid 4.21.3

| Behavior                                                      | Audited Handsontable Bucket(s)                                   | Support Path | Complexity | Key Technical Risk                                                                                       | Spike | Notes                                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------- | ------------ | ---------- | -------------------------------------------------------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------- |
| Controlled vocabulary / enum dropdown editing                 | `mutation/editing`, `plugin/state features`                      | workaround   | medium     | DH still owns the select editor implementation unless a later engine-specific editor plugin replaces it. | pass  | Custom `editor` class plus `setCellEdit(...)` committed the controlled value without reaching through grid internals.  |
| Multivalue workflow compatibility                             | `mutation/editing`, `plugin/state features`                      | workaround   | medium     | Requires a DH-owned custom multi-select editor.                                                          | pass  | Custom multiselect editor preserved DH semicolon-delimited string storage directly.                                    |
| Invalid-cell highlighting after validation and repaint timing | `selection/navigation/render lifecycle`, `plugin/state features` | workaround   | medium     | DH still owns validation rules, so invalid state must be replayed from DH metadata.                      | pass  | `cellTemplate` replay preserved invalid styling across source refresh and `trimmedRows` repaint.                       |
| Paste from spreadsheet tools                                  | `mutation/editing`, `selection/navigation/render lifecycle`      | native       | low        | Low.                                                                                                     | pass  | Native range paste applied into the focused child range after `setCellsFocus(...)`.                                    |
| Grouped / nested headers                                      | `plugin/state features`                                          | native       | low        | Low.                                                                                                     | pass  | Native grouped columns rendered from the `children` column model.                                                      |
| Hidden rows / hidden columns plus dependent filtering         | `plugin/state features`, `selection/navigation/render lifecycle` | workaround   | medium     | Hidden columns still need a bounded column-definition rewrite.                                           | pass  | Native `trimmedRows` handled dependent row hiding; hiding the parent id column stayed local to a column-array rewrite. |
| Date / datetime / time editing                                | `mutation/editing`, `plugin/state features`                      | workaround   | medium     | DH must own small custom temporal editors.                                                               | pass  | Custom editors using standard HTML `date`, `datetime-local`, and `time` inputs committed the expected DH strings.      |
| Row insertion / deletion with stable row identity             | `mutation/editing`, `selection/navigation/render lifecycle`      | workaround   | medium     | Row CRUD is source-driven rather than an engine command API.                                             | pass  | Source-array updates preserved explicit ids across insert and delete operations.                                       |

**RevoGrid verdict:** `go`  
Pass count: `8/8`  
Critical failures: none

## Decision

- Tabulator fails the gate because two critical behaviors require the exact category of plugin emulation the spike was meant to reject.
- RevoGrid clears the gate with bounded, reviewable workarounds centered on DH-owned editors and validation replay, while the hardest selection and hidden-row behaviors map to engine features instead of synthetic shims.
- Recommended target for the next migration phase: `revogrid`, while keeping Handsontable as the default runtime until a narrow audited adapter overlap exists.
