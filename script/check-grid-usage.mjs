/* eslint-env node */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectHotLines } from './grid-engine-audit-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(
  repoRoot,
  'docs',
  'grid-engine',
  'hot-surface-audit.json'
);

const baselineAudit = JSON.parse(readFileSync(baselinePath, 'utf8'));
const currentHotLines = collectHotLines(repoRoot);

const signatureFor = ({ file, method, source }) =>
  `${file}::${method}::${source}`;

const baselineSignatures = new Set(
  baselineAudit.files.flatMap(({ file, callsites }) =>
    callsites.map(({ method, source }) =>
      signatureFor({ file, method, source })
    )
  )
);

const currentSignatures = new Set(currentHotLines.map(signatureFor));

const newCallsites = currentHotLines.filter(
  (entry) => !baselineSignatures.has(signatureFor(entry))
);

const removedCount = [...baselineSignatures].filter(
  (signature) => !currentSignatures.has(signature)
).length;

if (newCallsites.length > 0) {
  console.error(
    'New raw `.hot` accesses were introduced outside the frozen migration baseline.'
  );
  console.error(
    'Route new grid behavior through the audited compatibility surface instead of expanding direct engine coupling.'
  );
  console.error('');

  for (const entry of newCallsites) {
    console.error(
      `- ${entry.file}:${entry.line} [${entry.bucket}] ${entry.method} -> ${entry.source}`
    );
  }

  process.exit(1);
}

console.log(
  `Grid hot-surface guard passed: ${currentHotLines.length} direct callsites within the frozen baseline.`
);

if (removedCount > 0) {
  console.log(
    `${removedCount} baseline callsite(s) are no longer present. Regenerate docs/grid-engine/hot-surface-audit.* when you want to ratchet the baseline down.`
  );
}
