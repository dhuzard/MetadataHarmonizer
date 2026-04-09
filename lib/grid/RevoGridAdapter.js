import { defineCustomElements } from '@revolist/revogrid/loader';
import { TextEditor } from '@revolist/revogrid';

import { isEmptyUnitVal } from '../utils/general';

let customElementsReady = false;

function ensureCustomElements() {
  if (!customElementsReady) {
    defineCustomElements();
    customElementsReady = true;
  }
}

function normalizeCellValue(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  return value;
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
  constructor(column, saveCallback, closeCallback, values = []) {
    super(column, saveCallback, closeCallback);
    this.values = values;
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
        size: 6,
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
      this.values.map((option) =>
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

function valuesForSlot(slot) {
  if (!slot?.sources || !slot?.permissible_values) {
    return [];
  }

  const values = [];
  slot.sources.forEach((sourceName) => {
    const sourceValues = slot.permissible_values[sourceName];
    if (!sourceValues) {
      return;
    }

    Object.values(sourceValues).forEach((value) => {
      if (typeof value?.text === 'string' && value.text.length > 0) {
        values.push(value.text);
      }
    });
  });

  return values;
}

function cloneMatrix(matrix, columnCount) {
  if (!Array.isArray(matrix)) {
    return [];
  }

  return matrix.map((row) => {
    const next = Array.isArray(row) ? [...row] : [];
    while (next.length < columnCount) {
      next.push('');
    }
    return next.map(normalizeCellValue);
  });
}

export default class RevoGridAdapter {
  constructor(dataHarmonizer) {
    this.dataHarmonizer = dataHarmonizer;
    this.grid = null;
    this.rootElement = null;

    this.columns = [];
    this.columnProps = [];
    this.columnIndexByProp = {};
    this.columnSettings = [];

    this.matrixData = [];
    this.hiddenColumns = new Set();
    this.hiddenRows = new Set();

    this.selection = [[0, 0, 0, 0]];
    this.hooks = new Map();
    this.onceHooks = new Map();
    this.filterConditions = [];
    this.validationFeedbackElement = null;
  }

  isRevoGrid() {
    return true;
  }

  initialize(rootElement, options = {}) {
    const {
      data = [],
      slots = [],
      sections = [],
      hotOverrideSettings = {},
    } = options;

    ensureCustomElements();
    this.destroy();

    this.rootElement = rootElement;
    this.columnSettings = slots.map((slot) => ({
      name: slot.name,
      title: slot.title,
      required: slot.required,
      recommended: slot.recommended,
      source: slot.source,
      type: slot.type,
    }));

    this.columns = this.buildColumns(sections, slots);
    this.matrixData = cloneMatrix(data, slots.length);

    const grid = document.createElement('revo-grid');
    grid.classList.add('revo-grid-runtime');
    grid.style.width = '100%';
    grid.style.height = hotOverrideSettings.height || '75vh';
    grid.range = true;
    grid.useClipboard = true;
    grid.applyOnClose = true;
    grid.resize = true;
    grid.editors = { text: TextEditor };
    grid.columns = this.columns;
    grid.source = this.buildSourceRows();

    grid.addEventListener('afteredit', (event) => {
      this.handleAfterEdit(event);
    });

    if (this.rootElement) {
      this.rootElement.innerHTML = '';
      this.validationFeedbackElement = document.createElement('div');
      this.validationFeedbackElement.className = 'revo-validation-feedback';
      this.rootElement.appendChild(this.validationFeedbackElement);
      this.rootElement.appendChild(grid);
    }

    this.grid = grid;
    return this;
  }

  getEngine() {
    return this;
  }

  destroy() {
    if (this.grid?.parentNode) {
      this.grid.parentNode.removeChild(this.grid);
    }

    this.grid = null;
    this.matrixData = [];
    this.hiddenColumns.clear();
    this.hiddenRows.clear();
    this.selection = [[0, 0, 0, 0]];
    this.hooks.clear();
    this.onceHooks.clear();
    this.filterConditions = [];
    this.validationFeedbackElement = null;
  }

  renderValidationFeedback(invalidCells = {}) {
    if (!this.validationFeedbackElement) {
      return;
    }

    const invalidCount = Object.values(invalidCells).reduce(
      (count, rowErrors) => {
        if (!rowErrors || typeof rowErrors !== 'object') {
          return count;
        }

        return count + Object.keys(rowErrors).length;
      },
      0
    );

    if (invalidCount > 0) {
      this.validationFeedbackElement.classList.add('has-errors');
      this.validationFeedbackElement.textContent = `Validation found ${invalidCount} invalid cell${
        invalidCount === 1 ? '' : 's'
      } in this table.`;
      return;
    }

    this.validationFeedbackElement.classList.remove('has-errors');
    this.validationFeedbackElement.textContent = '';
  }

  buildColumns(sections, slots) {
    this.columnProps = [];
    this.columnIndexByProp = {};

    let columnIndex = 0;
    const groupedColumns = sections.map((section) => {
      const children = section.children.map((slot) => {
        const prop = `col_${columnIndex}`;
        this.columnProps[columnIndex] = prop;
        this.columnIndexByProp[prop] = columnIndex;
        const child = this.buildColumn(slot, columnIndex, prop);
        columnIndex += 1;
        return child;
      });

      return {
        name: section.title,
        children,
      };
    });

    while (columnIndex < slots.length) {
      const slot = slots[columnIndex];
      const prop = `col_${columnIndex}`;
      this.columnProps[columnIndex] = prop;
      this.columnIndexByProp[prop] = columnIndex;
      groupedColumns.push({
        name: slot.section_title || slot.name,
        children: [this.buildColumn(slot, columnIndex, prop)],
      });
      columnIndex += 1;
    }

    return groupedColumns;
  }

  buildColumn(slot, columnIndex, prop) {
    const possibleValues = valuesForSlot(slot);
    const editor = this.buildEditor(slot, possibleValues);

    return {
      name: slot.title,
      prop,
      readonly: slot.readonly === true,
      editor,
      cellTemplate: this.createCellTemplate(columnIndex),
    };
  }

  buildEditor(slot, values) {
    if (slot?.sources && slot?.multivalued === true) {
      return class RuntimeMultiValueEditor extends RevoMultiValueEditor {
        constructor(column, saveCallback, closeCallback) {
          super(column, saveCallback, closeCallback, values);
        }
      };
    }

    if (slot?.sources && values.length > 0) {
      return class RuntimeSelectEditor extends RevoSelectEditor {
        constructor(column, saveCallback, closeCallback) {
          super(column, saveCallback, closeCallback, values);
        }
      };
    }

    if (slot?.datatype === 'xsd:date') {
      return class RuntimeDateEditor extends RevoInputEditor {
        constructor(column, saveCallback, closeCallback) {
          super(column, saveCallback, closeCallback, 'date');
        }
      };
    }

    if (slot?.datatype === 'xsd:dateTime') {
      return class RuntimeDateTimeEditor extends RevoInputEditor {
        constructor(column, saveCallback, closeCallback) {
          super(column, saveCallback, closeCallback, 'datetime-local');
        }
      };
    }

    if (slot?.datatype === 'xsd:time') {
      return class RuntimeTimeEditor extends RevoInputEditor {
        constructor(column, saveCallback, closeCallback) {
          super(column, saveCallback, closeCallback, 'time');
        }
      };
    }

    return TextEditor;
  }

  createCellTemplate(columnIndex) {
    return (h, { model, value }) => {
      const row = model?.__rowIndex;
      const className = this.getInvalidClassName(row, columnIndex);
      return h(
        'div',
        {
          class: {
            [className]: className.length > 0,
          },
          'data-grid-row': String(row),
          'data-grid-col': String(columnIndex),
        },
        value ?? ''
      );
    };
  }

  getInvalidClassName(row, col) {
    const invalidCells = this.dataHarmonizer.invalid_cells;
    if (!invalidCells || typeof row !== 'number') {
      return '';
    }

    const rowErrors = invalidCells[row];
    if (!rowErrors || !Object.prototype.hasOwnProperty.call(rowErrors, col)) {
      return '';
    }

    return rowErrors[col] === 'This field is required'
      ? 'empty-invalid-cell'
      : 'invalid-cell';
  }

  buildSourceRows() {
    return this.matrixData.map((row, rowIndex) => {
      const sourceRow = {
        __rowIndex: rowIndex,
      };

      this.columnProps.forEach((prop, colIndex) => {
        sourceRow[prop] = normalizeCellValue(row[colIndex]);
      });

      return sourceRow;
    });
  }

  refreshSource() {
    if (!this.grid) {
      return;
    }

    this.grid.source = this.buildSourceRows();
    this.applyHiddenRows();
  }

  render() {
    if (!this.grid) {
      return;
    }

    this.grid.columns = [...this.columns];
    this.refreshSource();
  }

  loadData(data) {
    this.matrixData = cloneMatrix(data, this.columnProps.length);
    this.refreshSource();
  }

  getData(rowStart, colStart, rowEnd, colEnd) {
    if (typeof rowStart === 'undefined') {
      return this.matrixData.map((row) => [...row]);
    }

    const boundedStartRow = Math.max(0, rowStart);
    const boundedEndRow = Math.max(boundedStartRow, rowEnd);
    const boundedStartCol = Math.max(0, colStart);
    const boundedEndCol = Math.max(boundedStartCol, colEnd);

    const result = [];
    for (let row = boundedStartRow; row <= boundedEndRow; row += 1) {
      const sourceRow = this.matrixData[row] || [];
      const rowValues = [];
      for (let col = boundedStartCol; col <= boundedEndCol; col += 1) {
        rowValues.push(normalizeCellValue(sourceRow[col]));
      }
      result.push(rowValues);
    }

    return result;
  }

  getDataAtCell(row, col) {
    const sourceRow = this.matrixData[row] || [];
    return normalizeCellValue(sourceRow[col]);
  }

  getDataAtRow(row) {
    const sourceRow = this.matrixData[row] || [];
    return sourceRow.map(normalizeCellValue);
  }

  countRows() {
    return this.matrixData.length;
  }

  countCols() {
    return this.columnProps.length;
  }

  countSourceRows() {
    return this.matrixData.length;
  }

  isEmptyRow(row) {
    const sourceRow = this.matrixData[row];
    if (!sourceRow) {
      return true;
    }

    return sourceRow.every((value) => isEmptyUnitVal(value));
  }

  countEmptyRows(ending = undefined) {
    if (ending === true) {
      let trailingEmptyRows = 0;
      for (let row = this.matrixData.length - 1; row >= 0; row -= 1) {
        if (this.isEmptyRow(row)) {
          trailingEmptyRows += 1;
        } else {
          break;
        }
      }
      return trailingEmptyRows;
    }

    return this.matrixData.reduce(
      (count, _, rowIndex) => count + (this.isEmptyRow(rowIndex) ? 1 : 0),
      0
    );
  }

  setDataAtCell(rowOrChanges, col, value, source = 'edit') {
    let changes;

    if (Array.isArray(rowOrChanges)) {
      if (Array.isArray(rowOrChanges[0])) {
        changes = rowOrChanges.map((change) => [
          Number(change[0]),
          Number(change[1]),
          normalizeCellValue(change[2]),
        ]);
      } else {
        changes = [
          [Number(rowOrChanges[0]), Number(col), normalizeCellValue(value)],
        ];
      }
    } else {
      changes = [
        [Number(rowOrChanges), Number(col), normalizeCellValue(value)],
      ];
    }

    const appliedChanges = [];

    changes.forEach(([row, colIndex, nextValue]) => {
      this.ensureRow(row);
      const previousValue = this.getDataAtCell(row, colIndex);
      this.matrixData[row][colIndex] = normalizeCellValue(nextValue);
      appliedChanges.push([row, colIndex, previousValue, nextValue]);
    });

    this.refreshSource();
    this.triggerHooks('afterChange', appliedChanges, source);
  }

  setSourceDataAtCell(row, col, value) {
    this.setDataAtCell(row, col, value, 'edit');
  }

  ensureRow(row) {
    while (this.matrixData.length <= row) {
      this.matrixData.push(Array(this.columnProps.length).fill(''));
    }
  }

  alter(action, indexOrRows, amount = 1) {
    if (action === 'remove_row') {
      const rows = Array.isArray(indexOrRows)
        ? [...indexOrRows]
        : [Number(indexOrRows)];
      rows
        .filter((row) => Number.isInteger(row) && row >= 0)
        .sort((a, b) => b - a)
        .forEach((row) => {
          if (row < this.matrixData.length) {
            this.matrixData.splice(row, 1);
          }
        });
      this.refreshSource();
      return;
    }

    if (action === 'insert_row_above' || action === 'insert_row_below') {
      const insertionIndex = Math.max(0, Number(indexOrRows) || 0);
      const count = Math.max(1, Number(amount) || 1);
      const rows = Array.from({ length: count }, () =>
        Array(this.columnProps.length).fill('')
      );
      this.matrixData.splice(insertionIndex, 0, ...rows);
      this.refreshSource();
    }
  }

  batchRender(fn) {
    if (typeof fn === 'function') {
      fn();
    }
    this.render();
  }

  addHook(name, callback) {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name).push(callback);
  }

  addHookOnce(name, callback) {
    if (!this.onceHooks.has(name)) {
      this.onceHooks.set(name, []);
    }
    this.onceHooks.get(name).push(callback);
  }

  runHooks(name, ...args) {
    this.triggerHooks(name, ...args);
  }

  triggerHooks(name, ...args) {
    const handlers = this.hooks.get(name) || [];
    handlers.forEach((handler) => {
      handler(...args);
    });

    const onceHandlers = this.onceHooks.get(name) || [];
    onceHandlers.forEach((handler) => {
      handler(...args);
    });
    this.onceHooks.set(name, []);
  }

  handleAfterEdit(event) {
    const detail = event?.detail || {};
    const model = detail.model;
    const prop = detail.prop;

    if (!model || typeof prop !== 'string') {
      return;
    }

    const row = Number(model.__rowIndex);
    const col = this.columnIndexByProp[prop];
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
      return;
    }

    const previousValue = this.getDataAtCell(row, col);
    const nextValue = normalizeCellValue(model[prop]);
    this.matrixData[row][col] = nextValue;
    this.selection = [[row, col, row, col]];

    this.triggerHooks('afterSelection', row, col, row, col);
    this.triggerHooks(
      'afterChange',
      [[row, col, previousValue, nextValue]],
      'edit'
    );
  }

  getSelected() {
    return this.selection;
  }

  selectCell(row, col, row2 = row, col2 = col) {
    this.selection = [[row, col, row2, col2]];
    if (this.grid?.setCellsFocus) {
      this.grid.setCellsFocus(
        { x: col, y: row },
        { x: col2, y: row2 },
        'rgCol',
        'rgRow'
      );
    }
  }

  scrollViewportTo(row, col) {
    this.selectCell(row, col, row, col);
  }

  getSettings() {
    return {
      columns: this.columnSettings,
    };
  }

  updateSettings(settings = {}) {
    if (Array.isArray(settings.columns)) {
      this.columnSettings = settings.columns.map((column, index) => ({
        ...(this.columnSettings[index] || {}),
        ...column,
      }));

      const slots = this.dataHarmonizer.slots.map((slot, index) => ({
        ...slot,
        ...this.columnSettings[index],
      }));

      this.columns = this.buildColumns(this.dataHarmonizer.sections, slots);
      this.render();
    }
  }

  undo() {
    // Deliberately omitted in runtime-v1 for the bounded RevoGrid path.
  }

  getPlugin(name) {
    if (name === 'hiddenColumns') {
      return {
        hideColumns: (columns) => {
          columns.forEach((column) => this.hiddenColumns.add(column));
          this.applyHiddenColumns();
        },
        showColumns: (columns) => {
          columns.forEach((column) => this.hiddenColumns.delete(column));
          this.applyHiddenColumns();
        },
        getHiddenColumns: () => [...this.hiddenColumns],
      };
    }

    if (name === 'hiddenRows') {
      return {
        hideRows: (rows) => {
          rows.forEach((row) => this.hiddenRows.add(row));
          this.applyHiddenRows();
        },
        showRows: (rows) => {
          rows.forEach((row) => this.hiddenRows.delete(row));
          this.applyHiddenRows();
        },
        getHiddenRows: () => [...this.hiddenRows],
      };
    }

    if (name === 'filters') {
      return {
        clearConditions: () => {
          this.filterConditions = [];
        },
        addCondition: (columnOrFn, operator, value) => {
          this.filterConditions.push([columnOrFn, operator, value]);
        },
        filter: () => {
          this.hiddenRows.clear();
          this.matrixData.forEach((rowData, rowIndex) => {
            const passesAllConditions = this.filterConditions.every(
              ([columnOrFn, operator, value]) => {
                if (typeof columnOrFn === 'function') {
                  return Boolean(columnOrFn(rowIndex));
                }

                const cellValue = rowData[columnOrFn];
                if (operator === 'eq') {
                  return String(cellValue) === String(value);
                }

                return true;
              }
            );

            if (!passesAllConditions) {
              this.hiddenRows.add(rowIndex);
            }
          });
          this.applyHiddenRows();
        },
      };
    }

    return {
      hideColumns: () => {},
      showColumns: () => {},
      getHiddenColumns: () => [],
      hideRows: () => {},
      showRows: () => {},
      getHiddenRows: () => [],
      clearConditions: () => {},
      addCondition: () => {},
      filter: () => {},
    };
  }

  applyHiddenColumns() {
    if (!this.grid) {
      return;
    }

    const activeSections = this.columns
      .map((section) => ({
        ...section,
        children: section.children.filter((child) => {
          const colIndex = this.columnIndexByProp[child.prop];
          return !this.hiddenColumns.has(colIndex);
        }),
      }))
      .filter((section) => section.children.length > 0);

    this.grid.columns = activeSections;
    this.refreshSource();
  }

  applyHiddenRows() {
    if (!this.grid) {
      return;
    }

    const trimmedRows = {};
    this.hiddenRows.forEach((rowIndex) => {
      trimmedRows[rowIndex] = true;
    });
    this.grid.trimmedRows = trimmedRows;
  }
}
