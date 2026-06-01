# Rapport d'Analyse Critique — Smart Farm AI v3.0
**Modèle**: Claude Opus 4.8 · Max Thinking · 2026-06-01  
**Auteur de l'analyse**: Assistant IA (analyse statique complète du code)  
**Scope**: Architecture, Sécurité, Logique métier, Isolation des données, Graphiques dynamiques

---

## Résumé Exécutif

L'application est **techniquement impressionnante** — 151+ endpoints, IoT, ML, vision, LLM, GIS — mais elle souffre de **défauts de conception fondamentaux** qui menacent directement son objectif principal : **chaque ferme doit avoir la confidentialité de ses propres données**.  
La quasi-totalité des endpoints retourne des données de **toutes les fermes confondues**, ce qui rend les graphiques dynamiques **sans sens agronomique** et constitue une **violation de la vie privée** entre propriétaires.

---

## NIVEAU CRITIQUE — Isolation des données (Multi-tenancy)

### 🔴 BUG #1 : `GET /farms` retourne TOUTES les fermes à tous les utilisateurs

**Fichier** : `backend/app/api/v1/endpoints/farm_routes.py:64-81`

```python
@router.get("", response_model=List[dict])
def list_farms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FarmService(db)
    results = svc.list_farms()   # ← aucun filtre par user
```

**Impact** : L'utilisateur A voit toutes les fermes de l'utilisateur B. Le propriétaire d'une seule ferme voit les fermes de tous ses concurrents.

**Correction requise** :
```python
def list_farms(db=Depends(get_db), user=Depends(get_current_user)):
    owned = db.query(Farm).join(FarmOwner).filter(FarmOwner.owner_id == user.id)
    return owned.all()
```

---

### 🔴 BUG #2 : `PUT /farms/{farm_id}` et `DELETE /farms/{farm_id}` sans vérification de propriété

**Fichier** : `farm_routes.py:120-128`

```python
@router.put("/{farm_id}")
def update_farm(farm_id: int, data: FarmUpdate, db=Depends(get_db), _=Depends(get_current_user)):
    return FarmService(db).update_farm(farm_id, data)  # ← n'importe quel user peut modifier

@router.delete("/{farm_id}", status_code=204)
def delete_farm(farm_id: int, db=Depends(get_db), _=Depends(get_current_user)):
    FarmService(db).delete_farm(farm_id)  # ← n'importe quel user peut supprimer
```

**Impact** : Toute personne authentifiée peut supprimer la ferme de quelqu'un d'autre. **IDOR critique**.

---

### 🔴 BUG #3 : `GET /animals` retourne tous les animaux de toutes les fermes

**Fichier** : `animal_routes.py:35-64`

```python
@router.get("")
def list_animals(farm_id: Optional[int] = Query(None), ...):
    units = AnimalService(db).list_animals(farm_id=farm_id, species=species)
    # PUIS :
    hives = db.query(BeeHive).options(_jl(BeeHive.apiary)).all()  # ← TOUTES les ruches, même quand farm_id est fourni
```

**Double problème** :
1. Sans `farm_id`, retourne les animaux de **tous** les propriétaires
2. Les ruches (BeeHive) sont systématiquement retournées **sans filtre farm_id** même lorsque `farm_id` est passé

---

### 🔴 BUG #4 : `GET /alerts`, `/anomalies/recent`, `/recommendations` — sans isolation farm

**Fichier** : `other_routes.py:56-58, 33-34, 147-154`

```python
@alert_router.get("")
def list_alerts(limit=200, db=Depends(get_db), _=Depends(get_current_user)):
    return AlertService(db).list_alerts()  # ← TOUTES les alertes, toutes fermes

@anomaly_router.get("/recent")
def recent_anomalies(limit=50, db=Depends(get_db), _=Depends(get_current_user)):
    return AnomalyService(db).get_recent(limit=limit)  # ← idem
```

**Impact** : Le propriétaire de la Ferme A voit les alertes sanitaires de la Ferme B — violation directe de la confidentialité.

---

### 🔴 BUG #5 : Dashboard stats et analytics agrègent TOUTES les fermes

