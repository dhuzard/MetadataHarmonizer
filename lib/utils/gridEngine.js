export const GRID_ENGINE_HANDSONTABLE = 'handsontable';
export const GRID_ENGINE_TABULATOR = 'tabulator';
export const GRID_ENGINE_REVOGRID = 'revogrid';

export const GRID_ENGINES = Object.freeze([
  GRID_ENGINE_HANDSONTABLE,
  GRID_ENGINE_TABULATOR,
  GRID_ENGINE_REVOGRID,
]);

export const IMPLEMENTED_GRID_ENGINES = Object.freeze([
  GRID_ENGINE_HANDSONTABLE,
]);

export const DEFAULT_GRID_ENGINE = GRID_ENGINE_HANDSONTABLE;

export function normalizeGridEngine(value) {
  if (typeof value !== 'string') {
    return DEFAULT_GRID_ENGINE;
  }

  const normalized = value.trim().toLowerCase();
  if (GRID_ENGINES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_GRID_ENGINE;
}

export function resolveGridEngine(value) {
  const requested = normalizeGridEngine(value);
  const implemented = IMPLEMENTED_GRID_ENGINES.includes(requested);

  return {
    requested,
    active: implemented ? requested : DEFAULT_GRID_ENGINE,
    implemented,
  };
}

export function getGridEngineInScope() {
  if (!window.URLSearchParams) {
    const match = location.search.match(/(?:^|[?&])gridEngine=([^&]+)/);
    return normalizeGridEngine(match?.[1]);
  }

  const params = new URLSearchParams(location.search);
  return normalizeGridEngine(params.get('gridEngine'));
}
