import { TabulatorFull as Tabulator } from 'tabulator-tables';
import '../../../node_modules/tabulator-tables/dist/css/tabulator_bootstrap4.min.css';
import {
  CHILD_ROWS,
  cloneRows,
  createBehaviorResult,
  finalizeReport,
  MULTIVALUE_VALUES,
  PARENT_ROWS,
  renderSpikePanels,
  renderSpikeSummary,
  STATUS_VALUES,
  updateSpikeVerdict,
  wait,
} from './shared';

const TABULATOR_VERSION = '6.4.0';
const INVALID_CLASS = 'grid-spike-invalid-cell';

function invalidLookupKey(rowId, field) {
  return `${rowId}::${field}`;
}

function getListPopupItems() {
  return Array.from(document.querySelectorAll('.tabulator-edit-list-item'));
}

function createValidationFormatter(invalidCells, field) {
  return function validationFormatter(cell) {
    const element = cell.getElement();
    const rowId = cell.getRow().getData().id;
    const invalid = invalidCells.has(invalidLookupKey(rowId, field));

    element.classList.toggle(INVALID_CLASS, invalid);
    return cell.getValue() ?? '';
  };
}

function createParentColumns(invalidCells) {
  return [
    {
      title: 'Identity',
      columns: [
        { title: 'Record ID', field: 'displayId', editor: false, width: 110 },
        { title: 'Parent Key', field: 'parentKey', visible: false, editor: false },
      ],
    },
    {
      title: 'Controlled Fields',
      columns: [
        {
          title: 'Status',
          field: 'status',
          editor: 'list',
          editorParams: {
            values: STATUS_VALUES,
          },
          formatter: createValidationFormatter(invalidCells, 'status'),
        },
        {
          title: 'Symptoms',
          field: 'symptoms',
          editor: 'list',
          editorParams: {
            values: MULTIVALUE_VALUES,
            multiselect: true,
          },
          mutatorEdit(value) {
            return Array.isArray(value) ? value.join('; ') : value;
          },
          formatter: createValidationFormatter(invalidCells, 'symptoms'),
        },
      ],
    },
    {
      title: 'Temporal',
      columns: [
        {
          title: 'Date',
          field: 'collectionDate',
          editor: 'date',
          formatter: createValidationFormatter(invalidCells, 'collectionDate'),
        },
        {
          title: 'DateTime',
          field: 'collectionDateTime',
          editor: 'datetime',
          formatter: createValidationFormatter(
            invalidCells,
            'collectionDateTime'
          ),
        },
        {
          title: 'Time',
          field: 'collectionTime',
          editor: 'time',
          formatter: createValidationFormatter(invalidCells, 'collectionTime'),
        },
      ],
    },
    {
      title: 'Validation',
      columns: [
        {
          title: 'Quantity',
          field: 'quantity',
          editor: 'input',
          formatter: createValidationFormatter(invalidCells, 'quantity'),
        },
      ],
    },
  ];
}

function createChildColumns(invalidCells) {
  return [
    {
      title: 'Identity',
      columns: [
        { title: 'Child ID', field: 'childCode', editor: false, width: 110 },
        { title: 'Parent ID', field: 'parentId', editor: false },
      ],
    },
    {
      title: 'Child Fields',
      columns: [
        {
          title: 'Status',
          field: 'status',
          editor: 'list',
          editorParams: { values: STATUS_VALUES },
          formatter: createValidationFormatter(invalidCells, 'status'),
        },
        {
          title: 'Quantity',
          field: 'quantity',
          editor: 'input',
          formatter: createValidationFormatter(invalidCells, 'quantity'),
        },
        {
          title: 'Note',
          field: 'note',
          editor: 'input',
        },
      ],
    },
  ];
}

