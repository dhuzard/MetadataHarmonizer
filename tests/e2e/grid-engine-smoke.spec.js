/* eslint-env node */
const { test, expect } = require('@playwright/test');

const DEFAULT_TEMPLATE = 'canada_covid19/CanCOGeN_Covid-19';

function getRequestedGridEngines() {
  return (process.env.PLAYWRIGHT_GRID_ENGINES || 'handsontable')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

for (const gridEngine of getRequestedGridEngines()) {
  test(`app boots with requested grid engine "${gridEngine}"`, async ({
    page,
  }) => {
    await page.goto(
      `/?template=${encodeURIComponent(
        DEFAULT_TEMPLATE
      )}&gridEngine=${gridEngine}`
    );

    await expect(page.locator('#file-menu-button')).toBeVisible();
    await expect(page.locator('#validate-btn')).toBeVisible();
    await expect(
      page.locator('#data-harmonizer-tabs .nav-link').first()
    ).toBeVisible();
    await expect(
      page.locator('#data-harmonizer-grid .data-harmonizer-grid').first()
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-grid-engine-requested',
      gridEngine
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-grid-engine-active',
      /(handsontable|tabulator|revogrid)/
    );
  });
}

test('candidate grid engines stay behind the spike fallback path until implemented', async ({
  page,
}) => {
  await page.goto(
    `/?template=${encodeURIComponent(DEFAULT_TEMPLATE)}&gridEngine=tabulator`
  );

  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-requested',
    'tabulator'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-active',
    'handsontable'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-grid-engine-implemented',
    'false'
  );
  await expect(page.locator('#grid-engine-status')).toContainText(
    'requested tabulator'
  );
});
