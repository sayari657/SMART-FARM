/* ──────────────────────────────────────────────────────────────────────────
   Shared Smart Farm IoT telemetry simulation — SINGLE SOURCE OF TRUTH.

   Used by both:
     • /iot-devices  → full SCADA supervision center (IoTSimulator)
     • /dashboard    → "Télémesure IoT — Gauges" live ring gauges (fallback)

   The model is a pure (no-React) real-clock-synced simulation. A thin React
   hook (`useIotSimulation`) is provided for read-only consumers (the gauges),
   plus a mapper (`simToGauges`) that projects a snapshot onto the gauge shape
   returned by the backend `GET /iot/latest`.
   ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react';

export const HISTN = 50;

export const realHour = () => {
  const n = new Date();
  return n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600;
};

export const simInit = () => ({
  hour: realHour(), dateKey: '', timeStr: '', dateStr: '', mode: 'auto', valve: false, pump: false,
  soil: 26, soilTemp: 17, flow: 0, pressure: 0, pumpW: 0,
  leak: false, dryPump: false, leakAlerted: false, dryAlerted: false,
  weight: 38.0, soundHz: 210, sound: 'normal', soundTicks: 0, brood: 35.0, broodAlerted: false,
  battery: 12.3, battAlerted: false, lastStart: -10, mielleeTicks: 0, rainTicks: 0,
  waterToday: 0, cyclesToday: 0, mqtt: 0, ticks: 0, watering: false,
  hist: { soil: [], soilTemp: [], flow: [], pressure: [], weight: [], brood: [], soundHz: [], battery: [] },
});

const noop = () => {};

export const clockUpdate = (st, pushEvent = noop) => {
  const now = new Date();
  st.hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  st.timeStr = now.toLocaleTimeString('fr-FR');
  st.dateStr = now.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  const dkey = now.toDateString();
  if (st.dateKey && st.dateKey !== dkey) { st.waterToday = 0; st.cyclesToday = 0; pushEvent('Nouveau jour — compteurs réinitialisés', 'info'); }
  st.dateKey = dkey;
  return now;
};

export const step = (st, pushEvent = noop) => {
  clockUpdate(st, pushEvent);                // 1 tick = 1 real second
  const fav = (st.hour >= 5 && st.hour < 9) || (st.hour >= 18 && st.hour < 21);
  const midday = st.hour >= 11 && st.hour < 16;

  // Weather — occasional rain (~ once per few minutes)
  if (st.rainTicks <= 0 && Math.random() < 0.004) { st.rainTicks = 90 + Math.floor(Math.random() * 120); pushEvent('🌧 Pluie détectée — irrigation suspendue', 'info'); }
  const raining = st.rainTicks > 0; if (raining) st.rainTicks--;

  // Irrigation auto logic (dossier §5.1) — keyed on the REAL time of day
  if (st.mode === 'auto') {
    const gap = (st.hour - st.lastStart + 24) % 24;
    if (!st.valve && st.soil < 30 && fav && gap > 0.05 && !st.leak && !st.dryPump && !raining) {
      st.valve = true; st.pump = true; st.lastStart = st.hour;
      pushEvent('Cycle d’irrigation démarré (sol sec + créneau favorable)', 'ok');
    } else if (st.valve && st.soil >= 45) {
      st.valve = false; st.pump = false;
      pushEvent('Sol suffisamment humide → arrosage arrêté', 'info');
    }
  }

  // Hydraulics (per-second rates)
  const watering = st.valve && st.pump && !st.dryPump && !st.leak;
  if (watering && !st.watering) st.cyclesToday++;
  st.watering = watering;
  if (watering) {
    st.flow = 19 + Math.random() * 3;
    st.pressure = 2.1 + Math.random() * 0.3;
    st.pumpW = 1080 + Math.random() * 80;
    st.soil = Math.min(100, st.soil + 0.15);
    st.waterToday += st.flow / 60;          // L/min → L per second
  } else {
    st.flow = st.leak ? 5 + Math.random() * 2 : 0;
    st.pressure = st.dryPump && st.pump ? 3.3 + Math.random() * 0.3 : (st.leak ? 0.6 : 0);
    st.pumpW = st.dryPump && st.pump ? 1320 : 0;
    st.soil = Math.max(3, st.soil - (midday ? 0.05 : 0.02) + (raining ? 0.1 : 0));
    if (st.leak) st.waterToday += st.flow / 60;
  }

  // Safety detections (dossier §5.3)
  if (st.leak && !st.leakAlerted) { pushEvent('⚠ FUITE détectée (débit, vanne fermée) → arrêt pompe + alerte', 'danger'); st.leakAlerted = true; st.pump = false; st.valve = false; }
  if (st.dryPump && st.pump && !st.dryAlerted) { pushEvent('⚠ POMPE À SEC (rotation sans débit) → arrêt pompe + alerte', 'danger'); st.dryAlerted = true; st.pump = false; st.valve = false; }

  // Soil temperature — follows the real day cycle (smooth)
  const tgt = 13 + 15 * Math.max(0, Math.sin((st.hour - 6) / 12 * Math.PI));
  st.soilTemp += (tgt - st.soilTemp) * 0.02 + (Math.random() - 0.5) * 0.05;

  // Beehive (dossier §3.2 / §5.4) — realistic daily rhythm
  st.brood += (35 - st.brood) * 0.05 + (Math.random() - 0.5) * 0.06;
  if (st.brood < 34 || st.brood > 36) { if (!st.broodAlerted) { pushEvent('⚠ Température couvain anormale → vérifier la colonie', 'danger'); st.broodAlerted = true; } } else st.broodAlerted = false;
  if (st.mielleeTicks > 0) { st.weight += 0.02; st.mielleeTicks--; if (st.mielleeTicks === 0) pushEvent('Miellée terminée', 'info'); }
  else if (st.hour >= 7 && st.hour < 11) st.weight -= 0.0008;   // foragers leaving
  else if (st.hour >= 16 && st.hour < 20) st.weight += 0.0016;  // returning with nectar
  else st.weight -= 0.0002;
  if (st.soundTicks > 0) { st.soundTicks--; st.soundHz += (300 - st.soundHz) * 0.05; if (st.soundTicks === 0) { st.sound = 'normal'; pushEvent('Bourdonnement revenu à la normale', 'info'); } }
  else st.soundHz += (210 - st.soundHz) * 0.05 + (Math.random() - 0.5) * 3;
  const dayLight = st.hour >= 7 && st.hour < 18;
  const battTgt = dayLight ? 12.6 : 10.9;
  st.battery = Math.max(10.4, Math.min(12.7, st.battery + (battTgt - st.battery) * 0.004));
  if (st.battery < 11.3 && !st.battAlerted) { pushEvent('⚠ Batterie rucher faible → mise en veille', 'danger'); st.battAlerted = true; }
  if (st.battery > 11.8) st.battAlerted = false;

  // Telemetry packet + history
  st.mqtt++;
  const H = st.hist;
  const rec = (k, v) => { H[k].push(v); if (H[k].length > HISTN) H[k].shift(); };
  rec('soil', st.soil); rec('soilTemp', st.soilTemp); rec('flow', st.flow); rec('pressure', st.pressure);
  rec('weight', st.weight); rec('brood', st.brood); rec('soundHz', st.soundHz); rec('battery', st.battery);
  return st;
};

/* ── React hook — read-only live snapshot (Dashboard gauges) ──────────────── */
export function useIotSimulation(active = true) {
  const s = useRef(simInit());
  const [snap, setSnap] = useState(() => ({ ...s.current }));
  useEffect(() => {
    clockUpdate(s.current);
    setSnap({ ...s.current });
    if (!active) return undefined;
    const iv = setInterval(() => { step(s.current); setSnap({ ...s.current }); }, 1000);
    return () => clearInterval(iv);
  }, [active]);
  return snap;
}

/* ── Project a sim snapshot onto the backend /iot/latest gauge shape ──────── */
export function simToGauges(s) {
  if (!s) return null;
  const sun = Math.max(0, Math.sin((s.hour - 6) / 12 * Math.PI));  // 0 night → 1 midday
  const extTemp = +(14 + 13 * sun).toFixed(1);                     // ~14°C night → ~27°C midday
  const extHum = Math.round(78 - 33 * sun);                        // higher at night
  return {
    nodeA: {
      soil:     Math.round(s.soil),
      pressure: +s.pressure.toFixed(1),   // bar (same unit as /iot-devices)
      flow:     +s.flow.toFixed(1),
      temp:     +s.soilTemp.toFixed(1),
    },
    nodeB: {
      weight:    +s.weight.toFixed(1),
      broodTemp: +s.brood.toFixed(1),
      extTemp,
      extHum,
    },
    _source: 'sim',
  };
}
