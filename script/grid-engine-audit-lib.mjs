import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { HOT_METHOD_BUCKETS } from './grid-engine-audit-config.mjs';

const SCANNABLE_EXTENSIONS = new Set(['.js', '.mjs']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist']);

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function listScannableFiles(rootDir) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) {
        continue;
      }

      const fullPath = path.join(current, entry);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (!stats.isFile()) {
        continue;
      }

      if (SCANNABLE_EXTENSIONS.has(path.extname(fullPath))) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

function fallbackSearch(repoRoot, pattern, targetPaths) {
  const matcher = new RegExp(pattern);
  const matches = [];

  for (const targetPath of targetPaths) {
    const absoluteTargetPath = path.resolve(repoRoot, targetPath);
    const files = listScannableFiles(absoluteTargetPath);

    for (const filePath of files) {
      let content;
      try {
        content = readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      const lines = content.split(/\r?\n/);
      const relativeFilePath = toPosixPath(path.relative(repoRoot, filePath));

      for (let index = 0; index < lines.length; index += 1) {
        if (matcher.test(lines[index])) {
          matches.push(`${relativeFilePath}:${index + 1}:${lines[index]}`);
        }
      }
    }
  }

  return matches;
}

export function runRg(repoRoot, args) {
  try {
    const output = execFileSync('rg', args, {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    return output.length > 0 ? output.split('\n') : [];
  } catch (error) {
    if (error?.code === 'ENOENT') {
      const [, pattern, ...targetPaths] = args;
      return fallbackSearch(repoRoot, pattern, targetPaths);
    }

    if (error?.status === 1) {
      return [];
    }

    throw error;
  }
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
