#!/usr/bin/env python3

import argparse
import csv
import hashlib
import json
import os
import re
import sys
import zipfile
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

from dateutil import parser as date_parser


NULLISH_VALUES = {"", "?", "na", "n/a", "-", "none", "null"}
EXCEL_EPOCH = datetime(1899, 12, 30)
XLSX_NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

NORMALIZED_SCHEMA_ID = "https://example.com/preclinical_hcm"
NORMALIZED_SCHEMA_VERSION = "1.0.0"
HCMO_SCHEMA_VERSION = "hcmo-v1"

MNMS_HEADERS = [
    "XP_group",
    "Collaborator",
    "Unique_Animal_Identifier",
    "DVC Cage Identifier",
    "Local_Identifiers",
    "nbr_mice_per_cage",
    "Caqge cahge (Y/N)",
    "Cage Change date",
    "Species",
    "Strain_ILAR_Name",
    "Strain_Short_Name",
    "Sex",
    "Transgenic",
    "Genotype_Information",
    "Allele_Information",
    "Animal_Vendor",
    "Date_of_Birth",
    "Developmental_Stage",
    "Animal_Weight_at_Start",
    "Weight_Unit",
    "Severity_Grade_of_Manipulation",
    "In-life_Phase_Start_Date",
    "In-life_Phase_End_Date",
    "Test_Substance_Common_Name",
    "Test_Substance_CAS_Number",
    "Numerical_Dose",
    "Dose_Unit",
    "Vehicle_Composition",
    "Route_of_Administration",
    "Administration_Method",
    "Testing_Location",
    "Light_Cycle",
    "Enrichment",
    "Outcome_Measure",
    "Value",
    "Unit_of_Measurement",
    "Light_StartAt",
    "Dawn-and-Dusk",
    "Dawn-and-Dusk_duration",
    "TimeZone",
    "Rec_StartAt",
    "Rec_StoptAt",
    "Rec_Dur",
    "Rec_freq",
    "Remark",
]


def build_arg_parser():
    parser = argparse.ArgumentParser(
        description="Transform MNMS intake rows into normalized preclinical HCM JSON."
    )
    parser.add_argument("--input", required=True, help="Path to an MNMS .xlsx or .csv file.")
    parser.add_argument(
        "--container-json",
        help="Write normalized DH/LinkML Container JSON to this path.",
    )
    parser.add_argument(
        "--hcmo-json",
        help="Write HCMO-shaped nested JSON to this path.",
    )
    parser.add_argument(
        "--log-json",
        help="Optional path for ETL warnings and normalization notes.",
    )
    parser.add_argument(
        "--experiment-id",
        help="Optional experiment_id to scope the HCMO export when the input contains multiple experiments.",
    )
    return parser


