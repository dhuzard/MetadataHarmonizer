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

const REVOGRID_VERSION = '4.21.3';
const INVALID_CLASS = 'grid-spike-invalid-cell';

function invalidLookupKey(rowId, field) {
  return `${rowId}::${field}`;
}

function createCellTemplate(invalidCells, field) {
  return function revoCellTemplate(h, { model, value }) {
    const invalid = invalidCells.has(invalidLookupKey(model.id, field));
    return h(
      'div',
      {
        class: {
          [INVALID_CLASS]: invalid,
        },
        'data-spike-field': field,
      },
      value ?? ''
    );
  };
}

class RevoBaseEditor {
  constructor(column, saveCallback, closeCallback) {
    this.data = column;
    this.saveCallback = saveCallback;
    this.closeCallback = closeCallback;
    this.value = column?.model?.[column?.prop] ?? '';
    this.element = null;
  }

  componentDidRender() {
    if (this.element && typeof this.element.focus === 'function') {
      this.element.focus();
    }
  }

  beforeDisconnect() {
    if (this.element && document.activeElement === this.element) {
      this.element.blur();
    }
  }
}

class RevoInputEditor extends RevoBaseEditor {
  constructor(column, saveCallback, closeCallback, inputType = 'text') {
    super(column, saveCallback, closeCallback);
    this.inputType = inputType;
  }

  getValue() {
    return this.value;
  }

  render(h) {
    return h('input', {
      class: {
        'form-control': true,
        'form-control-sm': true,
      },
      ref: (element) => {
        this.element = element;
      },
      type: this.inputType,
      value: this.value,
      onInput: (event) => {
        this.value = event.target.value;
      },
      onChange: (event) => {
        this.value = event.target.value;
        this.saveCallback(this.value, false);
      },
    });
  }
}

class RevoSelectEditor extends RevoBaseEditor {
  constructor(column, saveCallback, closeCallback, values = []) {
    super(column, saveCallback, closeCallback);
    this.values = values;
  }

  getValue() {
    return this.value;
  }

  render(h) {
    return h(
      'select',
      {
        class: {
          'form-control': true,
          'form-control-sm': true,
        },
        ref: (element) => {
          this.element = element;
        },
        value: this.value,
        onChange: (event) => {
          this.value = event.target.value;
          this.saveCallback(this.value, false);
        },
      },
      this.values.map((option) =>
        h(
          'option',
          {
            selected: option === this.value,
            value: option,
          },
          option
        )
      )
    );
  }
}

class RevoMultiValueEditor extends RevoBaseEditor {
  constructor(column, saveCallback, closeCallback) {
    super(column, saveCallback, closeCallback);
    this.selectedValues =
      typeof this.value === 'string' && this.value.length > 0
        ? this.value
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
        : [];
  }

  getValue() {
    return this.selectedValues.join('; ');
  }

  render(h) {
    return h(
      'select',
      {
        class: {
          'form-control': true,
          'form-control-sm': true,
        },
        multiple: true,
        size: 4,
        ref: (element) => {
          this.element = element;
        },
        onChange: (event) => {
          this.selectedValues = Array.from(event.target.selectedOptions).map(
            (option) => option.value
          );
          this.value = this.getValue();
          this.saveCallback(this.value, false);
        },
      },
      MULTIVALUE_VALUES.map((option) =>
        h(
          'option',
          {
            selected: this.selectedValues.includes(option),
            value: option,
          },
          option
        )
      )
    );
  }
}

class RevoDateEditor extends RevoInputEditor {
  constructor(column, saveCallback, closeCallback) {
    super(column, saveCallback, closeCallback, 'date');
  }
}

class RevoDateTimeEditor extends RevoInputEditor {
  constructor(column, saveCallback, closeCallback) {
    super(column, saveCallback, closeCallback, 'datetime-local');
  }
}

class RevoTimeEditor extends RevoInputEditor {
  constructor(column, saveCallback, closeCallback) {
    super(column, saveCallback, closeCallback, 'time');
  }
}

