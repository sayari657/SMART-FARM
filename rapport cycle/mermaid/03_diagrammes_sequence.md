# Diagrammes de Séquence — Smart Farm AI v3.0

> Versions Mermaid des 5 diagrammes de séquence du rapport (`figures/SD1..SD5_*.png`).
> Chaque diagramme reflète le code réel (fichiers sources indiqués).

---

## SD1 — Authentification Propriétaire (JWT)
*Figure source : `SD1_Auth_JWT.png` — Source code : `backend/app/api/v1/endpoints/auth_routes.py`*

```mermaid
sequenceDiagram
    autonumber
    actor P as Propriétaire
    participant FE as Frontend (React)
    participant API as FastAPI<br/>POST /api/v1/auth/login
    participant AS as AuthService<br/>(auth_service.py)
    participant DB as SQLite / PostgreSQL
    participant JOSE as python-jose<br/>(JWT HS256)

    P->>FE: Saisie username + password
    FE->>API: POST /api/v1/auth/login<br/>{username, password}
    API->>AS: AuthService(db).login()
    AS->>DB: SELECT * FROM users WHERE username = ?

    alt Compte non trouvé
        DB-->>AS: aucun résultat
        AS-->>API: HTTPException 401
        API-->>FE: 401 Invalid credentials
        FE-->>P: Message d'erreur
    else Compte inactif (is_active = False)
        DB-->>AS: user
        AS-->>API: HTTPException 403
        API-->>FE: 403 Account disabled
        FE-->>P: Compte désactivé
    else Mot de passe incorrect
        DB-->>AS: user
        AS->>AS: bcrypt.verify(password, password_hash) → False
        AS-->>API: HTTPException 401
        API-->>FE: 401 Invalid credentials
        FE-->>P: Message d'erreur
    else Authentification réussie
        DB-->>AS: user
        AS->>AS: bcrypt.verify(password, password_hash) → True
        AS->>JOSE: create_access_token({sub, role}, expire = 7 jours)
        JOSE-->>AS: JWT signé HS256
        AS-->>API: {access_token, user}
        API-->>FE: 200 OK {access_token, token_type: "bearer"}
        FE->>FE: Stocker token (localStorage + AuthContext)
        FE-->>P: Redirection vers le Dashboard
    end
```

---

## SD2 — Authentification Ouvrier (OTP WhatsApp)
*Figure source : `SD2_Ouvrier_OTP.png` — Sources : `auth_service.py` + `otp_service.py`*

```mermaid
sequenceDiagram
    autonumber
    actor O as Ouvrier
    participant PWA as PWA Mobile (React)
    participant API as FastAPI<br/>/api/v1/auth/worker
    participant AS as AuthService<br/>(auth_service.py)
    participant OTP as OTPService<br/>(otp_service.py)
    participant WA as WhatsApp Cloud API
    participant DB as SQLite / PostgreSQL
    participant JOSE as python-jose<br/>(JWT HS256)

    rect rgb(235, 245, 255)
        Note over O,WA: Étape 1 — Demande OTP
        O->>PWA: Saisie numéro E.164 (+21621952358)
        PWA->>API: POST /auth/worker/request-otp {phone_number}
        API->>AS: worker_request_otp()
        AS->>DB: SELECT user WHERE phone_number = ? AND role = worker
        DB-->>AS: worker trouvé
        AS->>OTP: send_otp_whatsapp(phone_number)
        OTP->>OTP: Génère OTP 6 chiffres<br/>OTP_STORE[phone] — TTL 5 min
        alt WhatsApp API configurée
            OTP->>WA: POST /v1/messages (template OTP)
            WA-->>O: 📲 Message WhatsApp avec le code
        else Mode dev (non configurée)
            OTP->>OTP: Fallback — OTP affiché en console
        end
        OTP-->>AS: envoyé
        AS-->>API: ok
        API-->>PWA: 200 {"message": "OTP envoyé"}
        PWA-->>O: Écran de saisie du code
    end

    rect rgb(235, 255, 240)
        Note over O,JOSE: Étape 2 — Vérification OTP
        O->>PWA: Saisie du code à 6 chiffres
        PWA->>API: POST /auth/worker/verify-otp {phone_number, otp}
        API->>AS: worker_verify_otp()
        AS->>OTP: verify_otp(phone_number, otp)
        alt OTP invalide ou expiré
            OTP-->>AS: False
            AS-->>API: HTTPException 401
            API-->>PWA: 401 {"detail": "Code invalide ou expiré"}
            PWA-->>O: Message d'erreur
        else OTP valide
            OTP-->>AS: True
            AS->>JOSE: create_access_token({sub: user.id, role: "worker"})
            JOSE-->>AS: JWT Token
            AS-->>API: {access_token, worker_info}
            API-->>PWA: 200 OK {access_token, token_type: "bearer"}
            PWA->>PWA: Stocker JWT + Sync Dexie IndexedDB
            PWA-->>O: Accès tâches assignées (mode online + offline)
        end
    end
```

