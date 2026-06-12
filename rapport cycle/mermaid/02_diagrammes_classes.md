# Diagrammes de Classes — Smart Farm AI v3.0

> Versions Mermaid des 8 diagrammes de classes du rapport (`figures/P0..P7_*.png`).
> Source de vérité : `backend/app/models/domain.py` (38 classes SQLAlchemy, 7 packages).
> Légende : `*--` composition (cascade delete) · `--` association · `..>` dépendance.

---

## P0 — Vue d'Ensemble (38 classes, 7 packages)
*Figure source : `P0_Vue_Ensemble.png` — diagramme simplifié sans attributs*

```mermaid
classDiagram
    direction LR

    namespace P1_Utilisateurs_Acces {
        class User
        class WorkerAssignment
        class WorkerTask
        class WorkerReport
        class PushToken
    }

    namespace P2_Ferme_Infrastructure {
        class Farm
        class FarmOwner
        class AnimalType
        class AnimalUnit
        class AnimalLog
        class Settings
        class FarmFinance
        class Report
    }

    namespace P3_IoT_Telemetrie {
        class Sensor
        class TelemetryRecord
        class Anomaly
    }

    namespace P4_IA_Surveillance {
        class CVEvent
        class DiagnosticHistory
        class Alert
        class Recommendation
    }

    namespace P5_Apiculture {
        class BeeApiary
        class BeeHive
        class BeeVisit
        class BeeProduction
        class BeeExpense
        class BeeGlobalStock
        class BeeHiveStock
        class BeeStockLog
        class BeePlanning
        class BeePlanningTask
    }

    namespace P6_Aviculture_ERP {
        class PoultryBatch
        class PoultryFeedLog
        class PoultryEggLog
        class PoultryHealthLog
        class PoultrySale
        class PoultryInventory
    }

    namespace P7_Entrepot_GIS {
        class WarehouseCategory
        class WarehouseItem
        class WarehouseAlert
        class Veterinary
        class Market
    }

    %% ----- P1 : utilisateurs -----
    User "1" --> "0..*" WorkerTask : reçoit
    User "1" --> "0..*" WorkerReport : soumet
    User "1" --> "0..*" PushToken : enregistre
    WorkerTask --> "0..1" AnimalUnit : cible
    Farm "1" *-- "0..*" WorkerAssignment

    %% ----- P2 : ferme = pivot central -----
    User "1" --> "0..*" Farm : possède
    Farm "1" *-- "0..*" FarmOwner : co-propriétaires
    User "1" --> "0..*" FarmOwner
    AnimalType "1" --> "0..*" AnimalUnit : catégorise
    Farm "1" *-- "0..*" AnimalUnit : contient
    Farm "1" *-- "0..*" Settings : configure
    Farm "1" *-- "0..*" FarmFinance : enregistre
    Farm "1" *-- "0..*" Report : produit
    AnimalUnit "1" *-- "0..*" AnimalLog : historise

    %% ----- P3 : AnimalUnit = pivot IoT -----
    AnimalUnit "1" *-- "0..*" Sensor : équipée de
    AnimalUnit "1" *-- "0..*" TelemetryRecord : génère
    AnimalUnit "1" *-- "0..*" Anomaly : déclenche
    Anomaly ..> Alert : engendre

    %% ----- P4 : IA & surveillance -----
    AnimalUnit "1" *-- "0..*" CVEvent : surveille
    AnimalUnit "1" *-- "0..*" Alert : engendre
    AnimalUnit "1" *-- "0..*" Recommendation : reçoit
    Alert "1" *-- "0..*" Recommendation : génère
    CVEvent ..> Alert : peut déclencher
    User "1" --> "0..*" DiagnosticHistory : consulte

    %% ----- P5 : apiculture -----
    BeeApiary "1" *-- "1..*" BeeHive : regroupe
    BeeHive "1" *-- "0..*" BeeVisit : inspectée par
    BeeApiary "1" --> "0..*" BeeProduction : produit
    BeeHive "1" --> "0..*" BeeProduction
    BeeHive "1" --> "0..1" BeeHiveStock : stock alloué
    BeeGlobalStock ..> BeeHiveStock : alimente
    BeeVisit "1" --> "0..1" BeeExpense : génère
    BeeHive "1" *-- "0..*" BeePlanning : planifie
    BeePlanning "1" *-- "0..*" BeePlanningTask : décompose

    %% ----- P6 : aviculture -----
    Farm "1" *-- "0..*" PoultryBatch : gère
    Farm "1" *-- "0..*" PoultryInventory : stock
    PoultryBatch "1" *-- "0..*" PoultryFeedLog
    PoultryBatch "1" *-- "0..*" PoultryEggLog
    PoultryBatch "1" *-- "0..*" PoultryHealthLog
    PoultryBatch "1" *-- "0..*" PoultrySale

    %% ----- P7 : entrepôt -----
    WarehouseCategory "1" *-- "0..*" WarehouseItem : contient
    WarehouseItem "1" --> "0..*" WarehouseAlert : génère

    note for Farm "Pivot central — connecté à tous les modules"
    note for AnimalUnit "Pivot IoT + IA — connecté à Sensor, Telemetry, Anomaly, CVEvent, Alert, Recommendation"
    note for BeeStockLog "Legacy — snapshot journalier isolé"
```