def is_nullish(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip().lower() in NULLISH_VALUES
    return False


def clean_string(value):
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    return str(value)


def slugify(value):
    value = clean_string(value) or ""
    value = re.sub(r"[^a-z0-9]+", "-", value.lower())
    return value.strip("-")


def stable_id(prefix, *parts):
    material = json.dumps(parts, sort_keys=True, ensure_ascii=True)
    digest = hashlib.sha1(material.encode("utf-8")).hexdigest()[:10]
    slugs = [slugify(part) for part in parts if clean_string(part)]
    slug = "-".join([part for part in slugs[:2] if part])[:40]
    return f"{prefix}-{slug}-{digest}" if slug else f"{prefix}-{digest}"


def record_warning(warnings, row_number, field, raw_value, issue, normalized=None):
    warnings.append(
        {
            "row": row_number,
            "field": field,
            "rawValue": raw_value,
            "issue": issue,
            "normalizedValue": normalized,
        }
    )


def numeric_value(value):
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = clean_string(value)
    if text is None:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def excel_serial_to_datetime(serial_value):
    return EXCEL_EPOCH + timedelta(days=float(serial_value))


def normalize_date(value, row_number, field, warnings):
    if is_nullish(value):
        return None

    numeric = numeric_value(value)
    if numeric is not None and numeric > 1000:
        dt = excel_serial_to_datetime(numeric)
        normalized = dt.date().isoformat()
        if clean_string(value) and not clean_string(value).isdigit():
            record_warning(
                warnings,
                row_number,
                field,
                value,
                "coerced mixed numeric date value",
                normalized,
            )
        return normalized

    text = clean_string(value)
    try:
        parsed = date_parser.parse(text, dayfirst=True)
        normalized = parsed.date().isoformat()
        if re.search(r"\b\d{2}-\d{2}-\d{2}\b", text):
            record_warning(
                warnings,
                row_number,
                field,
                value,
                "interpreted 2-digit year date",
                normalized,
            )
        return normalized
    except Exception:
        record_warning(warnings, row_number, field, value, "unable to parse date")
        return None


def normalize_datetime(value, row_number, field, warnings):
    if is_nullish(value):
        return None

    numeric = numeric_value(value)
    if numeric is not None and numeric > 1000:
        normalized = excel_serial_to_datetime(numeric).replace(tzinfo=timezone.utc).isoformat()
        return normalized

    text = clean_string(value)
    try:
        parsed = date_parser.parse(text)
        return parsed.isoformat()
    except Exception:
        record_warning(warnings, row_number, field, value, "unable to parse datetime")
        return None


def normalize_decimal(value, row_number, field, warnings):
    if is_nullish(value):
        return None
    numeric = numeric_value(value)
    if numeric is None:
        record_warning(warnings, row_number, field, value, "unable to parse decimal")
        return None
    return round(numeric, 6)


def normalize_integer(value, row_number, field, warnings):
    decimal = normalize_decimal(value, row_number, field, warnings)
    if decimal is None:
        return None
    try:
        return int(round(decimal))
    except Exception:
        record_warning(warnings, row_number, field, value, "unable to parse integer")
        return None


def normalize_yes_no_unknown(value):
    if is_nullish(value):
        return None
    text = clean_string(value).lower()
    if text in {"yes", "y", "true"}:
        return "yes"
    if text in {"no", "n", "false"}:
        return "no"
    return "unknown"


def normalize_species(value):
    if is_nullish(value):
        return None
    text = clean_string(value).lower()
    if "mouse" in text:
        return "mouse"
    if "rat" in text:
        return "rat"
    return "other"


def normalize_sex(value):
    if is_nullish(value):
        return None
    text = clean_string(value).lower()
    if text.startswith("f"):
        return "female"
    if text.startswith("m"):
        return "male"
    return "unknown"


def normalize_severity(value):
    if is_nullish(value):
        return None
    text = clean_string(value).lower()
    if "subthreshold" in text:
        return "subthreshold"
    if "mild" in text:
        return "mild"
    if "moderate" in text:
        return "moderate"
    if "severe" in text:
        return "severe"
    if "none" in text or text.startswith("0"):
        return "none"
    return "unknown"


def normalize_route(value):
    if is_nullish(value):
        return None
    text = clean_string(value).lower()
    route_map = {
        "oral": "oral",
        "gavage": "gavage",
        "ip": "IP",
        "iv": "IV",
        "im": "IM",
        "tailvein": "tailVein",
    }
    normalized_key = re.sub(r"[^a-z]", "", text)
    return route_map.get(normalized_key, "other")


def normalize_study_type():
    return "home_cage_monitoring"


def normalize_light_cycle(value, row_number, warnings):
    if is_nullish(value):
        return None
    numeric = numeric_value(value)
    if numeric is not None and 0 < numeric < 1:
        total_minutes = int(round(numeric * 24 * 60))
        hours = total_minutes // 60
        minutes = total_minutes % 60
        normalized = f"{hours:02d}:{minutes:02d} LD"
        record_warning(
            warnings,
            row_number,
            "Light_Cycle",
            value,
            "converted fractional light cycle to textual representation",
            normalized,
        )
        return normalized
    return clean_string(value)


def normalize_time(value, row_number, field, warnings):
    if is_nullish(value):
        return None
    numeric = numeric_value(value)
    if numeric is not None and 0 <= numeric < 1:
        total_minutes = int(round(numeric * 24 * 60))
        hours = total_minutes // 60
        minutes = total_minutes % 60
        return f"{hours:02d}:{minutes:02d}"

    text = clean_string(value)
    try:
        parsed = date_parser.parse(text)
        return parsed.strftime("%H:%M")
    except Exception:
        record_warning(warnings, row_number, field, value, "unable to parse time")
        return None


def normalize_local_identifiers(value):
    if is_nullish(value):
        return []
    return [part.strip() for part in re.split(r"[|;]", clean_string(value)) if part.strip()]


def infer_hcm_system(cage_identifier, outcome_measure):
    cage_text = (clean_string(cage_identifier) or "").upper()
    if "DVC" in cage_text:
        return "DVC"
    if clean_string(outcome_measure):
        return "Other"
    return "unknown"


def has_procedure_data(row):
    return any(
        not is_nullish(row.get(field))
        for field in (
            "Test_Substance_Common_Name",
            "Test_Substance_CAS_Number",
            "Numerical_Dose",
            "Dose_Unit",
            "Vehicle_Composition",
            "Route_of_Administration",
            "Administration_Method",
        )
    )


def has_asset_data(row):
    return any(
        not is_nullish(row.get(field))
        for field in (
            "Outcome_Measure",
            "Value",
            "Unit_of_Measurement",
            "Rec_StartAt",
            "Rec_StoptAt",
            "Rec_Dur",
            "Rec_freq",
        )
    )


def choose_category(start_at, end_at):
    if start_at and end_at and start_at == end_at:
        return "acute"
    if start_at or end_at:
        return "chronic"
    return "unknown"


def make_experiment_name(collaborator, cohort_name, start_at):
    collaborator = collaborator or "Unnamed collaborator"
    if cohort_name and cohort_name != "?":
        if start_at:
            return f"{collaborator} / {cohort_name} ({start_at})"
        return f"{collaborator} / {cohort_name}"
    if start_at:
        return f"{collaborator} preclinical study ({start_at})"
    return f"{collaborator} preclinical study"


def remove_empty(value):
    if isinstance(value, list):
        filtered = [remove_empty(entry) for entry in value]
        filtered = [entry for entry in filtered if entry not in (None, [], {})]
        return filtered or None
    if isinstance(value, dict):
        cleaned = {
            key: remove_empty(entry)
            for key, entry in value.items()
            if remove_empty(entry) not in (None, [], {})
        }
        return cleaned or None
    if value in (None, ""):
        return None
    return value


def update_if_missing(target, updates):
    for key, value in updates.items():
        if key not in target or not target[key]:
            if value not in (None, "", [], {}):
                target[key] = value


def read_csv_rows(path):
    with open(path, newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        return list(reader), "csv"


def cell_text(shared_strings, cell):
    cell_type = cell.attrib.get("t")
    value_node = cell.find("a:v", XLSX_NS)
    if value_node is None:
        inline = cell.find("a:is", XLSX_NS)
        if inline is None:
            return ""
        return "".join(node.text or "" for node in inline.iterfind(".//a:t", XLSX_NS))

    raw_value = value_node.text or ""
    if cell_type == "s":
        return shared_strings[int(raw_value)]
    return raw_value


def read_xlsx_rows(path):
    with zipfile.ZipFile(path) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for string_item in shared_root.findall("a:si", XLSX_NS):
                shared_strings.append(
                    "".join(node.text or "" for node in string_item.iterfind(".//a:t", XLSX_NS))
                )

        workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
        workbook_rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in workbook_rels}
        first_sheet = workbook_root.find("a:sheets/a:sheet", XLSX_NS)
        sheet_name = first_sheet.attrib["name"]
        rel_id = first_sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        sheet_path = "xl/" + rel_map[rel_id]
        sheet_root = ET.fromstring(archive.read(sheet_path))

        rows = []
        for row in sheet_root.findall(".//a:sheetData/a:row", XLSX_NS):
            row_values = []
            current_col = 0
            for cell in row.findall("a:c", XLSX_NS):
                ref = cell.attrib.get("r", "")
                letters = "".join(ch for ch in ref if ch.isalpha())
                col_idx = 0
                for letter in letters:
                    col_idx = col_idx * 26 + ord(letter) - 64
                col_idx -= 1
                while current_col < col_idx:
                    row_values.append("")
                    current_col += 1
                row_values.append(cell_text(shared_strings, cell))
                current_col += 1
            rows.append(row_values)

    header = rows[0]
    data_rows = []
    for raw_row in rows[1:]:
        padded = raw_row + [""] * (len(header) - len(raw_row))
        data_rows.append(dict(zip(header, padded)))
    return data_rows, sheet_name


def read_rows(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".csv":
        return read_csv_rows(path)
    if ext == ".xlsx":
        return read_xlsx_rows(path)
    raise ValueError(f"Unsupported input format: {ext}")


def build_container_json(rows, source_name, source_sheet):
    warnings = []
    experiments = {}
    cages = {}
    subjects = {}
    procedures = {}
    assets = {}

    for index, source_row in enumerate(rows, start=2):
        row = {header: clean_string(source_row.get(header)) for header in MNMS_HEADERS}
        if not any(row.values()):
            continue

        collaborator = row.get("Collaborator")
        if not collaborator:
            record_warning(
                warnings,
                index,
                "Collaborator",
                source_row.get("Collaborator"),
                "skipped row without collaborator",
            )
            continue

        cohort_name = row.get("XP_group")
        start_at = normalize_date(row.get("In-life_Phase_Start_Date"), index, "In-life_Phase_Start_Date", warnings)
        end_at = normalize_date(row.get("In-life_Phase_End_Date"), index, "In-life_Phase_End_Date", warnings)
        testing_location = row.get("Testing_Location")
        timezone_name = row.get("TimeZone")
        light_cycle = normalize_light_cycle(row.get("Light_Cycle"), index, warnings)
        lights_on_at = normalize_time(row.get("Light_StartAt"), index, "Light_StartAt", warnings)
        hcm_system = infer_hcm_system(row.get("DVC Cage Identifier"), row.get("Outcome_Measure"))

        experiment_signature = (
            collaborator,
            cohort_name,
            start_at,
            end_at,
            testing_location,
            timezone_name,
            light_cycle,
        )
        experiment_id = stable_id("exp", *experiment_signature)

        experiment_record = experiments.setdefault(
            experiment_id,
            {
                "experiment_id": experiment_id,
                "name": make_experiment_name(collaborator, cohort_name, start_at),
                "collaborator": collaborator,
                "cohort_name": cohort_name if cohort_name != "?" else None,
                "study_phase": None,
                "goal": "Metadata harmonization for preclinical home-cage monitoring data.",
                "study_type": normalize_study_type(),
                "protocol": None,
                "start_at": start_at,
                "end_at": end_at,
                "description": None,
                "repository_link": None,
                "testing_location": testing_location,
                "room": None,
                "timezone": timezone_name,
                "light_cycle": light_cycle,
                "lights_on_at": lights_on_at,
                "dawn_dusk": normalize_yes_no_unknown(row.get("Dawn-and-Dusk")),
                "dawn_dusk_duration": row.get("Dawn-and-Dusk_duration"),
                "temperature_celsius": None,
                "humidity_percent": None,
                "luminosity_lux": None,
                "pressure_hpa": None,
                "noise_db": None,
                "home_cage_monitoring_system": hcm_system,
                "primary_outcome_measure": row.get("Outcome_Measure"),
                "source_file_name": source_name,
                "source_record_count": 0,
                "data_use_notes": "Generated from MNMS intake by mnms_to_preclinical.py.",
            },
        )
        experiment_record["source_record_count"] += 1
        update_if_missing(
            experiment_record,
            {
                "primary_outcome_measure": row.get("Outcome_Measure"),
                "timezone": timezone_name,
                "light_cycle": light_cycle,
                "lights_on_at": lights_on_at,
                "testing_location": testing_location,
                "home_cage_monitoring_system": hcm_system,
            },
        )

        cage_source_identifier = row.get("DVC Cage Identifier")
        cage_id = None
        if not is_nullish(cage_source_identifier):
            cage_id = stable_id("cage", experiment_id, cage_source_identifier)
            cages.setdefault(
                cage_id,
                {
                    "cage_id": cage_id,
                    "experiment_id": experiment_id,
                    "source_cage_identifier": cage_source_identifier,
                    "cage_type": "hcm" if hcm_system == "DVC" else "unknown",
                    "cage_format": None,
                    "animals_per_cage": normalize_integer(
                        row.get("nbr_mice_per_cage"), index, "nbr_mice_per_cage", warnings
                    ),
                    "enrichment_types": [],
                    "has_enrichments": normalize_yes_no_unknown(row.get("Enrichment")),
                    "water_available": None,
                    "food_available": None,
                    "bedding_type": None,
                    "light_cycle": light_cycle,
                    "lights_on_at": lights_on_at,
                    "dawn_dusk": normalize_yes_no_unknown(row.get("Dawn-and-Dusk")),
                    "dawn_dusk_duration": row.get("Dawn-and-Dusk_duration"),
                    "timezone": timezone_name,
                    "remarks": row.get("Cage Change date"),
                },
            )

        source_animal_identifier = row.get("Unique_Animal_Identifier")
        if is_nullish(source_animal_identifier):
            record_warning(
                warnings,
                index,
                "Unique_Animal_Identifier",
                source_row.get("Unique_Animal_Identifier"),
                "generated synthetic subject identifier",
            )
            source_animal_identifier = f"row-{index}"

        subject_id = stable_id("subject", experiment_id, source_animal_identifier)
        subjects.setdefault(
            subject_id,
            {
                "subject_id": subject_id,
                "experiment_id": experiment_id,
                "cage_id": cage_id,
                "source_animal_identifier": row.get("Unique_Animal_Identifier"),
                "local_identifiers": normalize_local_identifiers(row.get("Local_Identifiers")),
                "species": normalize_species(row.get("Species")),
                "sex": normalize_sex(row.get("Sex")),
                "birth_at": normalize_date(row.get("Date_of_Birth"), index, "Date_of_Birth", warnings),
                "strain_ilar_name": row.get("Strain_ILAR_Name"),
                "strain_short_name": row.get("Strain_Short_Name"),
                "transgenic": normalize_yes_no_unknown(row.get("Transgenic")),
                "genotype_information": row.get("Genotype_Information"),
                "allele_information": row.get("Allele_Information"),
                "vendor": row.get("Animal_Vendor"),
                "developmental_stage": row.get("Developmental_Stage"),
                "starting_weight": normalize_decimal(
                    row.get("Animal_Weight_at_Start"),
                    index,
                    "Animal_Weight_at_Start",
                    warnings,
                ),
                "weight_unit": row.get("Weight_Unit"),
                "severity_grade": normalize_severity(row.get("Severity_Grade_of_Manipulation")),
                "remarks": row.get("Remark"),
            },
        )

        if has_procedure_data(row):
            procedure_name = row.get("Test_Substance_Common_Name") or row.get("Vehicle_Composition") or "treatment"
            procedure_id = stable_id(
                "proc",
                subject_id,
                procedure_name,
                row.get("Route_of_Administration"),
                row.get("Administration_Method"),
                row.get("Numerical_Dose"),
            )
            procedures.setdefault(
                procedure_id,
                {
                    "procedure_id": procedure_id,
                    "subject_id": subject_id,
                    "experiment_id": experiment_id,
                    "cage_id": cage_id,
                    "procedure_type": "treatment",
                    "name": procedure_name,
                    "protocol": row.get("Administration_Method"),
                    "start_at": start_at,
                    "end_at": end_at,
                    "state": "completed" if start_at or end_at else "unknown",
                    "treatment_type": "pharmacological",
                    "category": choose_category(start_at, end_at),
                    "drug": row.get("Test_Substance_Common_Name"),
                    "cas_number": row.get("Test_Substance_CAS_Number"),
                    "dose_value": normalize_decimal(
                        row.get("Numerical_Dose"), index, "Numerical_Dose", warnings
                    ),
                    "dose_unit": row.get("Dose_Unit"),
                    "route": normalize_route(row.get("Route_of_Administration")),
                    "administration_method": row.get("Administration_Method"),
                    "vehicle_composition": row.get("Vehicle_Composition"),
                    "description": None,
                    "remarks": row.get("Remark"),
                },
            )

        if has_asset_data(row):
            recorded_start_at = normalize_datetime(
                row.get("Rec_StartAt"), index, "Rec_StartAt", warnings
            )
            recorded_end_at = normalize_datetime(
                row.get("Rec_StoptAt"), index, "Rec_StoptAt", warnings
            )
            asset_id = stable_id(
                "asset",
                experiment_id,
                subject_id,
                row.get("Outcome_Measure"),
                recorded_start_at or index,
                recorded_end_at,
                row.get("Rec_freq"),
            )
            assets.setdefault(
                asset_id,
                {
                    "asset_id": asset_id,
                    "experiment_id": experiment_id,
                    "cage_id": cage_id,
                    "subject_id": subject_id,
                    "asset_type": "time_series_reference",
                    "system": hcm_system,
                    "outcome_measure": row.get("Outcome_Measure"),
                    "value_kind": row.get("Value") or "TimeSeries",
                    "unit": row.get("Unit_of_Measurement"),
                    "timezone": timezone_name,
                    "recorded_start_at": recorded_start_at,
                    "recorded_end_at": recorded_end_at,
                    "recording_duration": row.get("Rec_Dur"),
                    "recording_frequency": row.get("Rec_freq"),
                    "source_file_name": source_name,
                    "source_sheet_name": source_sheet,
                    "source_row_number": index,
                    "remark": row.get("Remark"),
                },
            )

    container = {
        "schema": NORMALIZED_SCHEMA_ID,
        "version": NORMALIZED_SCHEMA_VERSION,
        "in_language": "en",
        "Container": {
            "Experiments": sorted(experiments.values(), key=lambda entry: entry["experiment_id"]),
            "Cages": sorted(cages.values(), key=lambda entry: entry["cage_id"]),
            "Subjects": sorted(subjects.values(), key=lambda entry: entry["subject_id"]),
            "Procedures": sorted(procedures.values(), key=lambda entry: entry["procedure_id"]),
            "ObservationAssets": sorted(assets.values(), key=lambda entry: entry["asset_id"]),
        },
    }
    return container, warnings


def outcome_measure_to_datatype(outcome_measure):
    normalized = (clean_string(outcome_measure) or "").lower()
    if "loc" in normalized or "activity" in normalized:
        return "Activity"
    if "food" in normalized:
        return "Food Intake"
    return "Observation"


def container_to_hcmo_json(container_json):
    container = container_json["Container"]
    experiments = container.get("Experiments", [])
    cages = container.get("Cages", [])
    subjects = container.get("Subjects", [])
    procedures = container.get("Procedures", [])
    assets = container.get("ObservationAssets", [])
    experiment = experiments[0] if experiments else {}

    variables = []
    seen_variables = set()
    for asset in assets:
        outcome_measure = asset.get("outcome_measure")
        if not outcome_measure or outcome_measure in seen_variables:
            continue
        seen_variables.add(outcome_measure)
        variables.append(
            {
                "name": outcome_measure,
                "unit": asset.get("unit"),
                "dataType": outcome_measure_to_datatype(outcome_measure),
            }
        )

    hcmo = {
        "schemaVersion": HCMO_SCHEMA_VERSION,
        "experiment": {
            "experimentId": experiment.get("experiment_id"),
            "name": experiment.get("name"),
            "collaborator": experiment.get("collaborator"),
            "cohortName": experiment.get("cohort_name"),
            "goal": experiment.get("goal"),
            "type": experiment.get("study_type"),
            "protocol": experiment.get("protocol"),
            "startAt": experiment.get("start_at"),
            "endAt": experiment.get("end_at"),
            "description": experiment.get("description"),
            "repositoryLink": experiment.get("repository_link"),
            "testingLocation": experiment.get("testing_location"),
            "timezone": experiment.get("timezone"),
            "primaryOutcomeMeasure": experiment.get("primary_outcome_measure"),
        },
        "environmentHousing": {
            "room": experiment.get("room"),
            "temperature": experiment.get("temperature_celsius"),
            "humidity": experiment.get("humidity_percent"),
            "luminosity": experiment.get("luminosity_lux"),
            "pressure": experiment.get("pressure_hpa"),
            "noise": experiment.get("noise_db"),
            "lightCycle": experiment.get("light_cycle"),
            "lightsOnAt": experiment.get("lights_on_at"),
            "dawnDusk": experiment.get("dawn_dusk"),
            "dawnDuskDuration": experiment.get("dawn_dusk_duration"),
            "timezone": experiment.get("timezone"),
        },
        "homeCageMonitoring": {
            "system": experiment.get("home_cage_monitoring_system"),
            "variables": variables,
            "recordingFrequency": next(
                (asset.get("recording_frequency") for asset in assets if asset.get("recording_frequency")),
                None,
            ),
            "recordedStartAt": next(
                (asset.get("recorded_start_at") for asset in assets if asset.get("recorded_start_at")),
                None,
            ),
            "recordedEndAt": next(
                (asset.get("recorded_end_at") for asset in assets if asset.get("recorded_end_at")),
                None,
            ),
        },
        "cages": [
            {
                "cageId": cage.get("cage_id"),
                "experimentId": cage.get("experiment_id"),
                "sourceCageIdentifier": cage.get("source_cage_identifier"),
                "type": cage.get("cage_type"),
                "format": cage.get("cage_format"),
                "animalsPerCage": cage.get("animals_per_cage"),
                "enrichmentType": cage.get("enrichment_types"),
                "hasEnrichments": cage.get("has_enrichments"),
                "water": cage.get("water_available"),
                "food": cage.get("food_available"),
                "beddingType": cage.get("bedding_type"),
                "lightCycle": cage.get("light_cycle"),
                "lightsOnAt": cage.get("lights_on_at"),
                "dawnDusk": cage.get("dawn_dusk"),
                "dawnDuskDuration": cage.get("dawn_dusk_duration"),
                "timezone": cage.get("timezone"),
                "remarks": cage.get("remarks"),
            }
            for cage in cages
        ],
        "subjects": [
            {
                "subjectId": subject.get("subject_id"),
                "experimentId": subject.get("experiment_id"),
                "cageId": subject.get("cage_id"),
                "sourceAnimalIdentifier": subject.get("source_animal_identifier"),
                "localIdentifiers": subject.get("local_identifiers"),
                "species": subject.get("species"),
                "sex": subject.get("sex"),
                "birthAt": subject.get("birth_at"),
                "strain": subject.get("strain_ilar_name"),
                "strainShortName": subject.get("strain_short_name"),
                "transgenic": subject.get("transgenic"),
                "genotype": subject.get("genotype_information"),
                "alleleInformation": subject.get("allele_information"),
                "vendor": subject.get("vendor"),
                "developmentalStage": subject.get("developmental_stage"),
                "startingWeight": subject.get("starting_weight"),
                "weightUnit": subject.get("weight_unit"),
                "severityGrade": subject.get("severity_grade"),
                "remarks": subject.get("remarks"),
            }
            for subject in subjects
        ],
        "procedures": [
            {
                "procedureId": procedure.get("procedure_id"),
                "subjectId": procedure.get("subject_id"),
                "experimentId": procedure.get("experiment_id"),
                "cageId": procedure.get("cage_id"),
                "procedureType": procedure.get("procedure_type"),
                "name": procedure.get("name"),
                "protocol": procedure.get("protocol"),
                "startAt": procedure.get("start_at"),
                "endAt": procedure.get("end_at"),
                "state": procedure.get("state"),
                "treatmentType": procedure.get("treatment_type"),
                "category": procedure.get("category"),
                "drug": procedure.get("drug"),
                "casNumber": procedure.get("cas_number"),
                "dose": procedure.get("dose_value"),
                "doseUnit": procedure.get("dose_unit"),
                "route": procedure.get("route"),
                "administrationMethod": procedure.get("administration_method"),
                "vehicleComposition": procedure.get("vehicle_composition"),
                "description": procedure.get("description"),
                "remarks": procedure.get("remarks"),
            }
            for procedure in procedures
        ],
        "dataAssets": [
            {
                "assetId": asset.get("asset_id"),
                "experimentId": asset.get("experiment_id"),
                "cageId": asset.get("cage_id"),
                "subjectId": asset.get("subject_id"),
                "assetType": asset.get("asset_type"),
                "system": asset.get("system"),
                "outcomeMeasure": asset.get("outcome_measure"),
                "valueKind": asset.get("value_kind"),
                "unit": asset.get("unit"),
                "timezone": asset.get("timezone"),
                "recordedStartAt": asset.get("recorded_start_at"),
                "recordedEndAt": asset.get("recorded_end_at"),
                "recordingDuration": asset.get("recording_duration"),
                "recordingFrequency": asset.get("recording_frequency"),
                "sourceFileName": asset.get("source_file_name"),
                "sourceSheetName": asset.get("source_sheet_name"),
                "sourceRowNumber": asset.get("source_row_number"),
                "remark": asset.get("remark"),
            }
            for asset in assets
        ],
    }
    return remove_empty(hcmo)


def filter_container_json(container_json, experiment_id):
    container = container_json["Container"]
    experiments = container.get("Experiments", [])

    if not experiments:
        return container_json

    if experiment_id is None:
        experiment_id = experiments[0]["experiment_id"]

    matching_experiments = [
        experiment for experiment in experiments if experiment["experiment_id"] == experiment_id
    ]
    if not matching_experiments:
        raise ValueError(f"experiment_id not found in container: {experiment_id}")

    cages = [
        cage for cage in container.get("Cages", []) if cage.get("experiment_id") == experiment_id
    ]
    subjects = [
        subject
        for subject in container.get("Subjects", [])
        if subject.get("experiment_id") == experiment_id
    ]
    subject_ids = {subject.get("subject_id") for subject in subjects}
    cage_ids = {cage.get("cage_id") for cage in cages}
    procedures = [
        procedure
        for procedure in container.get("Procedures", [])
        if procedure.get("experiment_id") == experiment_id
        or procedure.get("subject_id") in subject_ids
    ]
    assets = [
        asset
        for asset in container.get("ObservationAssets", [])
        if asset.get("experiment_id") == experiment_id
        or asset.get("subject_id") in subject_ids
        or asset.get("cage_id") in cage_ids
    ]

    return {
        **container_json,
        "Container": {
            "Experiments": matching_experiments,
            "Cages": cages,
            "Subjects": subjects,
            "Procedures": procedures,
            "ObservationAssets": assets,
        },
    }


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def main():
    parser = build_arg_parser()
    args = parser.parse_args()

    if not args.container_json and not args.hcmo_json:
        parser.error("At least one of --container-json or --hcmo-json is required.")

    rows, source_sheet = read_rows(args.input)
    source_name = os.path.basename(args.input)
    container_json, warnings = build_container_json(rows, source_name, source_sheet)

    if args.container_json:
        write_json(args.container_json, container_json)

    if args.hcmo_json:
        hcmo_container = container_json
        experiment_count = len(container_json["Container"].get("Experiments", []))
        if args.experiment_id:
            hcmo_container = filter_container_json(container_json, args.experiment_id)
        elif experiment_count > 1:
            first_experiment_id = container_json["Container"]["Experiments"][0]["experiment_id"]
            record_warning(
                warnings,
                None,
                "experiment_id",
                None,
                "multiple experiments detected; exported the first experiment only",
                first_experiment_id,
            )
            hcmo_container = filter_container_json(container_json, first_experiment_id)

        write_json(args.hcmo_json, container_to_hcmo_json(hcmo_container))

    if args.log_json:
        write_json(
            args.log_json,
            {
                "input": source_name,
                "warningCount": len(warnings),
                "warnings": warnings,
            },
        )

    if warnings:
        sys.stderr.write(f"Wrote {len(warnings)} ETL warning(s).\n")


if __name__ == "__main__":
    main()