**Fichier** : `data_service.py:286-328` et `other_routes.py:233-303`

```python
def get_stats(self) -> DashboardStats:
    total_farms  = self.db.query(func.count(Farm.id)).scalar()    # toutes
    total_units  = self.db.query(func.count(AnimalUnit.id)).scalar()  # tous
    active_alerts = self.db.query(func.count(Alert.id)).filter(...)   # tous
```

**Impact graphique direct** : Le graphique "Chronologie Anomalies & Alertes" sur la page Analytics mélange les données de toutes les fermes. **Les graphiques n'ont aucun sens agronomique** — un pic d'alertes peut appartenir à une autre ferme.

**Correction requise** : Passer `owner_id` dans chaque query et joindre via `FarmOwner`.

---

### 🔴 BUG #6 : Module Smart Bee entièrement déconnecté du système d'ownership

**Fichier** : `models/domain.py:507-521` — `BeeApiary`

```python
class BeeApiary(Base):
    __tablename__ = "bee_apiaries"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    # ... AUCUN owner_id, AUCUN farm_id, AUCUN user_id
```

**Et `BeeGlobalStock`** (`domain.py:627-643`) :
```python
class BeeGlobalStock(Base):
    """Stock entrepôt global de l'exploitation apicole (singleton)."""
    # ← Un seul enregistrement pour TOUS les apiculteurs
    # User A et User B partagent le même stock
```

**Impact catastrophique** :
- Tous les apiaires sont visibles par tous les utilisateurs
- Le stock global est partagé entre tous les apiculteurs — si l'utilisateur A consomme du sirop, l'utilisateur B voit son stock diminuer
- `BeeStockLog`, `BeeHiveStock`, `BeeExpense`, `BeePlanning` : même problème, aucune isolation

---

### 🔴 BUG #7 : Warehouse (Entrepôt) sans isolation farm

**Fichier** : `models/domain.py:703-751` — `WarehouseCategory`, `WarehouseItem`

```python
class WarehouseCategory(Base):
    id = Column(Integer, primary_key=True)
    name_ar = Column(String(100), nullable=False)
    # ← pas de farm_id → une seule liste de catégories pour tous
```

Toutes les fermes partagent le même entrepôt. Le propriétaire de la Ferme A voit et peut modifier l'inventaire de la Ferme B.

---

### 🔴 BUG #8 : Worker tasks — owner voit les tâches de TOUTES les fermes

**Fichier** : `worker_tasks.py:69-71`

```python
if current_user.role == "worker":
    tasks = db.query(WorkerTask).filter(WorkerTask.worker_id == current_user.id).all()
else:
    tasks = db.query(WorkerTask).all()  # ← TOUTES les tâches de toutes les fermes
```

Un propriétaire voit les tâches des ouvriers de tous les autres propriétaires.

---

## NIVEAU CRITIQUE — Problèmes de Logique Graphique

### 🔴 BUG #9 : Dashboard affiche des données IoT STATIQUES comme si elles étaient dynamiques

**Fichier** : `frontend/src/pages/Dashboard.jsx:71-74`

```javascript
const [iotData, setIotData] = useState({
    nodeA: { soil: 45.2, pressure: 0.5, flow: 12.8, temp: 23.4 },
    nodeB: { weight: 46.5, broodTemp: 34.8, extTemp: 28.2, extHum: 58.9 }
});
```