---

## SD3 — Pipeline IoT Temps Réel
*Figure source : `SD3_IoT_Telemetrie.png` — Source : `backend/app/main.py` (architecture réelle)*

```mermaid
sequenceDiagram
    autonumber
    participant N as Capteur IoT<br/>(Node A / Node B)
    participant POST as FastAPI<br/>POST /api/v1/iot/telemetry
    participant CSV as iot_telemetry.csv<br/>(fichier local)
    participant DASH as Frontend Dashboard<br/>(React)
    participant GET as FastAPI<br/>GET /api/v1/iot/latest
    participant WS as WebSocket<br/>/ws/telemetry

    Note over N,POST: Architecture réelle : IoT utilise REST → CSV (pas de broker MQTT)<br/>Node A : sol (humidité, pression, débit, temp)<br/>Node B : ruche (poids, temp couvain, temp ext, hum ext)

    rect rgb(255, 248, 235)
        Note over N,CSV: Envoi données capteur
        N->>POST: POST /api/v1/iot/telemetry<br/>{node: "NODE_B", metric: "Poids Ruche", value: 24.3}
        POST->>CSV: Append ligne [timestamp, NODE_B, weight, 24.3]
        CSV-->>POST: OK
        POST-->>N: 200 {"status": "ok"}
    end

    rect rgb(235, 245, 255)
        Note over DASH,GET: Lecture par le Dashboard
        DASH->>GET: GET /api/v1/iot/latest
        GET->>CSV: Lire CSV en sens inverse<br/>(scan jusqu'aux 7 métriques A et 4 métriques B)
        CSV-->>GET: Dernières valeurs par métrique
        GET->>GET: Mapper les noms :<br/>"Poids Ruche" → weight, "Temp Couvain" → hive_temp,<br/>"Humidité Sol" → soil…
        GET-->>DASH: 200 OK {nodeA: {soil, pressure, flow, temp, pump, valve, fault},<br/>nodeB: {weight, hive_temp, ext_temp, ext_hum}}
        DASH->>DASH: Met à jour les jauges du tableau de bord
    end

    rect rgb(235, 255, 240)
        Note over DASH,GET: Historique IoT
        DASH->>GET: GET /api/v1/iot/history?limit=50
        GET->>CSV: Lire tout le CSV — grouper par timestamp
        CSV-->>GET: Snapshots chronologiques
        GET-->>DASH: {nodeA: [...], nodeB: [...]}
        DASH->>DASH: Dessine graphiques Recharts
    end

    rect rgb(245, 240, 255)
        Note over DASH,WS: WebSocket — push temps réel
        Note over WS: /ws/telemetry : connexion ouverte par le Dashboard.<br/>Le serveur broadcaste alertes et événements via ConnectionManager.<br/>(Pas de flux MQTT côté main.py)
    end
```

---

## SD4 — Détection Maladie par Vision par Ordinateur (YOLO)
*Figure source : `SD4_CV_Detection.png` — Source : `backend/app/api/v1/endpoints/cv_routes.py`*

```mermaid
sequenceDiagram
    autonumber
    actor P as Propriétaire
    participant FE as Frontend (React)
    participant API as FastAPI<br/>POST /api/v1/cv/detect
    participant CVS as CVService<br/>+ get_yolo_model()
    participant YOLO as YOLO Model<br/>(Ultralytics)
    participant AGT as Diagnostic / Agent<br/>(RAG + MLLM)
    participant CHR as ChromaDB
    participant LLV as Ollama LLaVA
    participant DB as SQLite / PostgreSQL
    participant WS as WebSocket<br/>/ws/events

    P->>FE: Upload photo + sélection catégorie
    Note right of FE: Catégories (MODEL_REGISTRY) :<br/>bee, goat, cow, sheep, livestock, leaves,<br/>olive, insects, lemon, orange, fire, plants
    FE->>API: POST /api/v1/cv/detect<br/>{image_base64, category, unit_id}
    API->>CVS: get_yolo_model(category)
    CVS->>CVS: Vérifie cache _models[key]<br/>Charge YOLO si absent
    CVS->>YOLO: model.predict(image, conf=0.5)
    YOLO-->>CVS: Detections : [{class, conf, bbox}]
    CVS->>DB: INSERT INTO cv_events<br/>(unit_id, timestamp, object_class, confidence,<br/>severity, thumbnail_url, frame_metadata, camera_id)
    Note right of DB: Champs corrects :<br/>thumbnail_url (pas image_url)<br/>frame_metadata (pas bbox_metadata)
    DB-->>CVS: CVEvent créé
    CVS-->>API: {detections, event_id}

    API->>AGT: generate_recommendation(detections, image)
    AGT->>CHR: semantic_search(object_class + context)
    CHR-->>AGT: Knowledge chunks
    AGT->>LLV: chat(model="llava", image, context)
    LLV-->>AGT: {probable_cause, recommendation_text, urgency_level}
    AGT->>DB: INSERT INTO recommendations<br/>(unit_id, alert_id, timestamp, probable_cause,<br/>recommendation_text, urgency_level,<br/>confidence_score, is_actioned=False)
    Note right of DB: is_actioned (pas is_applied)<br/>timestamp (pas created_at)
    DB-->>AGT: Recommendation créée

    alt Sévérité critique (fire / predator)
        AGT->>DB: INSERT INTO alerts<br/>(unit_id, timestamp, alert_type, message,<br/>severity="critical", is_resolved=False)
        Note right of DB: Pas de farm_id ni de source<br/>dans la table alerts
        DB-->>AGT: Alert créée
        AGT->>WS: broadcast(tenant_id, {event: "new_alert", ...})
        WS-->>FE: 🔔 Notification urgente
    end

    AGT-->>API: {recommendation, alert_id?}
    API-->>FE: 200 OK {detections, recommendation, cv_event_id}
    FE-->>P: Affiche bounding boxes +<br/>diagnostic IA + recommandation
```

