import os
import sys
import yaml
import mlflow
import pandas as pd
from mlflow.tracking import MlflowClient

# Get absolute path to the backend directory to access config
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, 'backend')
if os.path.exists(backend_path):
    sys.path.append(backend_path)

try:
    from app.core.config import settings
except ImportError:
    class Settings:
        YOLO_BEE_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\bee\final_export\best.pt"
        YOLO_GOAT_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\best.pt"
        YOLO_LEAVES_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\Detection diseases Leaves\best.pt"
        YOLO_OLIVE_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model olive-tree-diseases\best.pt"
        YOLO_INSECTS_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model insects_final\best.pt"
        YOLO_FIRE_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\Alert\model-fire-detection-and-smoke\best.pt"
    settings = Settings()

# Configure MLflow
mlflow.set_tracking_uri("sqlite:///mlflow.db")
EXPERIMENT_NAME = "SmartFarm_Vision_Inventory"
mlflow.set_experiment(EXPERIMENT_NAME)

MODELS_TO_REGISTER = {
    "Bee_Detection": settings.YOLO_BEE_PATH,
    "Livestock_Detection": settings.YOLO_GOAT_PATH,
    "Plant_Diseases_Leaves": settings.YOLO_LEAVES_PATH,
    "Olive_Tree_Diseases": settings.YOLO_OLIVE_PATH,
    "Insect_Detection": settings.YOLO_INSECTS_PATH,
    "Fire_Smoke_Detection": settings.YOLO_FIRE_PATH
}

def register_all_advanced():
    client = MlflowClient()
    
    for model_name, path in MODELS_TO_REGISTER.items():
        if not os.path.exists(path):
            print(f"Skipping {model_name}: Path not found {path}")
            continue
            
        model_dir = os.path.dirname(path)
        print(f"\n--- Processing {model_name} (Dir: {model_dir}) ---")
        
        with mlflow.start_run(run_name=f"Ingestion_{model_name}"):
            # 1. Log System Info
            mlflow.log_params({
                "original_path": path,
                "framework": "Ultralytics YOLOv8",
                "task": "detection/obb"
            })
            
            # 2. Log Hyperparameters from args.yaml
            args_path = os.path.join(model_dir, 'args.yaml')
            if os.path.exists(args_path):
                try:
                    with open(args_path, 'r') as f:
                        args = yaml.safe_load(f)
                        # Log subset of interesting params
                        important_keys = ['model', 'data', 'epochs', 'patience', 'batch', 'imgsz', 'save', 'device', 'optimizer', 'lr0', 'weight_decay']
                        params_to_log = {k: str(args[k]) for k in important_keys if k in args}
                        mlflow.log_params(params_to_log)
                        mlflow.log_artifact(args_path, "metadata")
                except Exception as e:
                    print(f"Error logging args for {model_name}: {e}")

            # 3. Log Metrics from results.csv
            results_path = os.path.join(model_dir, 'results.csv')
            if os.path.exists(results_path):
                try:
                    df = pd.read_csv(results_path)
                    df.columns = df.columns.str.strip()
                    if not df.empty:
                        # Log final metrics
                        last_row = df.iloc[-1]
                        metrics = {}
                        for col in df.columns:
                            if any(m in col.lower() for m in ['val/', 'metrics/']):
                                # Sanitize key for MLflow (removes parentheses like (B) or (M))
                                safe_key = col.replace('(','_').replace(')','')
                                metrics[safe_key] = float(last_row[col])
                        mlflow.log_metrics(metrics)
                        mlflow.log_artifact(results_path, "metrics_data")
                        print(f"Logged {len(metrics)} final metrics.")
                except Exception as e:
                    print(f"Error logging metrics for {model_name}: {e}")

            # 4. Log Visual Artifacts (Images and Curves)
            for f in os.listdir(model_dir):
                if f.endswith(('.png', '.jpg', '.jpeg')):
                    target_dir = "visuals"
                    if 'curve' in f.lower(): target_dir = "curves"
                    if 'confusion' in f.lower(): target_dir = "analysis"
                    if 'batch' in f.lower(): target_dir = "val_batches"
                    
                    mlflow.log_artifact(os.path.join(model_dir, f), target_dir)
            
            # 5. Log the actual model file
            mlflow.log_artifact(path, "model_files")
            
            # 6. Register/Update in Model Registry
            run_id = mlflow.active_run().info.run_id
            try:
                try:
                    client.create_registered_model(model_name)
                except: pass
                
                source_uri = f"runs:/{run_id}/model_files"
                client.create_model_version(name=model_name, source=source_uri, run_id=run_id)
                print(f"Successfully registered {model_name} version.")
            except Exception as e:
                print(f"Registration failed for {model_name}: {e}")

if __name__ == "__main__":
    register_all_advanced()
