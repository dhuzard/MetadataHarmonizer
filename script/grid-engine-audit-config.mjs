export const HOT_METHOD_BUCKETS = Object.freeze({
  getDataAtCell: 'read-only data access',
  getData: 'read-only data access',
  getDataAtRow: 'read-only data access',
  countRows: 'read-only data access',
  countCols: 'read-only data access',
  countSourceRows: 'read-only data access',
  countEmptyRows: 'read-only data access',
  isEmptyRow: 'read-only data access',

  loadData: 'mutation/editing',
  alter: 'mutation/editing',
  setDataAtCell: 'mutation/editing',
  setSourceDataAtCell: 'mutation/editing',
  undo: 'mutation/editing',

  getSelected: 'selection/navigation/render lifecycle',
  selectCell: 'selection/navigation/render lifecycle',
  scrollViewportTo: 'selection/navigation/render lifecycle',
  render: 'selection/navigation/render lifecycle',
  addHook: 'selection/navigation/render lifecycle',
  addHookOnce: 'selection/navigation/render lifecycle',
  runHooks: 'selection/navigation/render lifecycle',
  batchRender: 'selection/navigation/render lifecycle',
  destroy: 'selection/navigation/render lifecycle',

  getPlugin: 'plugin/state features',
  updateSettings: 'plugin/state features',
  getSettings: 'plugin/state features',
  rootDocument: 'plugin/state features',
  rootWindow: 'plugin/state features',
  view: 'plugin/state features',
});

export const GRID_ADAPTER_CONTRACT = Object.freeze([
  {
    name: 'load/get data',
    details: [
      'load matrix data into the active grid',
      'read full and trimmed table data',
      'read individual cell and row values',
      'count rows, columns, source rows, and empty trailing rows',
    ],
  },
  {
    name: 'update cell(s) and row mutation',
    details: [
      'set one or more cell values',
      'load source data values when row coordination logic needs it',
      'insert and remove rows while preserving current DH semantics',
      'support undo only where existing DH logic already depends on it',
    ],
  },
  {
    name: 'selection, navigation, and render lifecycle',
    details: [
      'get current selection and focused row',
      'programmatically select and scroll to cells',
      'render or batch render after state changes',
      'register the small hook set DH currently depends on',
      'destroy the active grid instance cleanly',
    ],
  },
  {
    name: 'plugin/state features',
    details: [
      'show and hide rows and columns',
      'apply filtering and visibility state',
      'update column settings and editing configuration',
      'expose header/help metadata and the narrow editor DOM/runtime hooks DH already uses',
      'keep any future engine-specific escape hatch explicit and temporary',
    ],
  },
]);
