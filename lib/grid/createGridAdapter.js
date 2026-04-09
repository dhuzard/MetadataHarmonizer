import { DEFAULT_GRID_ENGINE, GRID_ENGINE_REVOGRID } from '../utils/gridEngine';

import HandsontableAdapter from './HandsontableAdapter';
import RevoGridAdapter from './RevoGridAdapter';

export function createGridAdapter(
  gridEngine = DEFAULT_GRID_ENGINE,
  dataHarmonizer
) {
  if (gridEngine === GRID_ENGINE_REVOGRID) {
    return new RevoGridAdapter(dataHarmonizer);
  }

  return new HandsontableAdapter();
}