---

## P1 — Utilisateurs & Contrôle d'Accès
*Figure source : `P1_Utilisateurs.png`*

```mermaid
classDiagram
    direction LR

    class User {
        +id : Integer PK
        +username : String unique index
        +email : String unique
        +phone_number : String unique
        +full_name : String
        +password_hash : String bcrypt
        +role : String = owner
        +plan : String = free
        +plan_expires_at : DateTime
        +stripe_customer_id : String
        +totp_secret : String
        +totp_enabled : Boolean = false
        +is_active : Boolean = true
        +refresh_token_hash : String
        +created_at : DateTime
        +updated_at : DateTime
    }

    class UserRole {
        <<enumeration>>
        superadmin
        owner
        worker
    }

    class SubscriptionPlan {
        <<enumeration>>
        free
        pro
        enterprise
    }

    class WorkerAssignment {
        +id : Integer PK
        +worker_id : Integer FK users CASCADE
        +farm_id : Integer FK farms CASCADE
        +pin_code : String haché
        +is_active : Boolean = true
        +assigned_at : DateTime
    }

    class WorkerTask {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +worker_id : Integer FK users SET NULL
        +animal_id : Integer FK animal_units SET NULL
        +title : String
        +category : String = other
        +description : Text
        +due_date : DateTime
        +status : String = pending
        +priority : String = normal
        +photo_url : Text
        +notes : Text
        +created_by : Integer FK users
        +created_at : DateTime
        +done_at : DateTime
    }

    class WorkerReport {
        +id : Integer PK
        +worker_id : Integer FK users SET NULL
        +farm_id : Integer FK farms CASCADE
        +type : String = other
        +notes : Text
        +photo_b64 : Text
        +created_at : DateTime
    }

    class PushToken {
        +id : Integer PK
        +user_id : Integer FK users CASCADE
        +token : Text
        +platform : String
        +created_at : DateTime
    }

    class Farm {
        voir P2
    }
    class AnimalUnit {
        voir P2
    }

    User "1" --> "0..*" WorkerTask : reçoit
    User "1" --> "0..*" WorkerReport : soumet
    User "1" --> "0..*" PushToken : enregistre
    User "1" --> "0..*" WorkerAssignment : affecté via
    WorkerTask --> "0..1" AnimalUnit : cible
    Farm "1" *-- "0..*" WorkerAssignment
    Farm "1" *-- "0..*" WorkerTask
    User ..> UserRole
    User ..> SubscriptionPlan

    note for WorkerTask "category : feeding | health | milking | cleaning (pas task_type) — status : pending | done | blocked — done_at (pas completed_at)"
    note for WorkerReport "photo_b64 : une seule photo encodée base64"
    note for WorkerAssignment "pin_code haché — authentification PIN hors-ligne PWA"
```

---

## P2 — Ferme & Infrastructure
*Figure source : `P2_Ferme_Infrastructure.png`*

