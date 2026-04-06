# Bee Detection Model: Detailed Configuration 🧠

This document explains the configuration of the YOLO model located in this directory, based on the `args.yaml` and `beedata_kaggle.yaml` files.

## 🛠️ Training Configuration (`args.yaml`)

- **Task Type**: `obb` (Oriented Bounding Box). Unlike standard boxes, this model detects the **rotation** of the bees, which is crucial for understanding movement patterns and hive density.
- **Model Architecture**: `yolo26n-obb.pt` (A lightweight, high-speed variant optimized for real-time inference).
- **Inference Resolution**: `768x768`. The model expects images of this size to maintain high detection accuracy.
- **Optimizer**: `AdamW` (A modern optimizer that handles weight decay more effectively).
- **Epochs**: `120` (Number of training passes over the entire dataset).
- **Confidence Threshold**: Typically set to `0.5` for balanced precision/recall.

## 🐝 Data Classes (`beedata_kaggle.yaml`)

The model is trained to recognize 4 distinct categories of bees:

| ID | Class | Emoji | Description |
|---|---|---|---|
| 0 | **bee** | 🐝 | Standard worker bee. |
| 1 | **drone** | ♂️ | Larger male bee, indicates hive reproductive state. |
| 2 | **pollenbee** | 🎒 | Worker bee carrying pollen (indicates foraging success). |
| 3 | **queen** | 👑 | The colony's queen (highest priority detection). |

## 🚀 Integration

The Smart Farm AI platform uses this model to:
1. **Count populations**: Track the ratio of drones to workers.
2. **Monitor foraging**: Analyze how many bees are returning with pollen.
3. **Queen Tracking**: Ensure the queen is present and healthy.
