import path from 'node:path';
import { spawn } from 'node:child_process';

const DEFAULT_TEMPLATE = 'canada_covid19/CanCOGeN_Covid-19';
const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '8080', 10);
const HOST = process.env.HOST ?? '127.0.0.1';

const experiments = {
  default: {
    description: 'Standard DataHarmonizer runtime.',
    params: {
      template: DEFAULT_TEMPLATE,
    },
  },
  tabular: {
    description: 'Main app with valid CSV example input preloaded.',
    params: {
      template: DEFAULT_TEMPLATE,
      exampleInput: 'validTestData_2-1-2.csv',
    },
  },
  validation: {
    description:
      'Main app with invalid CSV example input preloaded and validation run automatically.',
    params: {
      template: DEFAULT_TEMPLATE,
      exampleInput: 'invalidTestData_1-0-0.csv',
      validate: '1',
    },
  },
  tabulator: {
    description: 'Tabulator spike harness.',
    params: {
      template: DEFAULT_TEMPLATE,
      gridEngine: 'tabulator',
      gridSpike: '1',
    },
  },
  revogrid: {
    description: 'RevoGrid spike harness.',
    params: {
      template: DEFAULT_TEMPLATE,
      gridEngine: 'revogrid',
      gridSpike: '1',
    },
  },
};

function getWebpackBin() {
  const binaryName = process.platform === 'win32' ? 'webpack.cmd' : 'webpack';
  return path.resolve('node_modules', '.bin', binaryName);
}

function printUsage() {
  const availableTargets = Object.keys(experiments).join(', ');
  console.error(
    `Usage: node script/dev-experiment.mjs <target>\nAvailable targets: ${availableTargets}`
  );
}

const target = process.argv[2] ?? 'default';
const experiment = experiments[target];

if (!experiment) {
  printUsage();
  process.exit(1);
}

const params = new URLSearchParams(experiment.params);
const url = `http://${HOST}:${DEFAULT_PORT}/?${params.toString()}`;

console.log(`${experiment.description}\nOpen ${url}\n`);

const child = spawn(
  getWebpackBin(),
  [
    'serve',
    '--mode=development',
    '--config',
    'web/webpack.config.js',
    '--port',
    String(DEFAULT_PORT),
    '--host',
    HOST,
  ],
  {
    stdio: 'inherit',
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