```mermaid
classDiagram
    direction LR

    class Farm {
        +id : Integer PK
        +owner_id : Integer FK users SET NULL
        +name : String
        +location : String
        +description : Text
        +latitude : Float
        +longitude : Float
        +geom : Geometry POINT 4326
        +status : String = active
        +total_area_ha : Float
        +created_at : DateTime
        +updated_at : DateTime
    }

    class AnimalType {
        +id : Integer PK
        +species : String unique
        +display_name : String
        +description : Text
        +telemetry_schema : JSON
        +cv_classes : JSON
        +created_at : DateTime
    }

    class AnimalUnit {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +type_id : Integer FK animal_types RESTRICT
        +name : String
        +identifier : String
        +tag_id : String unique
        +status : String = healthy
        +lifecycle_status : String = production
        +health_score : Float = 100.0
        +notes : Text
        +entry_date : DateTime
        +created_at : DateTime
        +updated_at : DateTime
    }

    class AnimalLog {
        +id : Integer PK
        +animal_id : Integer FK animal_units CASCADE
        +type : String
        +value : Float
        +unit : String
        +notes : Text
        +recorded_by : Integer FK users SET NULL
        +timestamp : DateTime
    }

    class Settings {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +animal_type_id : Integer FK animal_types CASCADE
        +key : String
        +value : JSON
        +description : Text
        +updated_at : DateTime
    }

    class FarmOwner {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +owner_id : Integer FK users CASCADE
        +added_at : DateTime
        UniqueConstraint farm_id + owner_id
    }

    class FarmFinance {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +type : String
        +category : String
        +amount : Float
        +notes : Text
        +timestamp : DateTime
    }

    class Report {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +report_type : String
        +title : String
        +period_start : DateTime
        +period_end : DateTime
        +summary : JSON
        +file_url : String
        +generated_by : String
        +created_at : DateTime
    }

    class User {
        voir P1
    }

    User "1" --> "0..*" Farm : possède
    Farm "1" *-- "0..*" FarmOwner : co-propriétaires
    User "1" --> "0..*" FarmOwner
    AnimalType "1" --> "0..*" AnimalUnit : catégorise
    AnimalType "1" --> "0..*" Settings : seuils par espèce
    Farm "1" *-- "0..*" Settings : configure
    Farm "1" *-- "0..*" AnimalUnit : contient
    AnimalUnit "1" *-- "0..*" AnimalLog : historise
    Farm "1" *-- "0..*" FarmFinance : enregistre
    Farm "1" *-- "0..*" Report : produit

    note for Farm "FK = owner_id (pas user_id) — geom POINT 4326 avec fallback String en mode SQLite"
    note for AnimalUnit "lifecycle_status : production | rest | care | gestation — Index farm_id + type_id"
    note for AnimalLog "type : milk_yield | health_event | feed_consumed"
    note for FarmFinance "type : expense | revenue — category : food | vet | sales | maintenance"
```

---

## P3 — IoT & Télémétrie
*Figure source : `P3_IoT_Telemetrie.png`*

```mermaid
classDiagram
    direction LR

    class Sensor {
        +id : Integer PK
        +unit_id : Integer FK animal_units CASCADE
        +sensor_type : String
        +sensor_id : String matériel
        +is_active : Boolean = true
        +last_seen : DateTime
        +metadata : JSON
        +created_at : DateTime
    }

    class TelemetryRecord {
        +id : Integer PK
        +unit_id : Integer FK animal_units CASCADE
        +timestamp : DateTime index
        +metrics : JSON
        +source : String = mqtt
        Index unit_id + timestamp
    }

    class Anomaly {
        +id : Integer PK
        +unit_id : Integer FK animal_units CASCADE
        +timestamp : DateTime index
        +anomaly_type : String
        +description : Text
        +severity : String = warning
        +isolation_score : Float
        +rules_triggered : JSON
        +feature_contributions : JSON
        +is_acknowledged : Boolean = false
    }

    class AnimalUnit {
        voir P2
    }
    class Alert {
        voir P4
    }

    AnimalUnit "1" *-- "0..*" TelemetryRecord : génère
    AnimalUnit "1" *-- "0..*" Sensor : équipée de
    AnimalUnit "1" *-- "0..*" Anomaly : déclenche
    Anomaly ..> Alert : engendre

    note for TelemetryRecord "Pas de FK sensor_id — lien logique via unit_id. metrics JSON flexible : temperature, humidity, weight…  source : mqtt | simulator | manual"
    note for Anomaly "Détection Isolation Forest — isolation_score supérieur à 0.75 déclenche une alerte. feature_contributions = explicabilité"
```

---

## P4 — IA & Surveillance
*Figure source : `P4_IA_Surveillance.png`*

