# Preclinical HCM Pipeline

This repository now includes a two-template workflow for preclinical home-cage monitoring metadata.

All tracked example files in this workflow are synthetic. Keep real source workbooks and local drafts out of version control; `docs/inputs/` is intended for local-only inputs and is ignored by git.

## Templates

- `preclinical_mnms_intake/MNMSRecord`
  - Flat intake template aligned to the MNMS spreadsheet headers.
  - Intended for source review and source-preserving edits.
- `preclinical_hcm/Experiment`
  - Normalized multi-tab template used for curation, validation, JSON round-trips, and HCMO export.
  - Tabs are `Experiment`, `Cage`, `Subject`, `Procedure`, and `Observation Asset`.

## End-to-End Flow

1. Review or clean the source workbook with the `MNMS Intake` template if needed.
2. Convert the MNMS input into normalized JSON:

```bash
python3 script/mnms_to_preclinical.py \
  --input web/templates/preclinical_mnms_intake/exampleInput/mnms_sample.csv \
  --container-json /tmp/preclinical-container.json \
  --hcmo-json /tmp/preclinical-hcmo.json \
  --log-json /tmp/preclinical-etl-log.json
```

If the source file contains multiple experiments and you want a specific HCMO package directly from the CLI, pass `--experiment-id <experiment_id>`. Without that flag the script exports the first normalized experiment to `--hcmo-json` and records the choice in the warning log.

3. Open the normalized template in the app and load `/tmp/preclinical-container.json`.
4. Curate and validate the normalized records in the `Experiment` template.
5. Use `File -> Export to -> HCMO_JSON` from the `Experiment` tab to emit the nested `hcmo-v1` JSON contract.

## Normalization Rules

- `NA`, `?`, `-`, empty values, and `None` are treated as missing.
- Excel serial dates are converted to ISO dates.
- Fractional day values such as `0.25` are converted to clock times such as `06:00`.
- Fractional light-cycle values are converted to text such as `12:12 LD`.
- Ambiguous dates such as `14-11-23` are parsed with day-first semantics and logged.
- Missing subject identifiers generate synthetic stable IDs and are recorded in the ETL log.

## Output Contracts

- Normalized DH JSON:
  - LinkML-style `Container` JSON keyed by `Experiments`, `Cages`, `Subjects`, `Procedures`, and `ObservationAssets`.
- HCMO JSON:
  - Nested `hcmo-v1` data with `experiment`, `environmentHousing`, `homeCageMonitoring`, `cages`, `subjects`, `procedures`, and `dataAssets`.
  - The schema reference for this contract is [hcmo-v1.schema.json](/home/dhuzard/projects/MetadataHarmonizer/docs/hcmo-v1.schema.json).

## Rejection Handling

- Review `--log-json` output after each ETL run.
- Rows with missing collaborators are skipped entirely.
- Rows with unparseable numeric or temporal fields are still loaded, but the invalid source values are dropped from normalized slots and recorded in the warning log.
