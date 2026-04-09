export const GRID_ENGINE_HANDSONTABLE = 'handsontable';
export const GRID_ENGINE_TABULATOR = 'tabulator';
export const GRID_ENGINE_REVOGRID = 'revogrid';

export const REVOGRID_RUNTIME_TEMPLATE_PATHS = Object.freeze([
  'canada_covid19/CanCOGeNCovid19',
  'phac_dexa/PHACDexa',
]);

export const GRID_ENGINES = Object.freeze([
  GRID_ENGINE_HANDSONTABLE,
  GRID_ENGINE_TABULATOR,
  GRID_ENGINE_REVOGRID,
]);

export const IMPLEMENTED_GRID_ENGINES = Object.freeze([
  GRID_ENGINE_HANDSONTABLE,
  GRID_ENGINE_REVOGRID,
]);

export const DEFAULT_GRID_ENGINE = GRID_ENGINE_HANDSONTABLE;

export function supportsGridEngineForTemplate(engine, templatePath) {
  if (engine === GRID_ENGINE_HANDSONTABLE) {
    return true;
  }

  if (engine === GRID_ENGINE_REVOGRID) {
    if (typeof templatePath !== 'string') {
      return false;
    }

    const normalizedPath = templatePath.trim();
    return REVOGRID_RUNTIME_TEMPLATE_PATHS.includes(normalizedPath);
  }

  return false;
}

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

export function resolveGridEngine(value, options = {}) {
  const { templatePath } = options;
  const requested = normalizeGridEngine(value);
  const globallyImplemented = IMPLEMENTED_GRID_ENGINES.includes(requested);
  const templateSupported = supportsGridEngineForTemplate(
    requested,
    templatePath
  );
  const implemented = globallyImplemented && templateSupported;

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