```mermaid
classDiagram
    direction LR

    class CVEvent {
        +id : Integer PK
        +unit_id : Integer FK animal_units CASCADE
        +timestamp : DateTime index
        +object_class : String
        +confidence : Float
        +severity : String = info
        +thumbnail_url : String
        +frame_metadata : JSON
        +camera_id : String
        Index unit_id + timestamp
    }

    class DiagnosticHistory {
        +id : Integer PK
        +user_id : Integer FK users CASCADE
        +timestamp : DateTime index
        +category : String
        +image_url : Text
        +detections : JSON
        +chat_log : JSON
        +notes : Text
    }

    class Recommendation {
        +id : Integer PK
        +unit_id : Integer FK animal_units nullable
        +alert_id : Integer FK alerts nullable
        +timestamp : DateTime
        +probable_cause : Text
        +recommendation_text : Text
        +urgency_level : String = medium
        +confidence_score : Float = 90.0
        +is_actioned : Boolean = false
    }

    class Alert {
        +id : Integer PK
        +unit_id : Integer FK animal_units CASCADE
        +timestamp : DateTime index
        +alert_type : String
        +message : Text
        +severity : String = warning
        +is_resolved : Boolean = false
        +resolved_at : DateTime
        +resolved_by : String
    }

    class AnimalUnit {
        voir P2
    }
    class User {
        voir P1
    }
    class Anomaly {
        voir P3
    }

    AnimalUnit "1" *-- "0..*" CVEvent : surveille
    AnimalUnit "1" *-- "0..*" Recommendation : reçoit
    AnimalUnit "1" *-- "0..*" Alert : engendre
    Alert "1" *-- "0..*" Recommendation : génère
    CVEvent ..> Alert : peut déclencher
    Anomaly ..> Alert : déclenche
    User "1" --> "0..*" DiagnosticHistory : consulte

    note for CVEvent "Champs corrects : thumbnail_url (pas image_url), frame_metadata (pas bbox_metadata) — object_class : bee, predator, smoke, fire, limping…"
    note for DiagnosticHistory "category : leaves | olive | insects | fire — lié à User, pas de unit_id"
    note for Alert "resolved_by ajouté — pas de farm_id ni de champ source"
    note for Recommendation "is_actioned (pas is_applied) — timestamp (pas created_at)"
```

---

## P5 — Module Apiculture
*Figure source : `P5_Apiculture.png`*

