export const GRID_RUNTIME_ADAPTER_V1 = Object.freeze({
  initialize: 'Create a runtime grid instance for one table root',
  destroy: 'Tear down the active runtime grid instance',
  render: 'Repaint cells after state changes',
  loadData: 'Replace grid matrix data',
  getData: 'Read full or ranged matrix data',
  getDataAtCell: 'Read one cell value',
  getDataAtRow: 'Read one row',
  countRows: 'Count rendered rows',
  countCols: 'Count rendered columns',
  countSourceRows: 'Count source rows',
  countEmptyRows: 'Count empty rows (optionally trailing)',
  isEmptyRow: 'Check if a row has no meaningful values',
  setDataAtCell: 'Apply one or many cell edits',
  addHook: 'Register runtime hook callback',
  addHookOnce: 'Register one-shot hook callback',
  runHooks: 'Manually emit runtime hooks',
  getSelected: 'Return active cell selection',
  selectCell: 'Programmatically set cell selection',
  scrollViewportTo: 'Scroll to a target cell',
});

export const GRID_RUNTIME_ADAPTER_V1_OMISSIONS = Object.freeze([
  'full-plugin-parity',
  'dependent-table-1m-lifecycle',
  'handsontable-editor-inheritance-compatibility',
  'generic-cross-engine-public-api',
]);
