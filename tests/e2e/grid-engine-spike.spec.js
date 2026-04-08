/* eslint-env node */
const { test, expect } = require('@playwright/test');

const HOST_TEMPLATE = 'canada_covid19/CanCOGeN_Covid-19';

async function loadSpikeReport(page, gridEngine) {
  await page.goto(
    `/?template=${encodeURIComponent(
      HOST_TEMPLATE
    )}&gridEngine=${gridEngine}&gridSpike=1`
  );

  await page.waitForFunction(
    () => window.__GRID_ENGINE_SPIKE__ && window.__GRID_ENGINE_SPIKE__.verdict
  );

  return page.evaluate(() => window.__GRID_ENGINE_SPIKE__);
}

test('Tabulator spike stays rejected on the audited hard behaviors', async ({
  page,
}) => {
  const report = await loadSpikeReport(page, 'tabulator');

  expect(report.candidate).toBe('tabulator');
  expect(report.verdict).toBe('no-go');
  expect(report.passCount).toBe(6);
  expect(report.failedKeys).toEqual(
    expect.arrayContaining(['spreadsheet-paste', 'hidden-state-filtering'])
  );
});

test('RevoGrid spike clears the audited hard-behavior gate', async ({
  page,
}) => {
  const report = await loadSpikeReport(page, 'revogrid');

  expect(report.candidate).toBe('revogrid');
  expect(report.verdict).toBe('go');
  expect(report.passCount).toBe(8);
  expect(report.failedKeys).toEqual([]);
});