```mermaid
classDiagram
    direction LR

    class BeeApiary {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +name : String
        +latitude : Float
        +longitude : Float
        +flower_type : String
        +season : String
        +region : String
        +notes : Text
        +created_at : DateTime
        +updated_at : DateTime
    }

    class BeeHive {
        +id : Integer PK
        +apiary_id : Integer FK bee_apiaries CASCADE
        +identifier : String unique HIVE-0001
        +is_active : Boolean = true
        +health_score : Float = 10.0
        +honey_level : Float = 5.0
        +force_level : Float = 5.0
        +hive_type : String
        +queen_year : Integer
        +has_queen : Boolean = true
        +queen_count : Integer = 0
        +last_visit_date : DateTime
        +notes : Text
        +created_at : DateTime
        +updated_at : DateTime
    }

    class BeeVisit {
        +id : Integer PK
        +hive_id : Integer FK bee_hives CASCADE
        +apiary_id : Integer FK bee_apiaries CASCADE
        +visit_date : String format fr-FR
        +visit_name : String
        +gps_coords : String
        +health_state : String = health
        +health_score : Float
        +force_level : Float
        +temperature : Float
        +honey_level : String = Moyen
        +type_ruche : String
        +reine : Boolean
        +oeufs : Boolean
        +couvain : Boolean
        +population : String
        +pollen_level : String
        +nb_cadres : String
        +needs_sirop : Float = 0
        +needs_pate : Float = 0
        +needs_traitement : Float = 0
        +harvest_kg : Float = 0
        +pollen_kg : Float = 0
        +notes : Text
        +photo_url : Text
        +visited_by : String
        +visitor_role : String
        +created_at : DateTime
    }

    class BeeProduction {
        +id : Integer PK
        +hive_id : Integer FK bee_hives SET NULL
        +apiary_id : Integer FK bee_apiaries CASCADE
        +flower_type : String
        +production_date : String
        +honey_kg : Float = 0.0
        +pollen_kg : Float = 0.0
        +quality_notes : Text
        +created_at : DateTime
    }

    class BeeGlobalStock {
        +id : Integer PK
        +farm_id : Integer FK farms unique
        +sirop : Float litres
        +pate : Float kg
        +traitement : Integer doses
        +cadres : Integer
        +hausse : Integer
        +equipement : Integer
        +sirop_min : Float = 50
        +pate_min : Float = 20
        +traitement_min : Integer = 10
        +cadres_min : Integer = 20
        +updated_at : DateTime
    }

    class BeeHiveStock {
        +id : Integer PK
        +hive_id : Integer FK bee_hives unique
        +sirop : Float
        +pate : Float
        +traitement : Integer
        +cadres : Integer
        +sirop_min : Float = 2
        +pate_min : Float = 1
        +traitement_min : Integer = 1
        +updated_at : DateTime
    }

    class BeeExpense {
        +id : Integer PK
        +hive_id : Integer FK bee_hives SET NULL
        +apiary_id : Integer FK bee_apiaries SET NULL
        +visit_id : Integer FK bee_visits SET NULL
        +expense_date : String
        +amount : Float réel
        +amount_planned : Float prévisionnel
        +category : String
        +description : Text
        +created_at : DateTime
    }

    class BeePlanning {
        +id : Integer PK
        +hive_id : Integer FK bee_hives CASCADE
        +apiary_id : Integer FK bee_apiaries CASCADE
        +scheduled_date : String
        +status : String = pending
        +action_type : String
        +notes : Text
        +predicted_sirop : Float = 0
        +predicted_pate : Float = 0
        +predicted_traitement : Integer = 0
        +predicted_cadres : Integer = 0
        +created_at : DateTime
    }

    class BeePlanningTask {
        +id : Integer PK
        +planning_id : Integer FK bee_planning CASCADE
        +text : String
        +status : String = todo
        +created_at : DateTime
    }

    class BeeStockLog {
        +id : Integer PK
        +log_date : String
        +sirop : Float
        +pate : Float
        +traitement : Float
        +cadres : Integer
        +hausse : Integer
        +equipement : Integer
        +created_at : DateTime
    }

    BeeApiary "1" *-- "1..*" BeeHive : regroupe
    BeeHive "1" *-- "0..*" BeeVisit : inspectée par
    BeeApiary "1" --> "0..*" BeeVisit
    BeeApiary "1" *-- "0..*" BeeProduction : produit
    BeeHive "1" --> "0..*" BeeProduction
    BeeHive "1" --> "0..1" BeeHiveStock : stock alloué
    BeeGlobalStock ..> BeeHiveStock : alimente
    BeeVisit "1" --> "0..1" BeeExpense : génère
    BeeHive "1" --> "0..*" BeeExpense : dépenses
    BeeApiary "1" --> "0..*" BeeExpense : finance
    BeeHive "1" *-- "0..*" BeePlanning : planifie
    BeePlanning "1" *-- "0..*" BeePlanningTask : décompose

    note for BeeVisit "needs_sirop / needs_pate / needs_traitement = Float (pas Boolean) — visit_date stocké en String format fr-FR — type_ruche : MERE | POUSSIN | VIDE | MORTE"
    note for BeeStockLog "Legacy — snapshot journalier isolé, aucune relation"
    note for BeeGlobalStock "Singleton par ferme (farm_id unique) — seuils d'alerte minimum intégrés"
```

---

## P6 — Module Aviculture ERP
*Figure source : `P6_Aviculture_ERP.png`*