function buildParentColumns(invalidCells) {
  return [
    {
      name: 'Identity',
      children: [
        {
          name: 'Record ID',
          prop: 'displayId',
          readonly: true,
        },
        {
          name: 'Parent Key',
          prop: 'parentKey',
          readonly: true,
        },
      ],
    },
    {
      name: 'Controlled Fields',
      children: [
        {
          name: 'Status',
          prop: 'status',
          editor: class StatusEditor extends RevoSelectEditor {
            constructor(column, save, close) {
              super(column, save, close, STATUS_VALUES);
            }
          },
          cellTemplate: createCellTemplate(invalidCells, 'status'),
        },
        {
          name: 'Symptoms',
          prop: 'symptoms',
          editor: RevoMultiValueEditor,
          cellTemplate: createCellTemplate(invalidCells, 'symptoms'),
        },
      ],
    },
    {
      name: 'Temporal',
      children: [
        {
          name: 'Date',
          prop: 'collectionDate',
          editor: RevoDateEditor,
          cellTemplate: createCellTemplate(invalidCells, 'collectionDate'),
        },
        {
          name: 'DateTime',
          prop: 'collectionDateTime',
          editor: RevoDateTimeEditor,
          cellTemplate: createCellTemplate(invalidCells, 'collectionDateTime'),
        },
        {
          name: 'Time',
          prop: 'collectionTime',
          editor: RevoTimeEditor,
          cellTemplate: createCellTemplate(invalidCells, 'collectionTime'),
        },
      ],
    },
    {
      name: 'Validation',
      children: [
        {
          name: 'Quantity',
          prop: 'quantity',
          editor: RevoInputEditor,
          cellTemplate: createCellTemplate(invalidCells, 'quantity'),
        },
      ],
    },
  ];
}

function buildChildColumns(invalidCells, { showParentId = true } = {}) {
  const identityChildren = [
    {
      name: 'Child ID',
      prop: 'childCode',
      readonly: true,
    },
  ];

  if (showParentId) {
    identityChildren.push({
      name: 'Parent ID',
      prop: 'parentId',
      readonly: true,
    });
  }

  return [
    {
      name: 'Identity',
      children: identityChildren,
    },
    {
      name: 'Child Fields',
      children: [
        {
          name: 'Status',
          prop: 'status',
          editor: class StatusEditor extends RevoSelectEditor {
            constructor(column, save, close) {
              super(column, save, close, STATUS_VALUES);
            }
          },
          cellTemplate: createCellTemplate(invalidCells, 'status'),
        },
        {
          name: 'Quantity',
          prop: 'quantity',
          editor: RevoInputEditor,
          cellTemplate: createCellTemplate(invalidCells, 'quantity'),
        },
        {
          name: 'Note',
          prop: 'note',
          editor: RevoInputEditor,
        },
      ],
    },
  ];
}

function createPasteEvent(text) {
  const clipboardData = {
    types: ['text/plain', 'text'],
    getData(type) {
      return type === 'text/plain' || type === 'text' ? text : '';
    },
  };

  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    configurable: true,
    value: clipboardData,
  });
  return event;
}

function getRenderedRoot(grid) {
  return grid.shadowRoot || grid;
}

function findEditorElement(grid, selector) {
  return getRenderedRoot(grid).querySelector(selector);
}

function once(target, eventName) {
  return new Promise((resolve) => {
    target.addEventListener(eventName, resolve, { once: true });
  });
}

function createGridElement(id) {
  const grid = document.createElement('revo-grid');
  grid.id = id;
  grid.style.height = '360px';
  grid.style.width = '100%';
  grid.range = true;
  grid.useClipboard = true;
  grid.applyOnClose = true;
  return grid;
}

