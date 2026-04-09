import {
  containerToHcmoJson,
  filterContainerByExperiment,
} from '../lib/utils/preclinicalHcmo';

const sampleContainerJson = require('../web/templates/preclinical_hcm/exampleInput/preclinical_hcm_sample.json');
const menu = require('../web/templates/menu.json');

const getScopedExperiment = (container) =>
  container.Experiments.find((experiment) => {
    const filtered = filterContainerByExperiment(
      container,
      experiment.experiment_id
    );

    return (
      experiment.home_cage_monitoring_system === 'Other' &&
      filtered.Cages.length === 1 &&
      filtered.Subjects.length === 1 &&
      filtered.Procedures.length === 1 &&
      filtered.ObservationAssets.length === 1
    );
  });

describe('preclinical HCM export utilities', () => {
  test('filterContainerByExperiment narrows the container to one experiment package', () => {
    const selectedExperiment = getScopedExperiment(
      sampleContainerJson.Container
    );

    const filtered = filterContainerByExperiment(
      sampleContainerJson.Container,
      selectedExperiment.experiment_id
    );

    expect(filtered.Experiments).toHaveLength(1);
    expect(filtered.Experiments[0].experiment_id).toBe(
      selectedExperiment.experiment_id
    );
    expect(filtered.Subjects).toHaveLength(1);
    expect(filtered.Procedures).toHaveLength(1);
    expect(filtered.ObservationAssets).toHaveLength(1);
  });

  test('containerToHcmoJson reshapes normalized rows into the nested HCMO contract', () => {
    const selectedExperiment = getScopedExperiment(
      sampleContainerJson.Container
    );
    const filtered = filterContainerByExperiment(
      sampleContainerJson.Container,
      selectedExperiment.experiment_id
    );

    const hcmo = containerToHcmoJson(filtered);

    expect(hcmo.schemaVersion).toBe('hcmo-v1');
    expect(hcmo.experiment.experimentId).toBe(selectedExperiment.experiment_id);
    expect(hcmo.homeCageMonitoring.system).toBe('Other');
    expect(hcmo.subjects).toHaveLength(1);
    expect(hcmo.procedures).toHaveLength(1);
    expect(hcmo.dataAssets).toHaveLength(1);
    expect(hcmo.dataAssets[0].recordingFrequency).toBe('5min');
  });
});

describe('preclinical template menu wiring', () => {
  test('shows only the intended root templates in the menu', () => {
    expect(menu.PreclinicalMNMSIntake.templates.MNMSRecord.display).toBe(true);
    expect(menu.PreclinicalHCM.templates.Experiment.display).toBe(true);
    expect(menu.PreclinicalHCM.templates.Subject.display).toBe(false);
    expect(menu.PreclinicalHCM.templates.Cage.display).toBe(false);
    expect(menu.PreclinicalHCM.templates.Procedure.display).toBe(false);
    expect(menu.PreclinicalHCM.templates.ObservationAsset.display).toBe(false);
  });
});
