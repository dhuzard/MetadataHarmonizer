import { MULTIVALUED_DELIMITER, parseMultivaluedValue } from './fields';

const DEFAULT_SCHEMA_VERSION = 'hcmo-v1';

const isPresent = (value) =>
  value !== undefined &&
  value !== null &&
  !(typeof value === 'string' && value.trim() === '');

const trimString = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toMaybeArray = (value) => {
  if (!isPresent(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isPresent);
  }

  if (typeof value === 'string' && value.includes(MULTIVALUED_DELIMITER)) {
    return parseMultivaluedValue(value);
  }

  return [value];
};

const pickFirst = (...values) => values.find((value) => isPresent(value));

const outcomeMeasureToDataType = (outcomeMeasure) => {
  const normalized = (outcomeMeasure || '').toLowerCase();

  if (
    normalized.includes('locomotion') ||
    normalized.includes('activity') ||
    normalized.includes('loc_index')
  ) {
    return 'Activity';
  }

  if (normalized.includes('food')) {
    return 'Food Intake';
  }

  return 'Observation';
};

const removeEmpty = (value) => {
  if (Array.isArray(value)) {
    const filtered = value
      .map((entry) => removeEmpty(entry))
      .filter((entry) => {
        if (entry === undefined || entry === null) {
          return false;
        }
        if (Array.isArray(entry)) {
          return entry.length > 0;
        }
        if (typeof entry === 'object') {
          return Object.keys(entry).length > 0;
        }
        return true;
      });

    return filtered.length > 0 ? filtered : undefined;
  }

  if (value && typeof value === 'object') {
    const cleaned = Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, removeEmpty(entry)])
        .filter(([, entry]) => entry !== undefined)
    );

    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  return isPresent(value) ? value : undefined;
};

export const buildExportableContainer = (context) => {
  const schemaContainer = context.template.default.schema.classes.Container;

  return Object.entries(schemaContainer.attributes).reduce(
    (acc, [, { name, range }]) => {
      if (!range || !context.dhs[range]) {
        return acc;
      }

      const records = context.dhs[range].toJSON().map((record) =>
        Object.fromEntries(
          Object.entries(record)
            .map(([key, value]) => [key, trimString(value)])
            .filter(([, value]) => value !== undefined)
        )
      );

      return {
        ...acc,
        [name]: records,
      };
    },
    {}
  );
};

export const getSelectedExperimentId = (context) => {
  const experimentDh = context.dhs?.Experiment;
  if (!experimentDh) {
    return null;
  }

  const selectedRow = experimentDh.getSelectedRow();
  if (selectedRow !== null) {
    const columnIndex = experimentDh.getColumnIndexByFieldName('experiment_id');
    if (columnIndex >= 0) {
      const selectedId = trimString(
        experimentDh.getCellValue(selectedRow, columnIndex)
      );
      if (selectedId) {
        return selectedId;
      }
    }
  }

  return trimString(experimentDh.toJSON()?.[0]?.experiment_id) || null;
};

export const filterContainerByExperiment = (container, experimentId) => {
  if (!experimentId) {
    return container;
  }

  const experiments = (container.Experiments || []).filter(
    (experiment) => experiment.experiment_id === experimentId
  );
  const cages = (container.Cages || []).filter(
    (cage) => cage.experiment_id === experimentId
  );
  const subjects = (container.Subjects || []).filter(
    (subject) => subject.experiment_id === experimentId
  );
  const subjectIds = new Set(subjects.map((subject) => subject.subject_id));
  const cageIds = new Set(cages.map((cage) => cage.cage_id));
  const procedures = (container.Procedures || []).filter(
    (procedure) =>
      procedure.experiment_id === experimentId ||
      subjectIds.has(procedure.subject_id)
  );
  const assets = (container.ObservationAssets || []).filter(
    (asset) =>
      asset.experiment_id === experimentId ||
      subjectIds.has(asset.subject_id) ||
      cageIds.has(asset.cage_id)
  );

  return {
    Experiments: experiments,
    Cages: cages,
    Subjects: subjects,
    Procedures: procedures,
    ObservationAssets: assets,
  };
};

