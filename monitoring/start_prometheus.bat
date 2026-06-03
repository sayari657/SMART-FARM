@echo off
echo Starting Prometheus for Smart Farm AI...
start "Prometheus" "%~dp0prometheus.exe" ^
  --config.file="%~dp0prometheus.yml" ^
  --storage.tsdb.path="%~dp0data" ^
  --storage.tsdb.retention.time=15d ^
  --web.listen-address=0.0.0.0:9090 ^
  --web.enable-lifecycle
timeout /t 3 /nobreak >nul
start http://localhost:9090/targets
echo Prometheus running at http://localhost:9090
