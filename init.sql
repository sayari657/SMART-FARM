-- ============================================================
-- Smart Farm AI — PostgreSQL Initialization Script
-- Auto-run by docker-compose on first start
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES (created by SQLAlchemy on startup, but listed here
--          for reference and manual setup)
-- ============================================================

-- users, farms, animal_types, animal_units, sensors,
-- telemetry_records, cv_events, anomalies, alerts,
-- recommendations, reports, settings
-- → All managed by SQLAlchemy ORM (Base.metadata.create_all)

-- ============================================================
-- SEED DATA (inserted here so Docker compose also seeds the DB)
-- ============================================================

-- Insert default animal types
INSERT INTO animal_types (species, display_name, description, telemetry_schema, cv_classes, created_at)
VALUES
  ('bee',     'Honeybee Hive',  'Apis mellifera colony monitoring',
   '{"temperature":"°C","humidity":"%","hive_weight":"kg","sound_level":"dB"}',
   '["bee","predator","smoke","fire","varroa_mite"]',
   NOW()),
  ('cow',     'Dairy Cow',      'Bovine health and milk yield monitoring',
   '{"body_temperature":"°C","activity":"steps/h","rumination":"min/h","milk_yield":"L/day"}',
   '["cow","standing","lying","limping","feeding","estrus"]',
   NOW()),
  ('poultry', 'Poultry House',  'Broiler/layer flock monitoring',
   '{"coop_temperature":"°C","humidity":"%","ammonia":"ppm","sound_level":"dB","bird_count":"count"}',
   '["chicken","crowding","dead_bird","feeder","waterline","pecking"]',
   NOW()),
  ('sheep',   'Sheep Group',    'Ovine flock monitoring',
   '{"body_temperature":"°C","activity":"steps/h","respiratory_rate":"breaths/min"}',
   '["sheep","limping","grazing","isolated","predator"]',
   NOW()),
  ('goat',    'Goat Group',     'Caprine herd monitoring',
   '{"body_temperature":"°C","activity":"steps/h","milk_yield":"L/day"}',
   '["goat","feeding","fighting","limping","predator"]',
   NOW())
ON CONFLICT (species) DO NOTHING;

-- Note: Users, farms, animal units, telemetry, CV events, anomalies,
--       alerts, recommendations and settings are seeded via:
--         python -m app.utils.seed
--       or automatically at first backend startup.
