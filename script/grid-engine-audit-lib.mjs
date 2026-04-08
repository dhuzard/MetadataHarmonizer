import { execFileSync } from 'node:child_process';
import { HOT_METHOD_BUCKETS } from './grid-engine-audit-config.mjs';

export function runRg(repoRoot, args) {
  const output = execFileSync('rg', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  return output.length > 0 ? output.split('\n') : [];
}

export function parseMatch(line) {
  const match = line.match(/^(.*?):(\d+):(.*)$/);
  if (!match) {
    return null;
  }

  return {
    file: match[1],
    line: Number(match[2]),
    source: match[3].trim(),
  };
}

export function normalizeSource(source) {
  return source.replace(/\s+/g, ' ').trim();
}

export function classifyMethod(method) {
  return HOT_METHOD_BUCKETS[method] || 'unclassified';
}

export function collectHotLines(repoRoot) {
  return runRg(repoRoot, ['-n', '\\.hot\\.', 'lib', 'web'])
    .map(parseMatch)
    .filter(Boolean)
    .filter((entry) => !entry.source.match(/^(?:\/\/|\*|\/\*)/))
    .map((entry) => {
      const methodMatch = entry.source.match(/\.hot\.([A-Za-z0-9_]+)/);
      const method = methodMatch ? methodMatch[1] : 'unknown';
      return {
        ...entry,
        source: normalizeSource(entry.source),
        method,
        bucket: classifyMethod(method),
      };
    });
}

export function collectExporterLines(repoRoot) {
  return runRg(repoRoot, ['-n', 'getTrimmedData\\(', 'web/templates'])
    .map(parseMatch)
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      source: normalizeSource(entry.source),
    }));
}

export function pluralize(word, count) {
  if (count !== 1 && word.endsWith('y')) {
    return `${count} ${word.slice(0, -1)}ies`;
  }
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
