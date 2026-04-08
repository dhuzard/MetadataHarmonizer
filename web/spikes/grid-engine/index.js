import {
  createSpikeRoot,
  getGridSpikeConfig,
  renderSpikeSummary,
  updateSpikeVerdict,
} from './shared';

export async function maybeMountGridEngineSpike(context, anchor) {
  const spikeConfig = getGridSpikeConfig();
  if (!spikeConfig.enabled) {
    return null;
  }

  const requestedEngine = context.appConfig.requestedGridEngine;
  if (!['tabulator', 'revogrid'].includes(requestedEngine)) {
    return null;
  }

  const root = createSpikeRoot(anchor);
  renderSpikeSummary(
    root,
    '<p class="mb-0 text-muted">Preparing candidate grid harness…</p>'
  );
  updateSpikeVerdict(root, 'Loading', 'secondary');

  if (requestedEngine === 'tabulator') {
    const { mountTabulatorSpike } = await import('./tabulatorSpike');
    return mountTabulatorSpike(root, context);
  }

  const { mountRevoGridSpike } = await import('./revoGridSpike');
  return mountRevoGridSpike(root, context);
}
