export const GRID_SPIKE_QUERY_PARAM = 'gridSpike';
export const GRID_SPIKE_QUERY_VALUE = '1';

export const HARD_BEHAVIORS = Object.freeze([
  {
    key: 'enum-dropdown-editing',
    label: 'Controlled vocabulary / enum dropdown editing',
    buckets: ['mutation/editing', 'plugin/state features'],
    critical: true,
  },
  {
    key: 'multivalue-workflow',
    label: 'Multivalue workflow compatibility',
    buckets: ['mutation/editing', 'plugin/state features'],
    critical: true,
  },
  {
    key: 'validation-repaint',
    label: 'Invalid-cell highlighting after validation and repaint timing',
    buckets: ['selection/navigation/render lifecycle', 'plugin/state features'],
    critical: true,
  },
  {
    key: 'spreadsheet-paste',
    label: 'Paste from spreadsheet tools',
    buckets: ['mutation/editing', 'selection/navigation/render lifecycle'],
    critical: true,
  },
  {
    key: 'nested-headers',
    label: 'Grouped / nested headers',
    buckets: ['plugin/state features'],
    critical: false,
  },
  {
    key: 'hidden-state-filtering',
    label: 'Hidden rows / hidden columns plus dependent filtering',
    buckets: ['plugin/state features', 'selection/navigation/render lifecycle'],
    critical: true,
  },
  {
    key: 'temporal-editing',
    label: 'Date / datetime / time editing',
    buckets: ['mutation/editing', 'plugin/state features'],
    critical: true,
  },
  {
    key: 'row-identity',
    label: 'Row insertion / deletion with stable row identity',
    buckets: ['mutation/editing', 'selection/navigation/render lifecycle'],
    critical: true,
  },
]);

export const STATUS_VALUES = Object.freeze([
  'pending',
  'ready',
  'complete',
]);

export const MULTIVALUE_VALUES = Object.freeze([
  'cough',
  'fever',
  'fatigue',
  'headache',
]);

export const PARENT_ROWS = Object.freeze([
  {
    id: 'parent-1',
    displayId: 'P-001',
    parentKey: 'alpha',
    status: 'pending',
    symptoms: 'cough; fever',
    collectionDate: '2026-02-01',
    collectionDateTime: '2026-02-01T09:15',
    collectionTime: '09:15',
    quantity: '3',
  },
  {
    id: 'parent-2',
    displayId: 'P-002',
    parentKey: 'beta',
    status: 'ready',
    symptoms: 'fatigue',
    collectionDate: '2026-02-02',
    collectionDateTime: '2026-02-02T11:30',
    collectionTime: '11:30',
    quantity: '',
  },
]);

export const CHILD_ROWS = Object.freeze([
  {
    id: 'child-1',
    parentId: 'parent-1',
    childCode: 'C-001',
    status: 'pending',
    quantity: '1',
    note: 'alpha first child',
  },
  {
    id: 'child-2',
    parentId: 'parent-1',
    childCode: 'C-002',
    status: 'ready',
    quantity: '2',
    note: 'alpha hidden candidate',
  },
  {
    id: 'child-3',
    parentId: 'parent-2',
    childCode: 'C-003',
    status: 'complete',
    quantity: '5',
    note: 'beta child',
  },
]);

export function cloneRows(rows) {
  return JSON.parse(JSON.stringify(rows));
}

export function getGridSpikeConfig() {
  const params = new URLSearchParams(window.location.search);
  return {
    enabled: params.get(GRID_SPIKE_QUERY_PARAM) === GRID_SPIKE_QUERY_VALUE,
    mode: params.get(GRID_SPIKE_QUERY_PARAM),
  };
}

export function wait(ms = 0) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function createSpikeRoot(anchor) {
  const existing = document.querySelector('#grid-engine-spike');
  if (existing) {
    existing.remove();
  }

  const root = document.createElement('section');
  root.id = 'grid-engine-spike';
  root.className = 'alert alert-light border';
  root.dataset.spikeStatus = 'loading';
  root.innerHTML = `
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
      <div>
        <h2 class="h5 mb-1">Grid Engine Feasibility Spike</h2>
        <p class="mb-2 text-muted">
          Review-only candidate harness. Handsontable remains the default runtime.
        </p>
      </div>
      <div class="text-right">
        <span id="grid-engine-spike-verdict" class="badge badge-secondary">Running</span>
      </div>
    </div>
    <div id="grid-engine-spike-summary" class="mb-3"></div>
    <div id="grid-engine-spike-panels"></div>
    <div id="grid-engine-spike-scorecard" class="table-responsive mt-3"></div>
  `;

  anchor.before(root);
  return root;
}

export function updateSpikeVerdict(root, label, tone) {
  const verdict = root.querySelector('#grid-engine-spike-verdict');
  verdict.textContent = label;
  verdict.className = `badge badge-${tone}`;
}

export function renderSpikeSummary(root, summaryHtml) {
  root.querySelector('#grid-engine-spike-summary').innerHTML = summaryHtml;
}

export function renderSpikePanels(root, panelMarkup) {
  root.querySelector('#grid-engine-spike-panels').innerHTML = panelMarkup;
}

export function renderScorecard(root, report) {
  const rows = report.behaviors
    .map(
      (behavior) => `
        <tr data-behavior-key="${behavior.key}">
          <th scope="row">${behavior.label}</th>
          <td>${behavior.buckets.join(', ')}</td>
          <td>${behavior.supportPath}</td>
          <td>${behavior.complexity}</td>
          <td>${behavior.risk}</td>
          <td>
            <span class="badge badge-${
              behavior.status === 'pass' ? 'success' : 'danger'
            }">
              ${behavior.status}
            </span>
          </td>
          <td>${behavior.notes}</td>
        </tr>
      `
    )
    .join('');

  root.querySelector('#grid-engine-spike-scorecard').innerHTML = `
    <table class="table table-sm table-bordered">
      <thead class="thead-light">
        <tr>
          <th>Behavior</th>
          <th>Audit Buckets</th>
          <th>Support Path</th>
          <th>Complexity</th>
          <th>Key Risk</th>
          <th>Spike</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function finalizeReport(root, report) {
  const passCount = report.behaviors.filter(
    (behavior) => behavior.status === 'pass'
  ).length;
  const criticalFailures = report.behaviors.filter(
    (behavior) => behavior.critical && behavior.status !== 'pass'
  );

  report.passCount = passCount;
  report.failedKeys = report.behaviors
    .filter((behavior) => behavior.status !== 'pass')
    .map((behavior) => behavior.key);
  report.verdict =
    passCount >= 7 && criticalFailures.length === 0 ? 'go' : 'no-go';

  root.dataset.spikeStatus = 'ready';
  updateSpikeVerdict(
    root,
    report.verdict === 'go' ? 'Candidate Viable' : 'Candidate Rejected',
    report.verdict === 'go' ? 'success' : 'danger'
  );

  window.__GRID_ENGINE_SPIKE__ = report;
  renderScorecard(root, report);

  return report;
}

export function findBehaviorMeta(key) {
  return HARD_BEHAVIORS.find((behavior) => behavior.key === key);
}

export function createBehaviorResult({
  key,
  supportPath,
  complexity,
  risk,
  status,
  notes,
}) {
  const meta = findBehaviorMeta(key);

  return {
    key,
    label: meta.label,
    buckets: meta.buckets,
    critical: meta.critical,
    supportPath,
    complexity,
    risk,
    status,
    notes,
  };
}
