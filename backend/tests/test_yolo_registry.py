"""Regression tests for YOLO category-to-model routing."""

from app.api.v1.endpoints import cv_routes


def test_specialized_cow_behavior_model_is_not_remapped():
    assert cv_routes.resolve_model_key("cow_behavior") == "cow_behavior"


def test_species_aliases_use_livestock_detector():
    for category in ("goat", "cow", "cattle", "sheep"):
        assert cv_routes.resolve_model_key(category) == "livestock"


def test_unknown_model_category_does_not_fall_back_to_bee(monkeypatch):
    cv_routes._models.clear()
    monkeypatch.setattr(cv_routes, "HAS_YOLO", True)

    assert cv_routes.get_yolo_model("unknown-category") is None


def test_cow_behavior_loads_its_configured_weight(monkeypatch):
    loaded_paths = []

    class FakeYOLO:
        def __init__(self, path):
            loaded_paths.append(path)

    cv_routes._models.clear()
    monkeypatch.setattr(cv_routes, "HAS_YOLO", True)
    monkeypatch.setattr(cv_routes, "YOLO", FakeYOLO)
    monkeypatch.setattr(cv_routes.os.path, "exists", lambda _path: True)

    model = cv_routes.get_yolo_model("cow_behavior")

    assert isinstance(model, FakeYOLO)
    assert loaded_paths == [cv_routes.MODEL_REGISTRY["cow_behavior"]]
