/* eslint-env node */
const { test, expect } = require('@playwright/test');

const RUNTIME_TEMPLATE = 'canada_covid19/CanCOGeNCovid19';
const SECOND_RUNTIME_TEMPLATE = 'phac_dexa/PHACDexa';

test('handsontable remains the default runtime path', async ({ page }) => {
  await page.goto(`/?template=${encodeURIComponent(RUNTIME_TEMPLATE)}`);

  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-active',
    'handsontable'
  );
  await expect(page.locator('.handsontable').first()).toBeVisible();
});

test('revogrid bounded runtime path supports edit and validation feedback', async ({
  page,
}) => {
  await page.goto(
    `/?template=${encodeURIComponent(RUNTIME_TEMPLATE)}&gridEngine=revogrid`
  );

  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-requested',
    'revogrid'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-active',
    'revogrid'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-implemented',
    'true'
  );
  await expect(page.locator('revo-grid.revo-grid-runtime')).toBeVisible();

  const result = await page.evaluate(async () => {
    const context = window.__DATAHARMONIZER_APP_CONTEXT__;
    if (!context) {
      throw new Error('Missing app context runtime object.');
    }

    const dh = context.getCurrentDataHarmonizer();
    const textCol = dh.slots.findIndex(
      (slot) => !slot.sources && slot.multivalued !== true
    );
    const selectCol = dh.slots.findIndex(
      (slot) =>
        Array.isArray(slot.sources) &&
        slot.sources.length > 0 &&
        !slot.multivalued
    );
    const requiredCol = dh.slots.findIndex((slot) => slot.required === true);

    if (textCol < 0 || selectCol < 0 || requiredCol < 0) {
      throw new Error(
        'Template is missing a required bounded runtime test field.'
      );
    }

    const sourceName = dh.slots[selectCol].sources[0];
    const sourceValues = Object.values(
      dh.slots[selectCol].permissible_values?.[sourceName] || {}
    );
    const controlledValue = sourceValues.find((item) => item?.text)?.text;
    if (!controlledValue) {
      throw new Error(
        'No controlled-value option available for bounded runtime test.'
      );
    }

    dh.setCellValue(0, textCol, 'runtime-adapter-seam', 'test');
    dh.setCellValue(0, selectCol, controlledValue, 'test');

    // Keep positive edit assertions stable if the required field overlaps
    // with the edited text/controlled columns.
    const requiredOverlapsEditedField =
      requiredCol === textCol || requiredCol === selectCol;
    const invalidRow = requiredOverlapsEditedField ? 1 : 0;

    if (requiredOverlapsEditedField) {
      const seedCol = requiredCol === textCol ? selectCol : textCol;
      const seedValue =
        seedCol === selectCol ? controlledValue : 'runtime-seed';
      dh.setCellValue(invalidRow, seedCol, seedValue, 'test');
    }

    dh.setCellValue(invalidRow, requiredCol, '', 'test');

    await dh.validate();

    const feedbackElement = document.querySelector(
      '.revo-validation-feedback.has-errors'
    );
    const hasInvalidCells =
      Object.keys(dh.invalid_cells || {}).length > 0 &&
      Object.values(dh.invalid_cells || {}).some(
        (rowErrors) => Object.keys(rowErrors || {}).length > 0
      );

    return {
      textValue: dh.getCellValue(0, textCol),
      controlledValue: dh.getCellValue(0, selectCol),
      hasInvalidFeedback: Boolean(feedbackElement),
      hasInvalidCells,
    };
  });

  expect(result.textValue).toBe('runtime-adapter-seam');
  expect(result.controlledValue.length).toBeGreaterThan(0);
  expect(result.hasInvalidCells).toBe(true);
  expect(result.hasInvalidFeedback).toBe(true);
});

test('revogrid second bounded runtime path supports edit and validation feedback', async ({
  page,
}) => {
  await page.goto(
    `/?template=${encodeURIComponent(
      SECOND_RUNTIME_TEMPLATE
    )}&gridEngine=revogrid`
  );

  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-requested',
    'revogrid'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-active',
    'revogrid'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-implemented',
    'true'
  );
  await expect(page.locator('revo-grid.revo-grid-runtime')).toBeVisible();

  const result = await page.evaluate(async () => {
    const context = window.__DATAHARMONIZER_APP_CONTEXT__;
    if (!context) {
      throw new Error('Missing app context runtime object.');
    }

    const dh = context.getCurrentDataHarmonizer();
    const textCol = dh.slots.findIndex(
      (slot) => !slot.sources && slot.multivalued !== true
    );
    const selectCol = dh.slots.findIndex(
      (slot) =>
        Array.isArray(slot.sources) &&
        slot.sources.length > 0 &&
        !slot.multivalued
    );
    const requiredCol = dh.slots.findIndex((slot) => slot.required === true);

    if (textCol < 0 || selectCol < 0 || requiredCol < 0) {
      throw new Error(
        'Template is missing a required bounded runtime test field.'
      );
    }

    const sourceName = dh.slots[selectCol].sources[0];
    const sourceValues = Object.values(
      dh.slots[selectCol].permissible_values?.[sourceName] || {}
    );
    const controlledValue = sourceValues.find((item) => item?.text)?.text;
    if (!controlledValue) {
      throw new Error(
        'No controlled-value option available for bounded runtime test.'
      );
    }

    dh.setCellValue(0, textCol, 'runtime-adapter-seam-v2', 'test');
    dh.setCellValue(0, selectCol, controlledValue, 'test');

    const requiredOverlapsEditedField =
      requiredCol === textCol || requiredCol === selectCol;
    const invalidRow = requiredOverlapsEditedField ? 1 : 0;

    if (requiredOverlapsEditedField) {
      const seedCol = requiredCol === textCol ? selectCol : textCol;
      const seedValue =
        seedCol === selectCol ? controlledValue : 'runtime-seed';
      dh.setCellValue(invalidRow, seedCol, seedValue, 'test');
    }

    dh.setCellValue(invalidRow, requiredCol, '', 'test');

    await dh.validate();

    const feedbackElement = document.querySelector(
      '.revo-validation-feedback.has-errors'
    );
    const hasInvalidCells =
      Object.keys(dh.invalid_cells || {}).length > 0 &&
      Object.values(dh.invalid_cells || {}).some(
        (rowErrors) => Object.keys(rowErrors || {}).length > 0
      );

    return {
      textValue: dh.getCellValue(0, textCol),
      controlledValue: dh.getCellValue(0, selectCol),
      hasInvalidFeedback: Boolean(feedbackElement),
      hasInvalidCells,
    };
  });

  expect(result.textValue).toBe('runtime-adapter-seam-v2');
  expect(result.controlledValue.length).toBeGreaterThan(0);
  expect(result.hasInvalidCells).toBe(true);
  expect(result.hasInvalidFeedback).toBe(true);
});