```mermaid
classDiagram
    direction LR

    class PoultryBatch {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +name : String
        +batch_type : String
        +breed : String
        +supplier : String
        +arrival_date : DateTime
        +initial_quantity : Integer
        +current_quantity : Integer
        +status : String = active
        +notes : Text
        +created_at : DateTime
    }

    class PoultryFeedLog {
        +id : Integer PK
        +batch_id : Integer FK poultry_batches CASCADE
        +date : DateTime
        +feed_type : String
        +quantity_kg : Float
        +average_weight_g : Float
        +fcr_calculated : Float
        +cost_per_kg : Float
        +notes : Text
        +status : String = pending
        +created_by_id : Integer FK users
        +validated_by_id : Integer FK users
        +validation_timestamp : DateTime
        +admin_notes : Text
    }

    class PoultryEggLog {
        +id : Integer PK
        +batch_id : Integer FK poultry_batches CASCADE
        +date : DateTime
        +total_eggs : Integer
        +broken_eggs : Integer = 0
        +grade_a_count : Integer = 0
        +grade_b_count : Integer = 0
        +production_rate : Float pourcent ponte
        +notes : Text
        +status : String = pending
        +created_by_id : Integer FK users
        +validated_by_id : Integer FK users
        +validation_timestamp : DateTime
        +admin_notes : Text
    }

    class PoultryHealthLog {
        +id : Integer PK
        +batch_id : Integer FK poultry_batches CASCADE
        +date : DateTime
        +event_type : String
        +description : String
        +deaths_today : Integer = 0
        +medicine_used : String
        +dosage : String
        +vet_name : String
        +cost : Float = 0.0
        +notes : Text
        +status : String = pending
        +created_by_id : Integer FK users
        +validated_by_id : Integer FK users
        +validation_timestamp : DateTime
        +admin_notes : Text
    }

    class PoultrySale {
        +id : Integer PK
        +batch_id : Integer FK poultry_batches CASCADE
        +date : DateTime
        +product_type : String
        +quantity : Integer
        +unit_price : Float
        +total_amount : Float
        +customer_name : String
        +invoice_number : String
        +notes : Text
        +status : String = pending
        +created_by_id : Integer FK users
        +validated_by_id : Integer FK users
        +validation_timestamp : DateTime
        +admin_notes : Text
    }

    class PoultryInventory {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +item_name : String
        +category : String
        +quantity : Float
        +unit : String
        +unit_price : Float
        +min_threshold : Float
        +supplier : String
        +last_updated : DateTime
    }

    class Farm {
        voir P2
    }
    class User {
        voir P1
    }

    Farm "1" *-- "0..*" PoultryBatch : gère
    Farm "1" *-- "0..*" PoultryInventory : stock
    PoultryBatch "1" *-- "0..*" PoultryFeedLog : alimentation
    PoultryBatch "1" *-- "0..*" PoultryEggLog : production
    PoultryBatch "1" *-- "0..*" PoultryHealthLog : santé
    PoultryBatch "1" *-- "0..*" PoultrySale : ventes
    User "1" --> "0..*" PoultryFeedLog : crée et valide
    User "1" --> "0..*" PoultryEggLog : crée et valide
    User "1" --> "0..*" PoultryHealthLog : crée et valide
    User "1" --> "0..*" PoultrySale : crée et valide

    note for PoultryBatch "batch_type : broiler | layer | breeder — status : active | sold | vacuum | archived — deaths_today décrémente current_quantity"
    note for PoultryFeedLog "Data Contract : status pending | validated | rejected — workflow ouvrier saisit, admin valide"
```

---

## P7 — Entrepôt & Services Géospatiaux
*Figure source : `P7_Entrepot_GIS.png`*

```mermaid
classDiagram
    direction LR

    class WarehouseCategory {
        +id : Integer PK
        +farm_id : Integer FK farms CASCADE
        +name_ar : String
        +name_fr : String
        +icon : String = Package
        +emoji : String
        +color : String hex 16a34a
        +display_order : Integer = 0
    }

    class WarehouseItem {
        +id : Integer PK
        +category_id : Integer FK warehouse_categories CASCADE
        +name_ar : String
        +name_fr : String
        +emoji : String
        +description : Text
        +quantity : Float = 0.0
        +unit : String = unités
        +min_quantity : Float = 5.0
        +entry_date : DateTime
        +expiry_date : DateTime
        +notes : Text
        +created_at : DateTime
        +updated_at : DateTime
        +status : String calculé
    }

    class WarehouseAlert {
        +id : Integer PK
        +item_id : Integer FK warehouse_items SET NULL
        +item_name : String
        +category_name : String
        +emoji : String
        +alert_type : String = stock_out
        +message : Text
        +severity : String = critical
        +is_resolved : Boolean = false
        +resolved_at : DateTime
        +created_at : DateTime index
    }

    class Veterinary {
        +id : Integer PK
        +name : String
        +specialty : String
        +phone : String
        +email : String
        +address : String
        +latitude : Float
        +longitude : Float
        +geom : Geometry POINT 4326
        +is_active : Boolean = true
        +created_at : DateTime
    }

    class Market {
        +id : Integer PK
        +name : String
        +market_type : String = bee_market
        +description : Text
        +phone : String
        +address : String
        +latitude : Float
        +longitude : Float
        +geom : Geometry POINT 4326
        +is_active : Boolean = true
        +created_at : DateTime
    }

    WarehouseCategory "1" *-- "0..*" WarehouseItem : contient
    WarehouseItem "1" --> "0..*" WarehouseAlert : génère

    note for WarehouseItem "status est une @property calculée : out | limited | available — bilingue ar/fr"
    note for WarehouseAlert "alert_type : stock_out | stock_low — severity : critical | warning"
    note for Veterinary "Entité GIS isolée — requêtes spatiales PostGIS ST_DWithin"
    note for Market "market_type : bee_market | feed_market | equipment — entité GIS isolée"
```
