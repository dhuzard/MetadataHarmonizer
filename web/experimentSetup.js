const SUPPORTED_EXAMPLE_INPUT_EXTENSIONS = new Set([
  'csv',
  'json',
  'tsv',
  'xls',
  'xlsx',
]);

const DEFAULT_EXAMPLE_INPUT_STATE = Object.freeze({
  requested: null,
  url: null,
  loaded: false,
  validated: false,
  error: null,
  tables: {},
});

function getSearchParams() {
  if (window.URLSearchParams) {
    return new URLSearchParams(window.location.search);
  }

  return {
    get(name) {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(?:^|[?&])${escapedName}=([^&]*)`);
      const match = window.location.search.match(pattern);
      return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
    },
  };
}

function coerceBooleanParam(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function sanitizeExampleInputPath(exampleInput) {
  const segments = exampleInput
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!segments.length) {
    throw new Error('Example input path is empty.');
  }

  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new Error('Example input paths cannot contain "." or ".." segments.');
  }

  return segments;
}

function getExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}

function getMimeType(fileName) {
  const extension = getExtension(fileName);

  switch (extension) {
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

function buildExampleInputSummary(context) {
  return Object.fromEntries(
    Object.entries(context.dhs).map(([name, dh]) => [
      name,
      {
        invalidRowCount: Object.keys(dh.invalid_cells || {}).length,
        nonEmptyRowCount: dh.countRows() - dh.countEmptyRows(),
      },
    ])
  );
}

function setExampleInputState(state) {
  const root = document.documentElement;

  if (state.requested) {
    root.dataset.exampleInputRequested = state.requested;
  } else {
    delete root.dataset.exampleInputRequested;
  }

  root.dataset.exampleInputLoaded = String(Boolean(state.loaded));
  root.dataset.exampleInputValidated = String(Boolean(state.validated));
  root.dataset.exampleInputError = String(Boolean(state.error));
  window.__DATAHARMONIZER_EXAMPLE_INPUT__ = state;
}

function renderExampleInputStatus(state, anchor) {
  const existing = document.querySelector('#example-input-status');
  if (existing) {
    existing.remove();
  }

  if (!state.requested) {
    return;
  }

  const alert = document.createElement('div');
  alert.id = 'example-input-status';
  alert.className = `alert alert-${state.error ? 'danger' : 'info'} mb-3`;
  alert.setAttribute('role', 'alert');

  if (state.error) {
    alert.textContent = `Example input "${state.requested}" failed to load: ${state.error}`;
  } else {
    const validationSuffix = state.validated
      ? ' Validation ran automatically.'
      : '';
    alert.textContent = `Loaded bundled example input "${state.requested}".${validationSuffix}`;
  }

  anchor.before(alert);
}

function getExampleInputConfig(templatePath) {
  const params = getSearchParams();
  const requested = params.get('exampleInput');

  if (!requested) {
    return null;
  }

  const [schemaFolder] = templatePath.split('/');
  const segments = sanitizeExampleInputPath(requested);
  const fileName = segments[segments.length - 1];
  const extension = getExtension(fileName);

  if (!SUPPORTED_EXAMPLE_INPUT_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported example input "${fileName}". Supported types: ${Array.from(
        SUPPORTED_EXAMPLE_INPUT_EXTENSIONS
      ).join(', ')}.`
    );
  }

  const encodedPath = segments.map(encodeURIComponent).join('/');
  return {
    requested,
    validate: coerceBooleanParam(params.get('validate')),
    url: `/templates/${encodeURIComponent(
      schemaFolder
    )}/exampleInput/${encodedPath}`,
  };
}

async function fetchExampleInputFile(config) {
  const response = await fetch(config.url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${config.url}`);
  }

  const blob = await response.blob();
  const fileName = config.requested.split('/').pop();

  return new File([blob], fileName, {
    type: blob.type || getMimeType(fileName),
  });
}

async function loadExampleInput(context, file, toolbar) {
  for (const dh of Object.values(context.dhs)) {
    dh.invalid_cells = {};
    await context.runBehindLoadingScreen(dh.openFile.bind(dh), [file]);
    dh.current_selection = [null, null, null, null];
  }

  const fileNameDisplay = document.querySelector('#file_name_display');
  if (fileNameDisplay) {
    fileNameDisplay.textContent = file.name;
  }
  toolbar.hideValidationResultButtons();
}

export async function maybeLoadExampleInput(context, toolbar, anchor) {
  try {
    const config = getExampleInputConfig(context.appConfig.template_path);
    if (!config) {
      setExampleInputState(DEFAULT_EXAMPLE_INPUT_STATE);
      renderExampleInputStatus(DEFAULT_EXAMPLE_INPUT_STATE, anchor);
      return DEFAULT_EXAMPLE_INPUT_STATE;
    }

    const state = {
      requested: config.requested,
      url: config.url,
      loaded: false,
      validated: false,
      error: null,
      tables: {},
    };
    setExampleInputState(state);

    const file = await fetchExampleInputFile(config);
    await loadExampleInput(context, file, toolbar);

    state.loaded = true;
    state.tables = buildExampleInputSummary(context);

    if (config.validate) {
      await toolbar.validate();
      state.validated = true;
      state.tables = buildExampleInputSummary(context);
    }

    setExampleInputState(state);
    renderExampleInputStatus(state, anchor);
    return state;
  } catch (error) {
    const failedState = {
      ...DEFAULT_EXAMPLE_INPUT_STATE,
      error: error.message,
      requested: getSearchParams().get('exampleInput'),
    };
    setExampleInputState(failedState);
    renderExampleInputStatus(failedState, anchor);
    console.error(error);
    return failedState;
  }
}