export const containerToHcmoJson = (
  container,
  { schemaVersion = DEFAULT_SCHEMA_VERSION } = {}
) => {
  const experiments = container.Experiments || [];
  const cages = container.Cages || [];
  const subjects = container.Subjects || [];
  const procedures = container.Procedures || [];
  const assets = container.ObservationAssets || [];
  const experiment = experiments[0] || {};

  const uniqueVariables = new Map();
  assets.forEach((asset) => {
    const name = trimString(asset.outcome_measure);
    if (!name || uniqueVariables.has(name)) {
      return;
    }

    uniqueVariables.set(name, {
      name,
      unit: trimString(asset.unit),
      dataType: outcomeMeasureToDataType(name),
    });
  });

  const hcmo = {
    schemaVersion,
    experiment: {
      experimentId: trimString(experiment.experiment_id),
      name: trimString(experiment.name),
      collaborator: trimString(experiment.collaborator),
      cohortName: trimString(experiment.cohort_name),
      goal: trimString(experiment.goal),
      type: trimString(experiment.study_type),
      protocol: trimString(experiment.protocol),
      startAt: trimString(experiment.start_at),
      endAt: trimString(experiment.end_at),
      description: trimString(experiment.description),
      repositoryLink: trimString(experiment.repository_link),
      testingLocation: trimString(experiment.testing_location),
      timezone: trimString(experiment.timezone),
      primaryOutcomeMeasure: trimString(experiment.primary_outcome_measure),
    },
    environmentHousing: {
      room: trimString(experiment.room),
      temperature: trimString(experiment.temperature_celsius),
      humidity: trimString(experiment.humidity_percent),
      luminosity: trimString(experiment.luminosity_lux),
      pressure: trimString(experiment.pressure_hpa),
      noise: trimString(experiment.noise_db),
      lightCycle: trimString(experiment.light_cycle),
      lightsOnAt: trimString(experiment.lights_on_at),
      dawnDusk: trimString(experiment.dawn_dusk),
      dawnDuskDuration: trimString(experiment.dawn_dusk_duration),
      timezone: trimString(experiment.timezone),
    },
    homeCageMonitoring: {
      system: trimString(experiment.home_cage_monitoring_system),
      variables: Array.from(uniqueVariables.values()),
      recordingFrequency: pickFirst(
        ...assets.map((asset) => trimString(asset.recording_frequency))
      ),
      recordedStartAt: pickFirst(
        ...assets.map((asset) => trimString(asset.recorded_start_at))
      ),
      recordedEndAt: pickFirst(
        ...assets.map((asset) => trimString(asset.recorded_end_at))
      ),
    },
    cages: cages.map((cage) => ({
      cageId: trimString(cage.cage_id),
      experimentId: trimString(cage.experiment_id),
      sourceCageIdentifier: trimString(cage.source_cage_identifier),
      type: trimString(cage.cage_type),
      format: trimString(cage.cage_format),
      animalsPerCage: trimString(cage.animals_per_cage),
      enrichmentType: toMaybeArray(cage.enrichment_types),
      hasEnrichments: trimString(cage.has_enrichments),
      water: trimString(cage.water_available),
      food: trimString(cage.food_available),
      beddingType: trimString(cage.bedding_type),
      lightCycle: trimString(cage.light_cycle),
      lightsOnAt: trimString(cage.lights_on_at),
      dawnDusk: trimString(cage.dawn_dusk),
      dawnDuskDuration: trimString(cage.dawn_dusk_duration),
      timezone: trimString(cage.timezone),
      remarks: trimString(cage.remarks),
    })),
    subjects: subjects.map((subject) => ({
      subjectId: trimString(subject.subject_id),
      experimentId: trimString(subject.experiment_id),
      cageId: trimString(subject.cage_id),
      sourceAnimalIdentifier: trimString(subject.source_animal_identifier),
      localIdentifiers: toMaybeArray(subject.local_identifiers),
      species: trimString(subject.species),
      sex: trimString(subject.sex),
      birthAt: trimString(subject.birth_at),
      strain: trimString(subject.strain_ilar_name),
      strainShortName: trimString(subject.strain_short_name),
      transgenic: trimString(subject.transgenic),
      genotype: trimString(subject.genotype_information),
      alleleInformation: trimString(subject.allele_information),
      vendor: trimString(subject.vendor),
      developmentalStage: trimString(subject.developmental_stage),
      startingWeight: trimString(subject.starting_weight),
      weightUnit: trimString(subject.weight_unit),
      severityGrade: trimString(subject.severity_grade),
      remarks: trimString(subject.remarks),
    })),
    procedures: procedures.map((procedure) => ({
      procedureId: trimString(procedure.procedure_id),
      subjectId: trimString(procedure.subject_id),
      experimentId: trimString(procedure.experiment_id),
      cageId: trimString(procedure.cage_id),
      procedureType: trimString(procedure.procedure_type),
      name: trimString(procedure.name),
      protocol: trimString(procedure.protocol),
      startAt: trimString(procedure.start_at),
      endAt: trimString(procedure.end_at),
      state: trimString(procedure.state),
      treatmentType: trimString(procedure.treatment_type),
      category: trimString(procedure.category),
      drug: trimString(procedure.drug),
      casNumber: trimString(procedure.cas_number),
      dose: trimString(procedure.dose_value),
      doseUnit: trimString(procedure.dose_unit),
      route: trimString(procedure.route),
      administrationMethod: trimString(procedure.administration_method),
      vehicleComposition: trimString(procedure.vehicle_composition),
      description: trimString(procedure.description),
      remarks: trimString(procedure.remarks),
    })),
    dataAssets: assets.map((asset) => ({
      assetId: trimString(asset.asset_id),
      experimentId: trimString(asset.experiment_id),
      cageId: trimString(asset.cage_id),
      subjectId: trimString(asset.subject_id),
      assetType: trimString(asset.asset_type),
      system: trimString(asset.system),
      outcomeMeasure: trimString(asset.outcome_measure),
      valueKind: trimString(asset.value_kind),
      unit: trimString(asset.unit),
      timezone: trimString(asset.timezone),
      recordedStartAt: trimString(asset.recorded_start_at),
      recordedEndAt: trimString(asset.recorded_end_at),
      recordingDuration: trimString(asset.recording_duration),
      recordingFrequency: trimString(asset.recording_frequency),
      sourceFileName: trimString(asset.source_file_name),
      sourceSheetName: trimString(asset.source_sheet_name),
      sourceRowNumber: trimString(asset.source_row_number),
      remark: trimString(asset.remark),
    })),
  };

  return removeEmpty(hcmo);
};

export const buildHcmoJsonFromContext = (context, options = {}) =>
  containerToHcmoJson(
    filterContainerByExperiment(
      buildExportableContainer(context),
      getSelectedExperimentId(context)
    ),
    options
  );
