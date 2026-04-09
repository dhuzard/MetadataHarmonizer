const { execFileSync } = require('child_process');
const path = require('path');

describe('portable grid guard fallback', () => {
  it('passes without rg on PATH by using Node fallback scanning', () => {
    const repoRoot = path.resolve(__dirname, '..');

    const output = execFileSync(
      process.execPath,
      ['script/check-grid-usage.mjs'],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          PATH: '',
        },
        encoding: 'utf8',
      }
    );

    expect(output).toContain('Grid hot-surface guard passed:');
  });
});