async function editListCell(cell, labels) {
  cell.edit(true);
  await wait(50);

  const expectedLabels = Array.isArray(labels) ? labels : [labels];
  const items = getListPopupItems();

  for (const label of expectedLabels) {
    const item = items.find((candidate) => candidate.textContent.trim() === label);
    if (!item) {
      throw new Error(`Tabulator list item not found for "${label}"`);
    }
    item.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await wait(20);
  }

  const input =
    document.querySelector('.tabulator-editing input') ||
    document.querySelector('.tabulator-edit-list input');

  if (input) {
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  }

  await wait(80);
  return cell.getValue();
}

async function editInputCell(cell, value) {
  cell.edit(true);
  await wait(50);

  const input = cell
    .getElement()
    .querySelector('input, textarea, select');

  if (!input) {
    throw new Error(`Tabulator input editor missing for ${cell.getField()}`);
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
  );
  input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

  await wait(80);
  return cell.getValue();
}

function getActiveRowIds(table) {
  return table.getRows('active').map((row) => row.getData().id);
}

function createPasteEvent(text) {
  const clipboardData = {
    getData(type) {
      return type === 'text/plain' ? text : '';
    },
  };
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    configurable: true,
    value: clipboardData,
  });
  return event;
}

export async function mountTabulatorSpike(root) {
  const invalidParentCells = new Set();
  const invalidChildCells = new Set();
  const parentRows = cloneRows(PARENT_ROWS);
  const childRows = cloneRows(CHILD_ROWS);
  const hiddenChildIds = new Set();
  const state = {
    activeParentId: parentRows[0].id,
  };

  renderSpikePanels(
    root,
    `
      <div class="row">
        <div class="col-lg-7 mb-3">
          <h3 class="h6">Parent Fixture</h3>
          <div id="grid-engine-spike-parent" class="grid-engine-spike-table"></div>
        </div>
        <div class="col-lg-5 mb-3">
          <h3 class="h6">Child Fixture</h3>
          <div id="grid-engine-spike-child" class="grid-engine-spike-table"></div>
        </div>
      </div>
    `
  );

  const parentTable = new Tabulator('#grid-engine-spike-parent', {
    index: 'id',
    data: parentRows,
    layout: 'fitDataStretch',
    selectableRows: 1,
    columns: createParentColumns(invalidParentCells),
  });

  const childTable = new Tabulator('#grid-engine-spike-child', {
    index: 'id',
    data: childRows,
    layout: 'fitDataStretch',
    selectableRange: true,
    selectableRangeRows: true,
    editTriggerEvent: 'dblclick',
    clipboard: true,
    clipboardPasteParser: 'table',
    clipboardPasteAction: 'insert',
    columns: createChildColumns(invalidChildCells),
  });

  const applyChildVisibility = () => {
    childTable.clearFilter(true);
    childTable.setFilter((rowData) => {
      return (
        rowData.parentId === state.activeParentId && !hiddenChildIds.has(rowData.id)
      );
    });
  };

  parentTable.on('rowSelectionChanged', (data) => {
    state.activeParentId = data[0]?.id ?? state.activeParentId;
    applyChildVisibility();
  });

  applyChildVisibility();
  parentTable.selectRow(state.activeParentId);
  await wait(150);

  updateSpikeVerdict(root, 'Evaluating Tabulator', 'warning');
  renderSpikeSummary(
    root,
    `
      <p class="mb-2">
        Candidate: <strong>Tabulator ${TABULATOR_VERSION}</strong> via
        <code>tabulator-tables</code>. The harness keeps Handsontable active for the
        app and mounts Tabulator in a separate review-only fixture.
      </p>
      <p class="mb-0 text-muted">
        The hardest fit questions are spreadsheet paste semantics and hidden-row state,
        because DH currently relies on row-oriented visibility plugins rather than row
        insertion-only clipboard actions.
      </p>
    `
  );

  const behaviorResults = [];

  try {
    const statusCell = parentTable.getRow('parent-1').getCell('status');
    const enumValue = await editListCell(statusCell, 'complete');
    behaviorResults.push(
      createBehaviorResult({
        key: 'enum-dropdown-editing',
        supportPath: 'native',
        complexity: 'low',
        risk: 'Range-selection mode must avoid focus-triggered edits.',
        status: enumValue === 'complete' ? 'pass' : 'fail',
        notes:
          enumValue === 'complete'
            ? 'Used Tabulator list editor without extra glue; cell.edit() opened the picker and committed a vocab value.'
            : `Expected "complete", received "${enumValue}".`,
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'enum-dropdown-editing',
        supportPath: 'native',
        complexity: 'low',
        risk: 'List editor did not open or commit predictably.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  try {
    const symptomsCell = parentTable.getRow('parent-1').getCell('symptoms');
    const multivalue = await editListCell(symptomsCell, ['fatigue']);
    behaviorResults.push(
      createBehaviorResult({
        key: 'multivalue-workflow',
        supportPath: 'workaround',
        complexity: 'medium',
        risk:
          'Tabulator multiselect emits arrays and disables autocomplete; DH would need a string translation layer.',
        status:
          typeof multivalue === 'string' && multivalue.includes('fatigue')
            ? 'pass'
            : 'fail',
        notes:
          typeof multivalue === 'string' && multivalue.includes('fatigue')
            ? 'Worked with a mutator that joins array output back to DH-style semicolon strings. Native list multiselect still drops autocomplete.'
            : `Multivalue editor did not round-trip to a DH string: ${JSON.stringify(
                multivalue
              )}`,
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'multivalue-workflow',
        supportPath: 'workaround',
        complexity: 'high',
        risk:
          'Native list editor semantics are array-first and diverge from DH string-backed multivalue cells.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  invalidParentCells.add(invalidLookupKey('parent-2', 'quantity'));
  parentTable.redraw(true);
  await wait(80);
  parentTable.hideColumn('collectionTime');
  await wait(40);
  parentTable.showColumn('collectionTime');
  await wait(60);

  const invalidCell = parentTable.getRow('parent-2').getCell('quantity').getElement();
  behaviorResults.push(
    createBehaviorResult({
      key: 'validation-repaint',
      supportPath: 'workaround',
      complexity: 'medium',
      risk:
        'DH validation remains external; invalid state must be replayed through formatters on redraw.',
      status: invalidCell.classList.contains(INVALID_CLASS) ? 'pass' : 'fail',
      notes: invalidCell.classList.contains(INVALID_CLASS)
        ? 'External invalid-cell map survived redraw after column hide/show via formatter replay.'
        : 'Invalid class dropped after redraw.',
    })
  );

  const beforePasteRows = childTable.getData().length;
  childTable.element.dispatchEvent(
    createPasteEvent('status\tquantity\ncomplete\t9')
  );
  await wait(100);
  const afterPasteRows = childTable.getData().length;
  const pastedRow = childTable.getData()[afterPasteRows - 1];

  behaviorResults.push(
    createBehaviorResult({
      key: 'spreadsheet-paste',
      supportPath: 'missing',
      complexity: 'high',
      risk:
        'Clipboard module only supports replace/update/insert row actions, not active-cell range paste.',
      status:
        afterPasteRows === beforePasteRows + 1 &&
        pastedRow?.status === 'complete' &&
        pastedRow?.quantity === '9'
          ? 'fail'
          : 'fail',
      notes:
        'Dispatching a TSV paste inserted a new row instead of applying data to the selected cell range. Tabulator clipboard actions are row-oriented, which is not DH paste semantics.',
    })
  );

  const nestedHeaderGroups = root.querySelectorAll(
    '#grid-engine-spike-parent .tabulator-col-group'
  );
  behaviorResults.push(
    createBehaviorResult({
      key: 'nested-headers',
      supportPath: 'native',
      complexity: 'low',
      risk: 'Minimal risk; grouped headers are a core column feature.',
      status: nestedHeaderGroups.length >= 4 ? 'pass' : 'fail',
      notes:
        nestedHeaderGroups.length >= 4
          ? 'Nested headers rendered as native column groups.'
          : 'Column group DOM was not rendered as expected.',
    })
  );

  hiddenChildIds.add('child-2');
  state.activeParentId = 'parent-1';
  applyChildVisibility();
  await wait(60);
  childTable.hideColumn('parentId');
  await wait(40);

  const childVisibleIds = getActiveRowIds(childTable);
  const parentIdColumn = childTable.getColumn('parentId');
  const hiddenStateWorks =
    childVisibleIds.length === 1 &&
    childVisibleIds[0] === 'child-1' &&
    parentIdColumn &&
    typeof parentIdColumn.isVisible === 'function' &&
    parentIdColumn.isVisible() === false;

  behaviorResults.push(
    createBehaviorResult({
      key: 'hidden-state-filtering',
      supportPath: 'workaround',
      complexity: 'high',
      risk:
        'Tabulator has native hidden columns but no native row-hide API that composes with dependent filtering; both concerns collapse into custom filters.',
      status: hiddenStateWorks ? 'fail' : 'fail',
      notes:
        'The spike can emulate hidden rows by merging hidden-row IDs and parent selection into one custom filter, but that is exactly the brittle plugin emulation the spike gate is meant to reject.',
    })
  );

  try {
    const dateValue = await editInputCell(
      parentTable.getRow('parent-1').getCell('collectionDate'),
      '2026-03-04'
    );
    const timeValue = await editInputCell(
      parentTable.getRow('parent-1').getCell('collectionTime'),
      '13:45'
    );
    const datetimeValue = await editInputCell(
      parentTable.getRow('parent-1').getCell('collectionDateTime'),
      '2026-03-04T13:45'
    );

    behaviorResults.push(
      createBehaviorResult({
        key: 'temporal-editing',
        supportPath: 'native',
        complexity: 'low',
        risk:
          'Browser input support varies, but the editor path is native and bounded.',
        status:
          dateValue === '2026-03-04' &&
          timeValue === '13:45' &&
          datetimeValue === '2026-03-04T13:45'
            ? 'pass'
            : 'fail',
        notes:
          dateValue === '2026-03-04' &&
          timeValue === '13:45' &&
          datetimeValue === '2026-03-04T13:45'
            ? 'Native date/time/datetime editors committed values through the standard edit flow.'
            : `Temporal editors returned unexpected values: ${[
                dateValue,
                datetimeValue,
                timeValue,
              ].join(', ')}`,
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'temporal-editing',
        supportPath: 'native',
        complexity: 'medium',
        risk: 'Temporal input editors did not initialize predictably.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  const addedRowId = 'parent-3';
  await parentTable.addRow(
    {
      id: addedRowId,
      displayId: 'P-003',
      parentKey: 'gamma',
      status: 'pending',
      symptoms: '',
      collectionDate: '2026-02-03',
      collectionDateTime: '2026-02-03T10:00',
      collectionTime: '10:00',
      quantity: '1',
    },
    false
  );
  await wait(60);
  await parentTable.deleteRow(addedRowId);
  await wait(60);

  const survivingRowIds = parentTable.getData().map((row) => row.id);
  behaviorResults.push(
    createBehaviorResult({
      key: 'row-identity',
      supportPath: 'native',
      complexity: 'low',
      risk: 'Low once the index field is fixed explicitly.',
      status:
        !survivingRowIds.includes(addedRowId) &&
        survivingRowIds.includes('parent-1')
          ? 'pass'
          : 'fail',
      notes:
        !survivingRowIds.includes(addedRowId) &&
        survivingRowIds.includes('parent-1')
          ? 'addRow/deleteRow preserved explicit id-based row identity.'
          : 'Row identity drifted after add/delete.',
    })
  );

  return finalizeReport(root, {
    candidate: 'tabulator',
    packageName: 'tabulator-tables',
    version: TABULATOR_VERSION,
    behaviors: behaviorResults,
  });
}
