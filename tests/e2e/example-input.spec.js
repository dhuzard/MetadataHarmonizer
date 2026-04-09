/* eslint-env node */
const { test, expect } = require('@playwright/test');

const DEFAULT_TEMPLATE = 'canada_covid19/CanCOGeN_Covid-19';

test('bundled example input can be preloaded from the URL', async ({
  page,
}) => {
  await page.goto(
    `/?template=${encodeURIComponent(
      DEFAULT_TEMPLATE
    )}&exampleInput=validTestData_2-1-2.csv`
  );

  await expect(page.locator('html')).toHaveAttribute(
    'data-example-input-loaded',
    'true'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-example-input-error',
    'false'
  );
  await expect(page.locator('#file_name_display')).toHaveText(
    'validTestData_2-1-2.csv'
  );

  const report = await page.evaluate(
    () => window.__DATAHARMONIZER_EXAMPLE_INPUT__
  );
  const firstTable = Object.values(report.tables)[0];
  expect(report.loaded).toBe(true);
  expect(firstTable.nonEmptyRowCount).toBeGreaterThan(0);
});

test('bundled example input can auto-validate from the URL', async ({
  page,
}) => {
  await page.goto(
    `/?template=${encodeURIComponent(
      DEFAULT_TEMPLATE
    )}&exampleInput=invalidTestData_1-0-0.csv&validate=1`
  );

  await expect(page.locator('html')).toHaveAttribute(
    'data-example-input-validated',
    'true'
  );
  await expect(page.locator('#example-input-status')).toContainText(
    'Validation ran automatically.'
  );

  const report = await page.evaluate(
    () => window.__DATAHARMONIZER_EXAMPLE_INPUT__
  );
  expect(report.validated).toBe(true);
  expect(report.error).toBeNull();
  expect(Object.values(report.tables).length).toBeGreaterThan(0);
});
