@echo off
REM DeepForest tree-detection microservice — listens on :8800 (matches DEEPFOREST_URL).
REM First run downloads the pretrained NEON crown model from HuggingFace.
cd /d "%~dp0"
".venv\Scripts\python.exe" -m uvicorn service:app --host 0.0.0.0 --port 8800