---

## SD5 — Flux Gestion Apicole (Visite → Besoin → Planning → Stock)
*Figure source : `SD5_Bee_Workflow.png` — Sources : `bee_history.py` + `bee_planning.py`*

```mermaid
sequenceDiagram
    autonumber
    actor A as Apiculteur
    participant FE as Frontend (AboutBee)
    participant API as FastAPI<br/>/bee/history · /bee/planning
    participant DB as SQLite / PostgreSQL
    participant PLN as BeePlanning Service
    participant STK as BeeStock Service

    rect rgb(255, 250, 235)
        Note over A,DB: Consulter le profil de la ruche
        A->>FE: Sélectionne ruche HIVE-0042
        FE->>API: GET /api/v1/bee/hives/42
        API->>DB: SELECT * FROM bee_hives WHERE id = 42<br/>SELECT * FROM bee_visits WHERE hive_id = 42<br/>ORDER BY visit_date DESC LIMIT 5
        DB-->>API: {hive, visits, stock}
        API-->>FE: Profil complet de la ruche
    end

    rect rgb(235, 245, 255)
        Note over A,STK: Enregistrer une visite
        A->>FE: Remplit formulaire de visite
        FE->>API: POST /api/v1/bee/history<br/>{hive_id: 42, visit_date: "15/01/2026",<br/>health_state: "warning", force_level: 3.0,<br/>harvest_kg: 0, needs_sirop: 5.0,<br/>needs_traitement: 2.0, notes: "Varroase suspectée"}
        Note right of API: needs_sirop = Float (litres)<br/>needs_traitement = Float (doses)<br/>visit_date = String (format fr-FR)<br/>health_state : health | warning | urgent
        API->>DB: INSERT INTO bee_visits<br/>(..., force_level=3.0, needs_sirop=5.0,<br/>needs_traitement=2.0)
        API->>DB: UPDATE bee_hives SET health_score=35,<br/>force_level=3.0, last_visit_date=now()<br/>WHERE id=42
        Note right of DB: force_level (pas force_score)
        DB-->>API: Visit id=891, Hive mis à jour

        API->>PLN: check_and_create_planning(hive_id=42, needs)
        PLN->>DB: SELECT * FROM bee_planning<br/>WHERE hive_id=42 AND status="pending"
        DB-->>PLN: Aucune mission active
        PLN->>DB: INSERT INTO bee_planning<br/>{hive_id: 42, apiary_id: 5, action_type: "treatment",<br/>scheduled_date: "18/01/2026", predicted_traitement: 2,<br/>predicted_sirop: 5, status: "pending"}
        Note right of DB: action_type (pas type)<br/>pas de champ title<br/>scheduled_date = String
        DB-->>PLN: BeePlanning id=44

        API->>STK: check_stock(sirop, traitement)
        STK->>DB: SELECT sirop, traitement, sirop_min, traitement_min<br/>FROM bee_global_stock WHERE id=1
        Note right of DB: Champs : sirop (pas sirop_liters)<br/>traitement (pas traitement_units)
        DB-->>STK: {sirop: 12, sirop_min: 50,<br/>traitement: 2, traitement_min: 10}

        alt Stock inférieur au seuil minimum
            STK->>DB: INSERT INTO warehouse_alerts<br/>{alert_type: "stock_low", item_name: "Traitement Varroa",<br/>severity: "warning", message: "Stock faible…"}
            Note right of DB: alert_type = stock_low<br/>(pas low_stock)
            DB-->>STK: WarehouseAlert créée
            STK-->>API: {warning: "Stock traitement insuffisant"}
        else Stock OK
            STK-->>API: {status: "OK"}
        end

        API-->>FE: 201 Created<br/>{visit_id: 891, planning_id: 44, stock_warning?: "…"}
        FE-->>A: ✅ Visite enregistrée<br/>📅 Mission planifiée le 18/01/2026<br/>⚠️ Alerte stock si besoin
    end
```
