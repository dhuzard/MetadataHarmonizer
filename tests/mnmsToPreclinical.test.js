import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

const SAMPLE_INPUT = path.join(
  process.cwd(),
  'web/templates/preclinical_mnms_intake/exampleInput/mnms_sample.csv'
);
const SCRIPT = path.join(process.cwd(), 'script/mnms_to_preclinical.py');

describe('mnms_to_preclinical.py', () => {
  test('builds a normalized container JSON with no orphan references', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mnms-preclinical-'));
    const containerPath = path.join(tempDir, 'container.json');
    const logPath = path.join(tempDir, 'log.json');

    execFileSync(
      'python3',
      [
        SCRIPT,
        '--input',
        SAMPLE_INPUT,
        '--container-json',
        containerPath,
        '--log-json',
        logPath,
      ],
      { encoding: 'utf-8' }
    );

    const containerJson = JSON.parse(fs.readFileSync(containerPath, 'utf-8'));
    const logJson = JSON.parse(fs.readFileSync(logPath, 'utf-8'));

    expect(containerJson.schema).toBe('https://example.com/preclinical_hcm');
    expect(containerJson.Container.Experiments.length).toBeGreaterThan(1);

    const experimentIds = new Set(
      containerJson.Container.Experiments.map(
        (experiment) => experiment.experiment_id
      )
    );
    const subjectIds = new Set(
      containerJson.Container.Subjects.map((subject) => subject.subject_id)
    );

    containerJson.Container.Cages.forEach((cage) => {
      expect(experimentIds.has(cage.experiment_id)).toBe(true);
    });

    containerJson.Container.Subjects.forEach((subject) => {
      expect(experimentIds.has(subject.experiment_id)).toBe(true);
    });

    containerJson.Container.Procedures.forEach((procedure) => {
      expect(subjectIds.has(procedure.subject_id)).toBe(true);
    });

    containerJson.Container.ObservationAssets.forEach((asset) => {
      expect(experimentIds.has(asset.experiment_id)).toBe(true);
    });

    expect(
      logJson.warnings.some(
        (warning) => warning.issue === 'generated synthetic subject identifier'
      )
    ).toBe(true);
  });

  test('supports scoped HCMO export for a selected experiment id', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mnms-preclinical-'));
    const containerPath = path.join(tempDir, 'container.json');

    execFileSync(
      'python3',
      [SCRIPT, '--input', SAMPLE_INPUT, '--container-json', containerPath],
      {
        encoding: 'utf-8',
      }
    );

    const containerJson = JSON.parse(fs.readFileSync(containerPath, 'utf-8'));
    const selectedExperiment = containerJson.Container.Experiments.find(
      (experiment) => experiment.home_cage_monitoring_system === 'Other'
    );
    const hcmoPath = path.join(tempDir, 'selected-hcmo.json');

    execFileSync(
      'python3',
      [
        SCRIPT,
        '--input',
        SAMPLE_INPUT,
        '--hcmo-json',
        hcmoPath,
        '--experiment-id',
        selectedExperiment.experiment_id,
      ],
      { encoding: 'utf-8' }
    );

    const hcmoJson = JSON.parse(fs.readFileSync(hcmoPath, 'utf-8'));
    expect(hcmoJson.schemaVersion).toBe('hcmo-v1');
    expect(hcmoJson.experiment.experimentId).toBe(
      selectedExperiment.experiment_id
    );
    expect(hcmoJson.homeCageMonitoring.system).toBe('Other');
    expect(hcmoJson.subjects).toHaveLength(1);
    expect(hcmoJson.procedures).toHaveLength(1);
    expect(hcmoJson.dataAssets).toHaveLength(1);
  });
});
