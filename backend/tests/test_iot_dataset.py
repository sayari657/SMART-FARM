"""Tests for the IoT fine-tuning dataset builder (services/iot_dataset.py)."""
import json

from app.services import iot_dataset


def test_build_examples_nonempty_and_well_formed():
    ex = iot_dataset.build_jsonl_examples()
    assert len(ex) > 50  # architecture + irrigation + safety + beehive
    for e in ex[:5] + ex[-5:]:
        roles = [m["role"] for m in e["messages"]]
        assert roles == ["system", "user", "assistant"]
        assert all(m["content"].strip() for m in e["messages"])


def test_to_jsonl_every_line_is_valid_json():
    text = iot_dataset.to_jsonl(iot_dataset.build_jsonl_examples())
    lines = [ln for ln in text.splitlines() if ln.strip()]
    assert lines, "JSONL should not be empty"
    for ln in lines:
        obj = json.loads(ln)            # raises if a line is malformed
        assert "messages" in obj and len(obj["messages"]) == 3


def test_irrigation_decision_rules():
    # dry soil + favourable morning window → start irrigation
    dry_fav = iot_dataset._irrigation_decision(15, 6).lower()
    assert "vanne" in dry_fav and "pompe" in dry_fav
    # wet soil → no irrigation
    assert "humide" in iot_dataset._irrigation_decision(60, 6).lower()
    # dry but midday → wait for the evening window
    assert "soir" in iot_dataset._irrigation_decision(15, 13).lower()


def test_real_telemetry_rows_become_examples():
    rows = [{
        "timestamp": "2026-06-16T06:00:00", "unit_id": 1, "unit_name": "ruche_01",
        "unit_type": "bee", "source": "mqtt", "metrics": {"brood_temp": 35.1},
    }]
    base = len(iot_dataset.build_jsonl_examples())
    withrows = len(iot_dataset.build_jsonl_examples(rows))
    assert withrows == base + 1


def test_telemetry_to_csv_expands_metric_columns():
    rows = [
        {"timestamp": "t1", "unit_id": 1, "unit_name": "h1", "unit_type": "bee",
         "source": "mqtt", "metrics": {"weight": 38.2, "brood_temp": 35.1}},
        {"timestamp": "t2", "unit_id": 1, "unit_name": "h1", "unit_type": "bee",
         "source": "mqtt", "metrics": {"weight": 38.3}},
    ]
    csv = iot_dataset.telemetry_to_csv(rows)
    lines = csv.strip().splitlines()
    header = lines[0]
    assert header.startswith("timestamp,unit_id,unit_name,unit_type,source")
    assert "weight" in header and "brood_temp" in header
    assert len(lines) == 3  # header + 2 rows


def test_telemetry_to_csv_empty_has_header_only():
    csv = iot_dataset.telemetry_to_csv([])
    assert csv.strip() == "timestamp,unit_id,unit_name,unit_type,source"
