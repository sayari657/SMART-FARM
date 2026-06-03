# Changelog — Smart Farm AI

All notable changes to this project are documented here.
Format: [Semantic Versioning](https://semver.org) · [Keep a Changelog](https://keepachangelog.com)

---

## [3.1.0] — 2026-06-02 — Niveau Production Maximum

### Added — SuperAdmin Portal (10 pages)
- `/superadmin` — Dashboard avec KPIs plateforme, MRR/ARR, sparkline charts (recharts)
- `/superadmin/tenants` — Gestion tenants avec changement de plan en 1 clic
- `/superadmin/users` — CRUD complet utilisateurs (create, edit, reset password, impersonate)
- `/superadmin/plans` — Visualisation des 3 plans (Free/Pro/Enterprise) avec limites
- `/superadmin/flags` — Feature flags temps réel (12 flags, toggle + sauvegarde)
- `/superadmin/models` — Vue des 19 modèles AI depuis MLflow
- `/superadmin/audit` — Journal d'audit de toutes les actions superadmin
- `/superadmin/broadcast` — Envoi de messages broadcast (all/owner/worker)
- `/superadmin/system` — Santé système, PWA version control, DB backup
- `/superadmin/2fa` — Configuration TOTP Google Authenticator pour superadmin

### Added — Sécurité
- 2FA TOTP (pyotp) — setup/verify/disable/validate endpoints
- Colonnes DB : `totp_secret`, `totp_enabled`, `stripe_customer_id`
- Audit log complet pour toutes les actions superadmin
- Impersonation token (1h) pour debug tenant

### Added — Infrastructure
- Redis 7 dans docker-compose (caching + sessions)
- Mosquitto MQTT 2 dans docker-compose (WebSocket port 9001 inclus)
- APScheduler : 4 jobs automatiques (drift check, plan expiry, audit cleanup, daily push)
- FCM Push Notifications service (branché sur tokens existants)
- Stripe Billing (checkout, portail client, webhooks)

### Added — IoT
- Page `/iot-devices` — CRUD capteurs IoT (type, label, emplacement, topic MQTT)
- Endpoint `POST /iot/devices/ping` — heartbeat depuis hardware ESP32
- Summary KPIs : total/actifs/hors-ligne/par-type

### Added — Real-time
- `useWebSocket` hook — reconnexion exponentielle, multi-events
- `NotificationBell` — cloche dans Navbar, WebSocket + broadcasts API polling
- `usePWAVersion` — polling `/version.json` toutes les 10 min, force reload

### Added — MLOps
- Script `register_all_models_mlflow.py` — 19 modèles enregistrés (14 YOLO + 5 Poultry ML)
- MLflow UI dans `start_all.ps1` (port 5000)
- Per-epoch training curves dans MLflow (mAP50, precision, recall)

### Added — DevOps
- `.github/workflows/ci.yml` — 5 jobs : backend tests, lint, frontend build, Vitest, Playwright E2E
- `.github/workflows/cd.yml` — Docker build+push + SSH deploy
- `.cursor/` — Configuration Cursor complète (rules, mcp.json, snippets)
- `.cursorignore` — Exclusions pour indexation IA
- `.vscode/tasks.json` — 10 tâches (Start All, Tests, MLflow, Seed, etc.)

### Fixed
- Scroll bloqué sur `/recommendations` — wrapper `<>` → `<div flexDirection column>`
- `@cached` appliqué sur 5 endpoints lourds (dashboard/stats, analytics, alerts, recs, superadmin/stats)
- `stripe_customer_id` column migrée via ALTER TABLE idempotent
- i18n : clé `sidebar.iot_devices` ajoutée (fr/en/ar)

---

## [3.0.0] — 2026-05-01 — Version Enterprise Initiale

### Added
- Architecture multi-tenant complète (FarmGuard isolation)
- 41 endpoints FastAPI v1 + 3 endpoints v2
- 14 modèles YOLO v11 entraînés (animaux + plantes + alertes)
- RAG Souverain (ChromaDB + Ollama + LangChain)
- Module apiculture complet (ruches, visites, production, stock, finances)
- Module volaille ERP (FCR, mortalité, ponte, anomalies)
- WebSocket temps réel `/ws/events` (tenant-aware)
- Worker PWA (OTP WhatsApp, offline Dexie, QR scanner)
- Prometheus + Grafana monitoring
- Docker Compose (prod + dev + monitoring + GIS)
- ESP32 IoT nodes (PlatformIO + Wokwi simulation)

---

## [2.0.0] — 2026-03-01 — Refonte Architecture

### Added
- Migration vers FastAPI (depuis Django)
- SQLAlchemy 2.0 async-ready
- JWT + refresh tokens
- React 18 + Vite 5 PWA
- Dark theme design system

---

## [1.0.0] — 2026-01-01 — Version Initiale

### Added
- MVP : gestion fermes + animaux + alertes basiques
- Dashboard simple
- Authentification basique