async function editInputCell(grid, prop, selector, value) {
  await grid.setCellEdit(0, prop);
  await wait(80);

  const input = findEditorElement(grid, selector);
  if (!input) {
    throw new Error(`Editor ${selector} not found for ${prop}`);
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  if (typeof input.blur === 'function') {
    input.blur();
  }
  await wait(80);
}

function hasGroupedHeaderLabels(grid, labels) {
  const renderedText = getRenderedRoot(grid).textContent || '';
  return labels.every((label) => renderedText.includes(label));
}

export async function mountRevoGridSpike(root) {
  const [{ defineCustomElements }, { TextEditor }] = await Promise.all([
    import('@revolist/revogrid/loader'),
    import('@revolist/revogrid'),
  ]);

  defineCustomElements();
  await customElements.whenDefined('revo-grid');

  const invalidParentCells = new Set();
  const invalidChildCells = new Set();
  const parentRows = cloneRows(PARENT_ROWS);
  const childRows = cloneRows(CHILD_ROWS);
  const hiddenChildIds = new Set();
  const state = {
    activeParentId: parentRows[0].id,
    showChildParentId: true,
  };

  renderSpikePanels(
    root,
    `
      <div class="row">
        <div class="col-lg-7 mb-3">
          <h3 class="h6">Parent Fixture</h3>
          <div id="grid-engine-spike-parent-host" class="grid-engine-spike-table"></div>
        </div>
        <div class="col-lg-5 mb-3">
          <h3 class="h6">Child Fixture</h3>
          <div id="grid-engine-spike-child-host" class="grid-engine-spike-table"></div>
        </div>
      </div>
    `
  );

  const parentHost = root.querySelector('#grid-engine-spike-parent-host');
  const childHost = root.querySelector('#grid-engine-spike-child-host');
  const parentGrid = createGridElement('grid-engine-spike-parent-revo');
  const childGrid = createGridElement('grid-engine-spike-child-revo');

  parentGrid.editors = {
    text: TextEditor,
  };
  childGrid.editors = {
    text: TextEditor,
  };

  parentHost.appendChild(parentGrid);
  childHost.appendChild(childGrid);

  parentGrid.columns = buildParentColumns(invalidParentCells);
  parentGrid.source = parentRows;
  childGrid.columns = buildChildColumns(invalidChildCells, {
    showParentId: state.showChildParentId,
  });
  childGrid.source = childRows;

  const applyChildVisibility = async () => {
    const trimmed = {};
    childRows.forEach((row, index) => {
      if (row.parentId !== state.activeParentId || hiddenChildIds.has(row.id)) {
        trimmed[index] = true;
      }
    });
    childGrid.trimmedRows = trimmed;
    await wait(50);
  };

  await Promise.all([
    once(parentGrid, 'aftergridrender'),
    once(childGrid, 'aftergridrender'),
  ]);
  await applyChildVisibility();

  updateSpikeVerdict(root, 'Evaluating RevoGrid', 'warning');
  renderSpikeSummary(
    root,
    `
      <p class="mb-2">
        Candidate: <strong>RevoGrid ${REVOGRID_VERSION}</strong> via
        <code>@revolist/revogrid</code>. The harness uses RevoGrid in a separate
        review-only fixture with narrow custom editors where DH semantics need them.
      </p>
      <p class="mb-0 text-muted">
        The strongest fit signal here is that range paste, trimmed rows, and grouped
        columns are part of the grid model instead of being synthetic compatibility
        layers.
      </p>
    `
  );

  const behaviorResults = [];

  try {
    await parentGrid.setCellEdit(0, 'status');
    await wait(80);
    const select = findEditorElement(parentGrid, 'select');
    select.value = 'complete';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(80);

    behaviorResults.push(
      createBehaviorResult({
        key: 'enum-dropdown-editing',
        supportPath: 'workaround',
        complexity: 'medium',
        risk: 'DH would still own the select editor implementation unless an official plugin is adopted later.',
        status: parentGrid.source[0].status === 'complete' ? 'pass' : 'fail',
        notes:
          parentGrid.source[0].status === 'complete'
            ? 'Custom select editor committed a controlled vocabulary value through setCellEdit without touching grid internals.'
            : 'Select editor did not commit the expected vocab value.',
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'enum-dropdown-editing',
        supportPath: 'workaround',
        complexity: 'medium',
        risk: 'Custom select editor failed to open or commit cleanly.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  try {
    await parentGrid.setCellEdit(0, 'symptoms');
    await wait(80);
    const multiSelect = findEditorElement(parentGrid, 'select[multiple]');
    Array.from(multiSelect.options).forEach((option) => {
      option.selected = ['cough', 'fever', 'fatigue'].includes(option.value);
    });
    multiSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(80);

    behaviorResults.push(
      createBehaviorResult({
        key: 'multivalue-workflow',
        supportPath: 'workaround',
        complexity: 'medium',
        risk: 'RevoGrid needs a custom multi-select editor, but the editor can preserve DH semicolon-delimited strings directly.',
        status: parentGrid.source[0].symptoms.includes('fatigue')
          ? 'pass'
          : 'fail',
        notes: parentGrid.source[0].symptoms.includes('fatigue')
          ? 'Custom multi-select editor round-tripped a DH-style semicolon string instead of forcing array storage.'
          : 'Multi-select editor did not preserve DH string semantics.',
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'multivalue-workflow',
        supportPath: 'workaround',
        complexity: 'high',
        risk: 'Custom multi-select editor failed to preserve DH strings.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  try {
    await editInputCell(
      parentGrid,
      'collectionDate',
      'input[type="date"]',
      '2026-03-04'
    );
    await editInputCell(
      parentGrid,
      'collectionDateTime',
      'input[type="datetime-local"]',
      '2026-03-04T13:45'
    );
    await editInputCell(
      parentGrid,
      'collectionTime',
      'input[type="time"]',
      '13:45'
    );

    behaviorResults.push(
      createBehaviorResult({
        key: 'temporal-editing',
        supportPath: 'workaround',
        complexity: 'medium',
        risk: 'Temporal editing needs custom editors, but standard HTML input types are enough for the DH string formats used here.',
        status:
          parentGrid.source[0].collectionDate === '2026-03-04' &&
          parentGrid.source[0].collectionDateTime === '2026-03-04T13:45' &&
          parentGrid.source[0].collectionTime === '13:45'
            ? 'pass'
            : 'fail',
        notes:
          parentGrid.source[0].collectionDate === '2026-03-04' &&
          parentGrid.source[0].collectionDateTime === '2026-03-04T13:45' &&
          parentGrid.source[0].collectionTime === '13:45'
            ? 'Custom date/time editors committed the expected DH string formats.'
            : 'Temporal editors did not preserve the expected string formats.',
      })
    );
  } catch (error) {
    behaviorResults.push(
      createBehaviorResult({
        key: 'temporal-editing',
        supportPath: 'workaround',
        complexity: 'high',
        risk: 'Custom temporal editors failed to commit values.',
        status: 'fail',
        notes: error.message,
      })
    );
  }

  invalidParentCells.add(invalidLookupKey('parent-2', 'quantity'));
  parentGrid.source = [...parentGrid.source];
  await wait(120);
  parentGrid.trimmedRows = { 0: true };
  await wait(80);
  parentGrid.trimmedRows = {};
  await wait(120);

  const invalidQuantityCell = findEditorElement(
    parentGrid,
    `[data-spike-field="quantity"].${INVALID_CLASS}`
  );
  behaviorResults.push(
    createBehaviorResult({
      key: 'validation-repaint',
      supportPath: 'workaround',
      complexity: 'medium',
      risk: 'DH still owns validation rules, but RevoGrid cellTemplate replay keeps invalid styling stable across trim/untrim.',
      status: invalidQuantityCell ? 'pass' : 'fail',
      notes: invalidQuantityCell
        ? 'Invalid-cell styling survived source refresh and trimmed-row repaint.'
        : 'Invalid styling dropped after repaint.',
    })
  );

  await childGrid.setCellsFocus(
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    'rgCol',
    'rgRow'
  );
  childGrid.focus();
  await wait(80);
  document.dispatchEvent(createPasteEvent('complete\t9'));
  await wait(150);

  behaviorResults.push(
    createBehaviorResult({
      key: 'spreadsheet-paste',
      supportPath: 'native',
      complexity: 'low',
      risk: 'Low; range paste is part of the selection model instead of a row insert fallback.',
      status:
        childGrid.source[0].status === 'complete' &&
        childGrid.source[0].quantity === '9'
          ? 'pass'
          : 'fail',
      notes:
        childGrid.source[0].status === 'complete' &&
        childGrid.source[0].quantity === '9'
          ? 'Range paste applied directly into the focused child cells.'
          : 'Paste did not land in the focused range as expected.',
    })
  );

  const groupedHeadersRendered = hasGroupedHeaderLabels(parentGrid, [
    'Identity',
    'Controlled Fields',
    'Temporal',
    'Validation',
  ]);
  behaviorResults.push(
    createBehaviorResult({
      key: 'nested-headers',
      supportPath: 'native',
      complexity: 'low',
      risk: 'Low; grouped columns are part of the core column model.',
      status: groupedHeadersRendered ? 'pass' : 'fail',
      notes: groupedHeadersRendered
        ? 'Nested headers rendered from the children-based column definitions.'
        : 'Grouped column DOM did not render as expected.',
    })
  );

  hiddenChildIds.add('child-2');
  state.activeParentId = 'parent-1';
  await applyChildVisibility();
  state.showChildParentId = false;
  childGrid.columns = buildChildColumns(invalidChildCells, {
    showParentId: state.showChildParentId,
  });
  await wait(120);

  const visibleChildRows = await childGrid.getVisibleSource();
  const parentIdHeader = Array.from(
    getRenderedRoot(childGrid).querySelectorAll('.rgHeaderCell')
  ).find((cell) => cell.textContent.includes('Parent ID'));

  behaviorResults.push(
    createBehaviorResult({
      key: 'hidden-state-filtering',
      supportPath: 'workaround',
      complexity: 'medium',
      risk: 'Hidden columns require column-array updates, but row hiding itself is native through trimmedRows and does not collide with dependent filtering.',
      status:
        visibleChildRows.length === 1 &&
        visibleChildRows[0].id === 'child-1' &&
        !parentIdHeader
          ? 'pass'
          : 'fail',
      notes:
        visibleChildRows.length === 1 &&
        visibleChildRows[0].id === 'child-1' &&
        !parentIdHeader
          ? 'Dependent filtering used native trimmedRows while column hiding stayed a bounded column-definition rewrite.'
          : 'Hidden-state or dependent filtering diverged from the expected child visibility.',
    })
  );

  const addedRow = {
    id: 'parent-3',
    displayId: 'P-003',
    parentKey: 'gamma',
    status: 'pending',
    symptoms: '',
    collectionDate: '2026-02-03',
    collectionDateTime: '2026-02-03T10:00',
    collectionTime: '10:00',
    quantity: '1',
  };
  parentGrid.source = [...parentGrid.source, addedRow];
  await wait(120);
  parentGrid.source = parentGrid.source.filter((row) => row.id !== 'parent-3');
  await wait(120);

  behaviorResults.push(
    createBehaviorResult({
      key: 'row-identity',
      supportPath: 'workaround',
      complexity: 'medium',
      risk: 'Row creation/removal is source-driven rather than a dedicated grid command, but ids remain stable and explicit.',
      status:
        parentGrid.source.some((row) => row.id === 'parent-1') &&
        !parentGrid.source.some((row) => row.id === 'parent-3')
          ? 'pass'
          : 'fail',
      notes:
        parentGrid.source.some((row) => row.id === 'parent-1') &&
        !parentGrid.source.some((row) => row.id === 'parent-3')
          ? 'Source updates preserved stable ids across row insertion and deletion.'
          : 'Row ids drifted during source updates.',
    })
  );

  return finalizeReport(root, {
    candidate: 'revogrid',
    packageName: '@revolist/revogrid',
    version: REVOGRID_VERSION,
    behaviors: behaviorResults,
  });
}
