# Smart Farm AI - Guide de Lancement (Run Script)

Ce document décrit comment lancer l'intégralité du projet Smart Farm AI dans l'environnement local.

## Prérequis
- Docker (si vous souhaitez lancer l'environnement Sovereign complet avec ChromaDB/Ollama)
- Python 3.10+
- Node.js & npm (pour le frontend React/Vite)

## Lancement Automatique (Mode Lite/Développement)

Vous avez deux scripts PowerShell fournis dans le dossier `scripts/` pour démarrer l'application facilement.
Ouvrez PowerShell en tant qu'administrateur dans le dossier principal du projet `C:\Users\Mohamed\Desktop\FARM AI` et exécutez le script souhaité :

### 1. Démarrer en Mode Lite (Recommandé)
Ce script lance le Backend, le Frontend et le Worker IoT dans un seul terminal sans nécessiter Docker :
```powershell
.\scripts\run_v3_lite.ps1
```
*Le système ouvrira automatiquement votre navigateur sur `http://localhost:5173`.*

### 2. Démarrer en Mode Sovereign Complet
Si vous avez Docker allumé et que vous voulez utiliser les modèles locaux LLaMA et ChromaDB :
```powershell
.\scripts\run_v3_sovereign.ps1
```

---

## Lancement Manuel (Étape par Étape)

Si vous préférez ouvrir 3 terminaux séparés, voici les commandes manuelles :

### Terminal 1 : Backend (FastAPI)
```powershell
cd backend
..\.venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 : Frontend (React/Vite)
```powershell
cd frontend
npm install
npm run dev
```

### Terminal 3 : MQTT Worker (IoT Simulator)
```powershell
cd workers
..\.venv\Scripts\activate
$env:MQTT_BROKER='broker.hivemq.com'
python iot_simulator.py
```

## Accès à l'application
- **Interface Utilisateur (SaaS)** : `http://localhost:5173`
- **Documentation API Backend (Swagger)** : `http://localhost:8000/docs`
