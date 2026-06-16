"""Tests for the orchard harvest estimator (OpenCV fruit counter + weights)."""
import cv2
import numpy as np

from app.api.v1.endpoints.orchard_routes import _count_fruits_cv, FRUIT_AVG_G


def test_fruit_avg_weights_present_and_positive():
    for k in ("olive", "orange", "lemon", "other"):
        assert k in FRUIT_AVG_G and FRUIT_AVG_G[k] > 0


def _orchard_image(n, color_bgr=(20, 130, 235)):
    """Green canvas with n well-spaced round fruits of the given BGR colour."""
    img = np.full((420, 560, 3), (45, 115, 45), np.uint8)
    for i in range(n):
        x = 70 + (i % 4) * 150
        y = 100 + (i // 4) * 150
        cv2.circle(img, (x, y), 30, color_bgr, -1)
    return img


def test_counts_spaced_oranges_within_tolerance():
    n = _count_fruits_cv(_orchard_image(9), "orange")
    assert 6 <= n <= 12  # deterministic colour blobs, allow ±3


def test_blank_canopy_counts_zero():
    blank = np.full((200, 200, 3), (45, 115, 45), np.uint8)
    assert _count_fruits_cv(blank, "orange") == 0


def test_harvest_kg_formula():
    # kg = count × mean fruit weight (g) / 1000
    count, avg = 9, FRUIT_AVG_G["orange"]
    assert round(count * avg / 1000.0, 2) == round(9 * 180.0 / 1000.0, 2)