**Problème de logique** : Si l'API `/iot/latest` échoue (backend hors ligne, ferme sans capteurs), les jauges affichent `45.2% d'humidité`, `34.8°C couvain` — des valeurs **qui paraissent réelles** mais sont fictives. L'agriculteur croit surveiller sa ferme en temps réel alors qu'il regarde des données hardcodées depuis le jour du déploiement.

**Impact** : Prise de décision incorrecte (irrigation, santé des ruches) basée sur des données fantômes.

---

### 🔴 BUG #10 : Télémétrie du Dashboard affiche toujours le 1er animal de toutes les fermes

**Fichier** : `Dashboard.jsx:117-119`

```javascript
const units = Array.isArray(unitsRes.data) ? unitsRes.data : [];
if (units.length > 0) {
    telemetryAPI.history(units[0].id, 48).then(r => setRT(r.data));
}
```

`unitsRes.data` = tous les animaux de toutes les fermes. `units[0]` = le premier animal dans la DB globale — peut appartenir à une autre ferme. Le graphique "Telemetry Trend (Last 48h)" affiche les données d'un animal aléatoire qui n'appartient pas forcément à la ferme sélectionnée.

---

### 🔴 BUG #11 : Météo du Dashboard toujours pour la 1ère ferme de la liste globale

**Fichier** : `Dashboard.jsx:121-129`

```javascript
const farmsList = Array.isArray(farmsRes.data) ? farmsRes.data : [];
if (farmsList.length > 0) {
    externalAPI.weather.current(farmsList[0].id)  // ← 1ère ferme globale
```

Si l'utilisateur a sélectionné "Ferme 3" dans le contexte d'authentification (`AuthContext.farmId`), le Dashboard ignore cette sélection et affiche la météo de la 1ère ferme dans la liste de toutes les fermes. **Les données météo ne correspondent pas à la ferme affichée**.

---

### 🔴 BUG #12 : Analytics page — graphiques sans contexte de ferme

**Fichier** : `frontend/src/pages/Analytics.jsx:36-44`

```javascript
const load = (d) => {
    dashboardAPI.analytics(d)  // ← pas de farm_id dans l'appel
```

Le backend retourne des analytics agrégées de toutes les fermes (`other_routes.py:234` — aucun filtre par farm). Les graphiques "Chronologie Anomalies & Alertes" et "Santé par Espèce" mélangent les données de toutes les fermes. **Un agriculteur qui possède une ferme de bovins voit la santé moyenne faussée par les ruches d'un autre agriculteur**.

---

### 🟠 BUG #13 : Calcul du Risk Score météo est arbitraire et sans unité

**Fichier** : `Dashboard.jsx:232-237`

```javascript
const activeRisks = [weather.risks?.heat_stress, weather.risks?.storm_risk, 
                     weather.risks?.drought_risk, weather.risks?.frost_risk].filter(Boolean).length;
const score = activeRisks === 0 ? 12 : activeRisks === 1 ? 52 : activeRisks === 2 ? 74 : 90;
```

Le score de risque passe de 12 à 52 (+333%) pour un seul risque actif, puis +42% pour le second. **Cette progression n'a aucune base agronomique ou statistique** — c'est un mapping arbitraire qui apparaît comme une métrique scientifique sur le Dashboard.

---

### 🟠 BUG #14 : `avgHealth` dans Analytics calculé incorrectement

**Fichier** : `Analytics.jsx:50-53`

```javascript
const avgHealth = data?.species_health?.length
    ? (data.species_health.reduce((s, r) => s + r.avg_health, 0) / data.species_health.length).toFixed(1)
    : '—';
```

**Problème** : Moyenne des moyennes sans pondération par le nombre d'unités. Si "bee" a 50 ruches à 95% et "cow" a 1 vache à 20%, la moyenne affichée est `(95+20)/2 = 57.5%` au lieu de `(50*95 + 1*20)/51 = 94%`. **Le KPI "Santé moy. espèces" est mathématiquement faux**.

---

### 🟠 BUG #15 : Graphique Pie "Distribution des Alertes" peut exclure "info"

**Fichier** : `Analytics.jsx:155-159` et `other_routes.py:270-274`

Le backend regroupe par `Alert.severity` — mais le rendu frontend mappe uniquement `critical`, `warning`, et `info` dans `PALETTE`. Le niveau `"anomaly"` dans la palette ne correspond à aucune valeur de `Alert.severity` dans le modèle. **Les couleurs du pie chart sont incohérentes avec l'enum `AlertSeverity`**.

---

## NIVEAU ÉLEVÉ — Sécurité & Logique Métier

### 🟠 BUG #16 : Rôle par défaut "operator" n'existe pas dans l'Enum

**Fichier** : `models/domain.py:86`

```python
role = Column(String(20), default="operator")
```

Mais `UserRole` Enum (`domain.py:36-38`) ne contient que `owner` et `worker`. Le rôle `"operator"` n'est reconnu par aucune des vérifications de sécurité (`require_roles`, `worker_tasks.py`). Tout utilisateur enregistré sans rôle explicite obtient un rôle fantôme qui peut passer certaines vérifications et échouer d'autres de façon imprévisible.

---

### 🟠 BUG #17 : Worker PIN stocké comme chaîne vide

**Fichier** : `farm_routes.py:272` et `farm_routes.py:299`

```python
assignment = WorkerAssignment(worker_id=existing_user.id, farm_id=farm_id, pin_code="", is_active=True)
```

Le PIN code est créé vide — le modèle l'exige (`nullable=False`) mais aucun PIN n'est jamais généré ni envoyé à l'ouvrier. La colonne `pin_code` sur `WorkerAssignment` est donc inutile et potentiellement trompeuse pour la sécurité.

---

### 🟠 BUG #18 : Ajout/suppression d'owner/worker sur une ferme sans vérifier si le demandeur est propriétaire de cette ferme

**Fichier** : `farm_routes.py:155-196` et `farm_routes.py:240-304`

```python
@router.post("/{farm_id}/owners", status_code=201)
def add_farm_owner(farm_id: int, data, db=Depends(get_db), _=Depends(get_current_user)):
    # ← vérifie seulement que le user est authentifié
    # ← ne vérifie pas que _ est propriétaire de farm_id
```

**Impact** : Un utilisateur authentifié peut ajouter des propriétaires ou des ouvriers à la ferme de quelqu'un d'autre.

---

### 🟠 BUG #19 : `other_routes.py:198` — farm_id hardcodé à 1 pour le rapport intelligent

**Fichier** : `other_routes.py:198-203`

```python
@report_router.post("/generate-intelligent", status_code=201)
async def generate_intelligent_report(
    report_type: str = Query("general"),
    farm_id: int = Query(1),   # ← default "1" sans validation d'ownership
    ...
```

Le rapport intelligent s'exécute par défaut sur la ferme #1 quelle que soit la ferme de l'utilisateur. Tout utilisateur authentifié peut générer un rapport IA sur la ferme #1 (probablement la ferme principale).

---

### 🟡 BUG #20 : Problème timezone — comparaison naive vs aware dans analytics

**Fichier** : `other_routes.py:238`

```python
cutoff = datetime.now(timezone.utc) - timedelta(days=days)
# ...
.filter(Anomaly.timestamp >= cutoff)  # timestamp peut être naive (sans tz) en SQLite
```

`TelemetryRecord.timestamp` et `Anomaly.timestamp` utilisent `datetime.utcnow()` (naive) mais la comparaison se fait avec `datetime.now(timezone.utc)` (aware). **En SQLite, cela peut provoquer des erreurs de comparaison silencieuses ou retourner 0 résultat**, rendant les graphiques analytiques vides sans message d'erreur.

---

### 🟡 BUG #21 : Module apicole — `calendar_router` accède à `farm.lat` et `farm.lon` (attributs inexistants)

**Fichier** : `other_routes.py:578-579`

```python
lat = float(farm.lat or 36.8)   # ← Farm n'a pas d'attribut "lat"
...  (farm.lon or 10.1)          # ← Farm n'a pas d'attribut "lon"
```

Le modèle `Farm` utilise `latitude` et `longitude`. Ces accès lèvent `AttributeError` silencieusement géré par le fallback `or 36.8` — **toutes les alertes phénologiques utilisent la position par défaut (36.8°N, 10.1°E) quelle que soit la ferme**.

---

### 🟡 BUG #22 : La suppression d'un worker supprime son compte si aucune autre assignation — logique destructrice

**Fichier** : `farm_routes.py:355-370`

```python
other_count = db.query(WorkerAssignment).filter(
    WorkerAssignment.worker_id == worker_id,
    WorkerAssignment.farm_id != farm_id,
).count()
if other_count == 0:
    user = db.query(User).filter(User.id == worker_id).first()
    if user:
        db.delete(user)  # ← supprime l'utilisateur !
```

Retirer un worker de sa dernière ferme supprime silencieusement son compte utilisateur. Si l'ouvrier est réassigné plus tard, tout son historique (tâches, rapports) est perdu.

---

## NIVEAU MODÉRÉ — UX & Cohérence des Données

### 🟡 BUG #23 : IoT polling toutes les 10s sans gestion d'erreur UI

**Fichier** : `Dashboard.jsx:95-103`

```javascript
const fetchIot = () => {
    api.get('/iot/latest')
      .then(res => { if (res.data?.nodeA && res.data?.nodeB) setIotData(res.data); })
      .catch(err => console.error('IoT fetch error:', err));  // ← silencieux pour l'utilisateur
};
const interval = setInterval(fetchIot, 10000);
```

En cas d'erreur répétée, l'utilisateur ne reçoit aucun feedback visuel — les jauges restent figées sur les valeurs hardcodées (BUG #9). Le polling continue indéfiniment même après le démontage du composant si l'utilisateur navigue vite.

---

### 🟡 BUG #24 : `DiagnosticHistory` lie à l'utilisateur mais pas à la ferme

**Fichier** : `models/domain.py:484-500`

```python
class DiagnosticHistory(Base):
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    # ← pas de farm_id
```

Si un utilisateur possède plusieurs fermes, il est impossible de savoir dans quelle ferme le diagnostic a été effectué. Les historiques de diagnostic sont mélangés entre fermes.

---

### 🟡 BUG #25 : Worker ne peut accéder qu'à sa propre ferme mais le frontend charge `/farms` global

**Fichier** : `AuthContext.jsx:31-34`

```javascript
const farmsRes = await farmsAPI.list();
const farms = farmsRes.data || [];
if (farms.length > 0) _persistFarmId(farms[0].id);
```

Même pour les workers (qui sont liés à une seule ferme), le login charge toutes les fermes via `/farms` global. `_persistFarmId(farms[0].id)` sélectionne la première ferme globale — pas nécessairement celle du worker. Le worker peut voir les données d'une ferme à laquelle il n'est pas assigné.

---

## Tableau de Bord Prioritaire des Corrections

| # | Fichier | Ligne | Sévérité | Impact |
|---|---------|-------|----------|--------|
| 1 | `farm_routes.py` | 65 | 🔴 CRITIQUE | Toutes les fermes visibles |
| 2 | `farm_routes.py` | 120, 125 | 🔴 CRITIQUE | IDOR — suppression/modification |
| 3 | `animal_routes.py` | 35, 47-63 | 🔴 CRITIQUE | Tous les animaux visibles |
| 4 | `other_routes.py` | 57, 33 | 🔴 CRITIQUE | Alertes/anomalies cross-farm |
| 5 | `data_service.py` | 286 | 🔴 CRITIQUE | Stats Dashboard agrégées global |
| 6 | `models/domain.py` | 507 | 🔴 CRITIQUE | Bee module sans isolation |
| 7 | `models/domain.py` | 627 | 🔴 CRITIQUE | Stock apicole partagé global |
| 8 | `models/domain.py` | 703 | 🔴 CRITIQUE | Warehouse sans farm_id |
| 9 | `Dashboard.jsx` | 71-74 | 🔴 CRITIQUE | Données IoT hardcodées |
| 10 | `Dashboard.jsx` | 117-119 | 🔴 CRITIQUE | Télémétrie mauvaise ferme |
| 11 | `Dashboard.jsx` | 121 | 🔴 CRITIQUE | Météo mauvaise ferme |
| 12 | `Analytics.jsx` | 38 | 🔴 CRITIQUE | Graphiques sans contexte farm |
| 13 | `Dashboard.jsx` | 232 | 🟠 ÉLEVÉ | Risk Score sans base |
| 14 | `Analytics.jsx` | 50 | 🟠 ÉLEVÉ | avgHealth mathématiquement faux |
| 15 | `farm_routes.py` | 272 | 🟠 ÉLEVÉ | PIN ouvrier vide |
| 16 | `farm_routes.py` | 155 | 🟠 ÉLEVÉ | Add owner sans vérif ownership |
| 17 | `models/domain.py` | 86 | 🟠 ÉLEVÉ | Rôle "operator" fantôme |
| 18 | `other_routes.py` | 198 | 🟠 ÉLEVÉ | farm_id=1 hardcodé |
| 19 | `other_routes.py` | 578 | 🟡 MODÉRÉ | `farm.lat` → AttributeError |
| 20 | `other_routes.py` | 238 | 🟡 MODÉRÉ | Timezone naive vs aware |
| 21 | `farm_routes.py` | 355 | 🟡 MODÉRÉ | Suppression silencieuse user |
| 22 | `Dashboard.jsx` | 95 | 🟡 MODÉRÉ | Polling IoT sans feedback UI |

---

## Plan de Correction — Architecture Multi-Tenant

La racine de 80% des bugs est l'**absence d'un filtre d'appartenance (ownership)** propagé dans toutes les queries. La correction architecturale recommandée en une phrase :

> **Toute query sur des données opérationnelles (Farm, Animal, Alert, Anomaly, Telemetry, Report) doit joindre `FarmOwner` et filtrer par `FarmOwner.owner_id == current_user.id`.**

### Étape 1 — Dependency FastAPI réutilisable

Créer `backend/app/core/farm_guard.py` :

```python
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import FarmOwner

def get_user_farm_ids(user=Depends(get_current_user), db=Depends(get_db)):
    """Retourne la liste des farm_id appartenant à l'utilisateur."""
    owned = db.query(FarmOwner.farm_id).filter(FarmOwner.owner_id == user.id).all()
    return [r[0] for r in owned]

def assert_farm_owner(farm_id: int, farm_ids=Depends(get_user_farm_ids)):
    if farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    return farm_id
```

### Étape 2 — Filtrer `list_farms`

```python
@router.get("")
def list_farms(farm_ids=Depends(get_user_farm_ids), db=Depends(get_db)):
    return db.query(Farm).filter(Farm.id.in_(farm_ids)).all()
```

### Étape 3 — Ajouter `farm_id` à BeeApiary, WarehouseCategory

```python
# Migration Alembic
class BeeApiary(Base):
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    # ... reste inchangé

class WarehouseCategory(Base):
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
```

### Étape 4 — Remplacer BeeGlobalStock singleton par un record par ferme

```python
class BeeGlobalStock(Base):
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False, unique=True)
    # → unique(farm_id) remplace le singleton global
```

### Étape 5 — Frontend : utiliser `AuthContext.farmId` partout

```javascript
// Dashboard.jsx — remplacer
externalAPI.weather.current(farmsList[0].id)
// par
externalAPI.weather.current(farmId)  // depuis useAuth()

// Analytics.jsx — passer le farm_id
dashboardAPI.analytics(days, farmId)
```

### Étape 6 — Corriger les données IoT hardcodées

```javascript
const [iotData, setIotData] = useState(null);  // null = pas encore chargé

// Dans le rendu :
{iotData === null ? (
  <div>Connexion IoT en cours...</div>
) : iotData === 'error' ? (
  <div>⚠️ Capteurs hors ligne</div>
) : (
  <RingGauge value={iotData.nodeA.soil} ... />
)}
```

---

## Conclusion

Le projet est **ambitieux et bien structuré techniquement** (DTOs, services, repositories, JWT, IoT, ML). Mais l'objectif déclaré — _"chaque ferme a la confidentialité de ses données"_ — **n'est pas implémenté**. En l'état actuel :

- Tout utilisateur enregistré voit les données de toutes les fermes
- Les graphiques agrègent des données hétérogènes sans contexte = métriques non interprétables
- Le module apicole est entièrement partagé entre tous les utilisateurs
- Les données IoT affichées peuvent être fictives sans avertissement

**La priorité absolue avant toute démonstration** : implémenter la dependency `get_user_farm_ids` et l'appliquer à tous les endpoints listés dans le tableau ci-dessus. C'est une refactorisation de 2-3 jours qui transforme l'application d'un prototype fonctionnel en un système multi-tenant réel.
