import { COLORS } from './BeeConstants';

export function compressImage(dataUrl, maxW = 480) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function drawBboxes(canvas, containerEl, detections, accentColor = COLORS.accent) {
  if (!canvas || !containerEl || !detections?.length) return;
  canvas.width  = containerEl.offsetWidth;
  canvas.height = containerEl.offsetHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const W = canvas.width, H = canvas.height;
  detections.forEach(det => {
    const [cx_p, cy_p, w_p, h_p] = det.bbox;
    const w = (w_p / 100) * W, h = (h_p / 100) * H;
    const cx = (cx_p / 100) * W, cy = (cy_p / 100) * H;
    const x1 = cx - w / 2, y1 = cy - h / 2;
    ctx.save();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = accentColor;
    ctx.strokeRect(x1, y1, w, h);
    const lbl = `${det.label} ${Math.floor(det.confidence * 100)}%`;
    ctx.font = 'bold 10px Inter,sans-serif';
    const tw = ctx.measureText(lbl).width;
    ctx.shadowBlur = 0;
    ctx.fillStyle = accentColor;
    ctx.fillRect(x1, Math.max(0, y1 - 17), tw + 8, 17);
    ctx.fillStyle = '#000';
    ctx.fillText(lbl, x1 + 4, Math.max(12, y1 - 4));
    ctx.restore();
  });
}

export function generateReport(hive, detections, prediction) {
  const beeCount = detections.filter(d => d.label.toLowerCase().includes('bee')).length;
  const total    = detections.length;
  const avgConf  = total > 0
    ? Math.round(detections.reduce((s, d) => s + d.confidence, 0) / total * 100) : 0;
  const activityLevel = beeCount >= 10 ? 'Élevée' : beeCount >= 5 ? 'Normale' : beeCount >= 2 ? 'Faible' : 'Très faible';
  const activityColor = beeCount >= 10 ? COLORS.success : beeCount >= 5 ? COLORS.honey : COLORS.error;
  const healthScore   = hive.health_score ?? 7;
  const healthLabel   = healthScore >= 8 ? 'Excellente' : healthScore >= 6 ? 'Bonne' : healthScore >= 4 ? 'À surveiller' : 'Critique';
  const recs = [];
  if (beeCount < 2) recs.push({ text: "Activité d'entrée très faible — inspection urgente recommandée", color: COLORS.error });
  if (healthScore < 5) recs.push({ text: 'Score santé critique — traitement prioritaire', color: COLORS.error });
  if (healthScore >= 7 && beeCount >= 5) recs.push({ text: 'Colonie active et en bonne condition', color: COLORS.success });
  if (prediction?.predictions?.sirop_L > 0) recs.push({ text: `Besoin sirop prédit: ${prediction.predictions.sirop_L}L`, color: COLORS.info });
  if (prediction?.predictions?.traitement > 0) recs.push({ text: `Traitement Varroa prédit: ${prediction.predictions.traitement} dose(s)`, color: COLORS.honey });
  if (prediction?.predictions?.cadres > 0) recs.push({ text: `Cadres à prévoir: ${prediction.predictions.cadres}`, color: COLORS.accent });
  if (recs.length === 0) recs.push({ text: 'Aucune anomalie détectée — colonie stable', color: COLORS.success });
  return { beeCount, total, avgConf, activityLevel, activityColor, healthLabel, healthScore, recs };
}
