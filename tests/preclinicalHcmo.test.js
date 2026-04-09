import {
  containerToHcmoJson,
  filterContainerByExperiment,
} from '../lib/utils/preclinicalHcmo';

const sampleContainerJson = require('../web/templates/preclinical_hcm/exampleInput/preclinical_hcm_sample.json');
const menu = require('../web/templates/menu.json');

describe('preclinical HCM export utilities', () => {
  test('filterContainerByExperiment narrows the container to one experiment package', () => {
    const experiments = sampleContainerJson.Container.Experiments;
    const rocheExperiment = experiments.find(
      (experiment) => experiment.collaborator === 'Roche'
    );

    const filtered = filterContainerByExperiment(
      sampleContainerJson.Container,
      rocheExperiment.experiment_id
    );

    expect(filtered.Experiments).toHaveLength(1);
    expect(filtered.Experiments[0].collaborator).toBe('Roche');
    expect(filtered.Subjects).toHaveLength(1);
    expect(filtered.Procedures).toHaveLength(1);
    expect(filtered.ObservationAssets).toHaveLength(1);
  });

  test('containerToHcmoJson reshapes normalized rows into the nested HCMO contract', () => {
    const rocheExperiment = sampleContainerJson.Container.Experiments.find(
      (experiment) => experiment.collaborator === 'Roche'
    );
    const filtered = filterContainerByExperiment(
      sampleContainerJson.Container,
      rocheExperiment.experiment_id
    );

    const hcmo = containerToHcmoJson(filtered);

    expect(hcmo.schemaVersion).toBe('hcmo-v1');
    expect(hcmo.experiment.collaborator).toBe('Roche');
    expect(hcmo.homeCageMonitoring.system).toBe('Other');
    expect(hcmo.subjects).toHaveLength(1);
    expect(hcmo.procedures).toHaveLength(1);
    expect(hcmo.dataAssets).toHaveLength(1);
    expect(hcmo.dataAssets[0].recordingFrequency).toBe('1min');
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
