# Déploiement Smart Farm AI sur Cloudflare

## La réalité technique (à lire en premier)

Cloudflare **Workers** exécute du JavaScript/WASM serverless — il **ne peut pas** faire
tourner votre backend FastAPI (Python), vos modèles YOLO (plusieurs Go), PostgreSQL,
MQTT, Redis, les WebSockets ni APScheduler.

Donc « tout dans Cloudflare » signifie concrètement :

```
   Navigateur
       │  (DNS + TLS + CDN Cloudflare)
       ▼
┌──────────────────────┐     ┌─────────────────────────────┐
│  Cloudflare Pages    │     │  Cloudflare Tunnel (nommé)  │
│  Frontend React      │────▶│  api.votredomaine.com       │
│  farmai.pages.dev    │ API │           │                 │
└──────────────────────┘     └───────────┼─────────────────┘
                                          ▼
                              Backend FastAPI + YOLO + Postgres
                              (votre PC / Oracle / VPS, port 8000)
```

Le backend tourne sur **une machine**, mais tout le trafic public passe par
Cloudflare. C'est le maximum réaliste, et c'est du vrai Cloudflare de bout en bout.

## Pré-requis
- Un compte Cloudflare (gratuit)
- **Un domaine ajouté à Cloudflare** (obligatoire pour un Tunnel nommé permanent
  et un domaine Pages personnalisé). Sans domaine → seulement le Quick Tunnel
  temporaire (voir `start_public.ps1`).

---

## Étape 1 — Backend via Cloudflare Tunnel (nommé, permanent)

```powershell
# 1. Authentifier cloudflared (ouvre le navigateur — choisir votre domaine)
.\cloudflared.exe tunnel login

# 2. Créer le tunnel
.\cloudflared.exe tunnel create farmai      # note l'UUID affiché

# 3. Router un sous-domaine vers le tunnel
.\cloudflared.exe tunnel route dns farmai api.votredomaine.com

# 4. Config : copier le modèle et remplir l'UUID + le chemin du .json
copy cloudflared\config.example.yml $HOME\.cloudflared\config.yml
#    -> éditer tunnel:, credentials-file:, hostname:

# 5. Démarrer le backend PUIS le tunnel
cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# (dans une autre fenêtre)
.\cloudflared.exe tunnel run farmai
```

Note : `VITE_WS_URL` est l'origine seule (`wss://api.votredomaine.com`), le code
ajoute `/ws/events`. Ne pas mettre `/ws` à la fin.

⚠️ Sur le backend, mettre dans `.env` :
```
CORS_ORIGINS=https://farmai.pages.dev,https://votredomaine.com
DEBUG=false
SECRET_KEY=<nouvelle clé : python -c "import secrets;print(secrets.token_hex(32))">
```

---

## Étape 2 — Frontend sur Cloudflare Pages

```powershell
cd frontend

# 1. Pointer le frontend vers le backend tunnelé
copy .env.cloudflare.example .env.production
#    -> éditer VITE_API_URL / VITE_WS_URL avec api.votredomaine.com

# 2. Build
npm run build

# 3. Authentifier wrangler (navigateur)
npx wrangler login

# 4. Déployer le dossier dist sur Pages
npx wrangler pages deploy dist --project-name=farmai
```

Cloudflare renvoie une URL `https://farmai.pages.dev`. Ajoutez votre domaine
personnalisé dans le dashboard Pages si souhaité.

`_redirects` (routing SPA) et `_headers` (sécurité) sont déjà dans `frontend/public/`
et seront publiés automatiquement.

---

## Alternative sans domaine — Démo temporaire (déjà prête)

```powershell
powershell -ExecutionPolicy Bypass -File start_public.ps1
```
→ une seule URL `https://xxxx.trycloudflare.com` (frontend + backend), change à
chaque redémarrage. Idéal pour une soutenance.

---

## Checklist sécurité avant production
- [ ] Régénérer `SECRET_KEY` (celle de `render.yaml` est exposée sur git)
- [ ] `DEBUG=false` sur le backend (active la validation des secrets au démarrage)
- [ ] `CORS_ORIGINS` = uniquement les domaines Pages/perso (jamais `*`)
- [ ] Régénérer la clé VAPID (exposée dans l'historique git)
- [ ] Activer l'auth Mosquitto si le broker est exposé (voir monitoring/mosquitto.conf)
