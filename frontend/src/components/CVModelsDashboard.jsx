/**
 * CVModelsDashboard — ML / Deep Learning / Computer Vision
 * 13 modèles YOLOv11 · 96 classes · data.yaml · APIs temps réel · MLOps
 */
import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Treemap,
} from 'recharts';
import {
  Brain, Eye, Activity, AlertTriangle, CheckCircle, Zap,
  TrendingUp, BarChart2, Shield, Cpu, Leaf, Bug, Flame,
  Database, Layers, Target, GitBranch,
} from 'lucide-react';
import api from '../services/api';

/* ══════════════════════════════════════════════════════════════════
   STATIC MODEL REGISTRY — from data.yaml files (13 modèles)
══════════════════════════════════════════════════════════════════ */
const MODEL_REGISTRY = [
  {
    key: 'livestock', name: 'Livestock Detection', arch: 'YOLOv11', task: 'detection',
    species: ['cow','goat','sheep'], nc: 3, color: '#7c3aed', icon: '🐄',
    project: 'goat-sheet-and-cow-detection', domain: 'animal',
    classes: ['cow','goat','sheep'], license: 'CC BY 4.0', workspace: 'deep-learning-in-livestock', version: 2,
  },
  {
    key: 'cow_behavior', name: 'Cow Behavior', arch: 'YOLOv11', task: 'behavior',
    species: ['cow'], nc: 3, color: '#0891b2', icon: '🐄',
    project: 'cow-lie-stand-walk', domain: 'animal',
    classes: ['Lie','Stand','Walk'], license: 'MIT', workspace: 'rev-tvsjf', version: 2,
  },
  {
    key: 'goat_disease', name: 'Goat Skin Disease', arch: 'YOLOv11', task: 'disease',
    species: ['goat'], nc: 5, color: '#dc2626', icon: '🐐',
    project: 'goat-skin-disease', domain: 'animal',
    classes: ['Cheesy gland','Contagious ecthyma','Lice infestation','Mange','Ringworm'],
    license: 'CC BY 4.0', workspace: 'kesters-workspace', version: 13,
  },
  {
    key: 'chicken_disease', name: 'Poultry Disease', arch: 'YOLOv11', task: 'disease',
    species: ['poultry'], nc: 6, color: '#d97706', icon: '🐔',
    project: 'chicken-yiokh', domain: 'animal',
    classes: ['Chicken Favus','Fowl Pox','coryza','crd','normal','weak_leg'],
    license: 'CC BY 4.0', workspace: 'pfe-z5iqn', version: 1,
  },
  {
    key: 'chicken_detect', name: 'Chicken Detection', arch: 'YOLOv11', task: 'detection',
    species: ['poultry'], nc: 1, color: '#f59e0b', icon: '🐔',
    project: 'chicken-detection-and-tracking', domain: 'animal',
    classes: ['rooster'], license: 'Public Domain', workspace: 'chickens', version: 11,
  },
  {
    key: 'rabbit', name: 'Rabbit Detection', arch: 'YOLOv11', task: 'detection',
    species: ['rabbit'], nc: 1, color: '#db2777', icon: '🐰',
    project: 'rabit-cqcaz', domain: 'animal',
    classes: ['rabit'], license: 'CC BY 4.0', workspace: 'cho585s', version: 2,
  },
  {
    key: 'bee', name: 'Bee Detection OBB', arch: 'YOLOv11-OBB', task: 'obb',
    species: ['bee'], nc: 4, color: '#fbbf24', icon: '🐝',
    project: 'beedata', domain: 'animal',
    classes: ['bee', 'drone', 'pollenbee', 'queen'],
    license: 'Kaggle', workspace: 'mohamedsayari77', version: 1,
    epochs: 120, imgsz: 768, optimizer: 'AdamW',
  },
  {
    key: 'fire', name: 'Fire & Smoke Detection', arch: 'YOLOv11', task: 'security',
    species: ['all'], nc: 8, color: '#ef4444', icon: '🔥',
    project: 'fire-detection-for-khkt', domain: 'security',
    classes: ['fire','smoke','object','0','1','2','3','4'],
    license: 'MIT', workspace: 'kuumoneko', version: 1,
  },
  {
    key: 'leaves', name: 'Leaf Disease Detection', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 12, color: '#16a34a', icon: '🌿',
    project: 'detecting-diseases', domain: 'plant',
    classes: ['Beans_Angular_LeafSpot','Beans_Rust','Strawberry_Angular_LeafSpot','Strawberry_Anthracnose_Fruit_Rot','Strawberry_Blossom_Blight','Strawberry_Gray_Mold','Strawberry_Leaf_Spot','Strawberry_Powdery_Mildew_Fruit','Strawberry_Powdery_Mildew_Leaf','Tomato_Blight','Tomato_Leaf_Mold','Tomato_Spider_Mites'],
    license: 'CC BY 4.0', workspace: 'artificial-intelligence-82oex', version: 6,
  },
  {
    key: 'insects', name: 'Agricultural Insects', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 10, color: '#059669', icon: '🐛',
    project: 'insects-mytwu', domain: 'plant',
    classes: ['army worm','legume blister beetle','red spider','rice gall midge','rice leaf roller','rice leafhopper','rice water weevil','wheat phloeothrips','white backed plant hopper','yellow rice borer'],
    license: 'CC BY 4.0', workspace: 'roboflow-100', version: 2,
  },
  {
    key: 'olive', name: 'Olive Tree Disease', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 5, color: '#84cc16', icon: '🫒',
    project: 'olive-tree-diseases', domain: 'plant',
    classes: ['Anthracnose','BlackScale','OlivePeacockSpot','Psyllid','Tuberculosis'],
    license: 'CC BY 4.0', workspace: 'arina-fay', version: 1,
  },
  {
    key: 'plantdoc', name: 'PlantDoc (30 classes)', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 30, color: '#22c55e', icon: '🌱',
    project: 'plantdoc', domain: 'plant',
    classes: ['Apple Scab Leaf','Apple leaf','Apple rust leaf','Bell_pepper leaf','Bell_pepper leaf spot','Blueberry leaf','Cherry leaf','Corn Gray leaf spot','Corn leaf blight','Corn rust leaf','Peach leaf','Potato leaf','Potato leaf early blight','Potato leaf late blight','Raspberry leaf','Soyabean leaf','Soybean leaf','Squash Powdery mildew leaf','Strawberry leaf','Tomato Early blight leaf','Tomato Septoria leaf spot','Tomato leaf','Tomato leaf bacterial spot','Tomato leaf late blight','Tomato leaf mosaic virus','Tomato leaf yellow virus','Tomato mold leaf','Tomato two spotted spider mites leaf','grape leaf','grape leaf black rot'],
    license: 'CC BY 4.0', workspace: 'joseph-nelson', version: 4,
  },
  {
    key: 'orange', name: 'Orange Leaf Disease', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 3, color: '#f97316', icon: '🍊',
    project: 'orange-disease-2twml', domain: 'plant',
    classes: ['Orange_Huanglongbing','Orange_canker','Orange_healthy'],
    license: 'CC BY 4.0', workspace: 'leaf-diseases-detection', version: 1,
  },
  {
    key: 'lemon', name: 'Lemon Leaf Disease', arch: 'YOLOv11', task: 'phyto',
    species: ['plants'], nc: 9, color: '#eab308', icon: '🍋',
    project: 'lemon-leaf-diseases', domain: 'plant',
    classes: ['anthracnose','bacterial_blight','citrus_canker','curl_virus','deficiency_leaf','dry_leaf','healthy_leaf','sooty_mould','spider_mites'],
    license: 'MIT', workspace: 'object-detection-eh4ut', version: 1,
  },
];

const TOTAL_CLASSES = MODEL_REGISTRY.reduce((s, m) => s + m.nc, 0);

/* ══════════════════════════════════════════════════════════════════
   TRAINING CONFIG — from args.yaml (all 14 models)
══════════════════════════════════════════════════════════════════ */
const TRAINING_CONFIG = {
  livestock:       { epochs:50,  imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  cow_behavior:    { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  goat_disease:    { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  chicken_disease: { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  chicken_detect:  { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  rabbit:          { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  bee:             { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo26n-obb' },
  fire:            { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  leaves:          { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  insects:         { epochs:100, imgsz:640, patience:100, batch:8, lr0:0.001, mixup:0.2, copy_paste:0,   degrees:10, flipud:0,   shear:2, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  lemon:           { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  olive:           { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  orange:          { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0,   copy_paste:0,   degrees:0,  flipud:0,   shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
  plantdoc:        { epochs:120, imgsz:768, patience:25,  batch:8, lr0:0.001, mixup:0.1, copy_paste:0.1, degrees:10, flipud:0.1, shear:0, mosaic:1, erasing:0.4, model_base:'yolo11n'    },
};

/* ── Palette helpers ─────────────────────────────────────────── */
const C = {
  bg:      '#0f172a',
  surface: '#1e293b',
  border:  'rgba(255,255,255,.08)',
  text:    '#f1f5f9',
  muted:   '#64748b',
  accent:  '#6366f1',
  green:   '#22c55e',
  red:     '#ef4444',
  amber:   '#f59e0b',
  cyan:    '#06b6d4',
};
const cardS = {
  background: C.surface, borderRadius: 20,
  border: `1px solid ${C.border}`, padding: '20px 24px',
  display: 'flex', flexDirection: 'column', gap: 16,
};
const TT = {
  contentStyle: { background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, fontSize: 11, color: '#f1f5f9' },
  labelStyle: { color: '#94a3b8', fontWeight: 700 },
};
const SectionHdr = ({ icon, title, sub, badge }) => (
  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
    <div style={{ width:36, height:36, borderRadius:10, background:`${C.accent}20`, border:`1px solid ${C.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {icon}
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontWeight:800, color:C.text, fontSize:14 }}>{title}</div>
      {sub && <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{sub}</div>}
    </div>
    {badge && <span style={{ padding:'4px 12px', borderRadius:99, background:`${C.accent}15`, border:`1px solid ${C.accent}30`, fontSize:10, fontWeight:800, color:C.accent, letterSpacing:.5 }}>{badge}</span>}
  </div>
);

/* ══════════════════════════════════════════════════════════════════
   1. MODEL REGISTRY CARDS (static data.yaml info)
══════════════════════════════════════════════════════════════════ */
function ModelRegistryGrid() {
  const byTask = useMemo(() => {
    const groups = {};
    MODEL_REGISTRY.forEach(m => {
      if (!groups[m.task]) groups[m.task] = [];
      groups[m.task].push(m);
    });
    return groups;
  }, []);

  const taskLabels = { detection:'Détection', behavior:'Comportement', disease:'Pathologie', security:'Sécurité', phyto:'Phyto-IA', obb:'OBB Detection' };

  return (
    <div style={cardS}>
      <SectionHdr icon={<Brain size={18} color={C.accent}/>} title="Registre Modèles YOLOv11" sub="13 modèles embarqués · data.yaml · Roboflow datasets" badge={`${MODEL_REGISTRY.length} modèles`} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(100px,1fr))', gap:10 }}>
        {[
          { l:'Total Classes', v: TOTAL_CLASSES,            c:C.accent },
          { l:'Modèles IA',    v: MODEL_REGISTRY.length,   c:C.cyan   },
          { l:'Espèces',       v: 7,                        c:C.green  },
          { l:'Architecture',  v: 'YOLOv11/OBB',           c:C.amber  },
        ].map(k => (
          <div key={k.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}`, textAlign:'center' }}>
            <div style={{ fontSize:10, color:C.muted, fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>{k.l}</div>
            <div style={{ fontSize:20, fontWeight:900, color:k.c, marginTop:6 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:10, letterSpacing:.5 }}>CLASSES PAR MODÈLE (data.yaml · nc)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MODEL_REGISTRY.map(m=>({ name: m.icon+' '+m.name.split(' ')[0], nc: m.nc, fill: m.color }))} margin={{left:-10,right:10,top:5,bottom:40}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="name" tick={{ fill:C.muted, fontSize:9 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0}/>
            <YAxis tick={{ fill:C.muted, fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip {...TT}/>
            <Bar dataKey="nc" radius={[6,6,0,0]} name="Nb classes">
              {MODEL_REGISTRY.map((m,i)=><Cell key={i} fill={m.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DISTRIBUTION PAR TÂCHE</div>
          <ResponsiveContainer width="100%" height={160}>
            <RadarChart data={Object.entries(byTask).map(([t,ms])=>({ task: taskLabels[t]||t, count: ms.length, totalClasses: ms.reduce((s,m)=>s+m.nc,0) }))}>
              <PolarGrid stroke={C.border}/>
              <PolarAngleAxis dataKey="task" tick={{ fill:C.muted, fontSize:9 }}/>
              <PolarRadiusAxis tick={false} axisLine={false}/>
              <Radar dataKey="count" stroke={C.accent} fill={C.accent} fillOpacity={0.3} name="Nb modèles"/>
              <Radar dataKey="totalClasses" stroke={C.cyan} fill={C.cyan} fillOpacity={0.2} name="Total classes"/>
              <Legend wrapperStyle={{ fontSize:10 }}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>COUVERTURE DOMAINES</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={[
                { name:'Animaux',  value: MODEL_REGISTRY.filter(m=>m.domain==='animal').length,   fill:'#7c3aed' },
                { name:'Plantes',  value: MODEL_REGISTRY.filter(m=>m.domain==='plant').length,    fill:'#16a34a' },
                { name:'Sécurité', value: MODEL_REGISTRY.filter(m=>m.domain==='security').length, fill:'#ef4444' },
              ]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                {['#7c3aed','#16a34a','#ef4444'].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{ fontSize:10 }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2. LIVE CV DETECTIONS (API /cv/events)
══════════════════════════════════════════════════════════════════ */
function LiveDetectionsChart({ events }) {
  const classFreq = useMemo(() => {
    const freq = {};
    events.forEach(e => { freq[e.object_class] = (freq[e.object_class]||0)+1; });
    return Object.entries(freq)
      .map(([cls,n])=>({ class: cls, count: n, conf: Math.round(events.filter(e=>e.object_class===cls).reduce((s,e)=>s+(e.confidence||0),0)/n*100)/100 }))
      .sort((a,b)=>b.count-a.count).slice(0,12);
  }, [events]);

  const timeSeriesData = useMemo(() => {
    const byHour = {};
    events.forEach(e => {
      const h = e.timestamp ? new Date(e.timestamp).toISOString().slice(0,13) : 'unknown';
      if (!byHour[h]) byHour[h] = { time: h.slice(11), total:0, high:0 };
      byHour[h].total++;
      if ((e.confidence||0)>0.8) byHour[h].high++;
    });
    return Object.values(byHour).slice(-24);
  }, [events]);

  if (!events.length) return (
    <div style={{ ...cardS, alignItems:'center', justifyContent:'center', minHeight:200, color:C.muted, fontSize:13 }}>
      Aucune détection CV disponible · Lancez une analyse IA pour voir les résultats
    </div>
  );

  return (
    <div style={cardS}>
      <SectionHdr icon={<Eye size={18} color={C.cyan}/>} title="Détections Computer Vision Live" sub={`${events.length} événements · Toutes caméras · Tous modèles`} badge="LIVE"/>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>FRÉQUENCE PAR CLASSE</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classFreq} layout="vertical" margin={{left:20,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="class" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} width={100}/>
              <Tooltip {...TT}/>
              <Bar dataKey="count" radius={[0,6,6,0]} name="Détections">
                {classFreq.map((d,i)=><Cell key={i} fill={`hsl(${(i*37)%360},70%,55%)`}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>CONFIANCE MOY. PAR CLASSE</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classFreq.slice(0,8)} margin={{left:-15,right:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="class" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
              <YAxis domain={[0,1]} tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={v=>[`${(v*100).toFixed(0)}%`,'Confiance']}/>
              <ReferenceLine y={0.5} stroke={C.amber} strokeDasharray="4 2" label={{value:'50%',fill:C.amber,fontSize:9}}/>
              <ReferenceLine y={0.8} stroke={C.green} strokeDasharray="4 2" label={{value:'80%',fill:C.green,fontSize:9}}/>
              <Bar dataKey="conf" radius={[6,6,0,0]} name="Confiance moy.">
                {classFreq.slice(0,8).map((d,i)=><Cell key={i} fill={d.conf>0.8?C.green:d.conf>0.5?C.amber:C.red}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {timeSeriesData.length > 2 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>VOLUME DÉTECTIONS (24h) · Haute confiance &gt;80%</div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={timeSeriesData} margin={{left:-10,right:10,top:5}}>
              <defs>
                <linearGradient id="cvTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
                <linearGradient id="cvHigh" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.green} stopOpacity={0.4}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="time" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Area type="monotone" dataKey="total" stroke={C.accent} fill="url(#cvTotal)" strokeWidth={2} name="Total détections"/>
              <Area type="monotone" dataKey="high"  stroke={C.green}  fill="url(#cvHigh)"  strokeWidth={2} name="Haute conf. (>80%)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3. MLOPS DRIFT MONITOR (API /cv/stats/drift)
══════════════════════════════════════════════════════════════════ */
function MLOpsDriftMonitor({ driftData }) {
  const chartData = useMemo(() => {
    if (!driftData?.categories) return [];
    return Object.entries(driftData.categories).map(([cat,d])=>({
      model:    cat,
      current:  d.current_window?.mean_pct  || 0,
      previous: d.previous_window?.mean_pct || 0,
      drift:    d.drift_detected,
      drop:     d.mean_drop_pp || 0,
      stdCur:   d.current_window?.std_pct   || 0,
      stdPrev:  d.previous_window?.std_pct  || 0,
    }));
  }, [driftData]);

  const overallOk = driftData?.overall_status?.includes('STABLE');

  return (
    <div style={cardS}>
      <SectionHdr
        icon={<Activity size={18} color={overallOk?C.green:C.red}/>}
        title="MLOps · Drift Monitor"
        sub="Détection dérive confiance modèles · Fenêtre glissante 7j vs 7j précédents"
        badge={driftData?.overall_status || 'N/A'}
      />

      {!chartData.length ? (
        <div style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'24px 0' }}>
          Données drift non disponibles — Lancez des analyses pour accumuler des métriques
        </div>
      ) : (
        <>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {chartData.map(d=>(
              <div key={d.model} style={{ flex:'1 1 140px', padding:'10px 14px', borderRadius:12, background:d.drift?`${C.red}10`:`${C.green}08`, border:`1px solid ${d.drift?C.red:C.green}25` }}>
                <div style={{ fontSize:10, fontWeight:800, color:C.muted, letterSpacing:.5 }}>{d.model.toUpperCase()}</div>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:6 }}>
                  {d.drift ? <AlertTriangle size={12} color={C.red}/> : <CheckCircle size={12} color={C.green}/>}
                  <span style={{ fontSize:11, fontWeight:700, color:d.drift?C.red:C.green }}>{d.drift?'DRIFT':'STABLE'}</span>
                </div>
                <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>Δ {d.drop>0?'+':''}{d.drop.toFixed(1)} pp</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>CONFIANCE ACTUELLE vs PRÉCÉDENTE (%)</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{left:-10,right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                <XAxis dataKey="model" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} unit="%"/>
                <Tooltip {...TT}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="current"  fill={C.accent} radius={[4,4,0,0]} name="Fenêtre actuelle" barSize={20}/>
                <Bar dataKey="previous" fill={C.muted}  radius={[4,4,0,0]} name="Fenêtre précédente" barSize={20}/>
                <ReferenceLine y={50} stroke={C.amber} strokeDasharray="4 2"/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>STABILITÉ (STD ACTUELLE)</div>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={chartData}>
                  <PolarGrid stroke={C.border}/>
                  <PolarAngleAxis dataKey="model" tick={{fill:C.muted,fontSize:9}}/>
                  <PolarRadiusAxis tick={false} axisLine={false}/>
                  <Radar dataKey="stdCur"  stroke={C.red}   fill={C.red}   fillOpacity={0.25} name="Std actuelle"/>
                  <Radar dataKey="stdPrev" stroke={C.amber} fill={C.amber} fillOpacity={0.15} name="Std précédente"/>
                  <Legend wrapperStyle={{fontSize:10}}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DÉRIVE PAR MODÈLE (pp)</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{left:-15,right:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="model" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} angle={-25} textAnchor="end"/>
                  <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                  <ReferenceLine y={10} stroke={C.red} strokeDasharray="4 2" label={{value:'Seuil 10pp',fill:C.red,fontSize:9}}/>
                  <Tooltip {...TT} formatter={v=>[`${v.toFixed(1)} pp`,'Drift']}/>
                  <Bar dataKey="drop" name="Drift (pp)" radius={[4,4,0,0]}>
                    {chartData.map((d,i)=><Cell key={i} fill={d.drift?C.red:C.green}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   4. ANIMAL DISEASE PREVALENCE (data.yaml classes embedded)
══════════════════════════════════════════════════════════════════ */
function DiseasePrevalenceChart({ events }) {
  const DISEASE_MAP = {
    'Chicken Favus':      { animal:'Volaille', color:'#d97706', risk:'high'    },
    'Fowl Pox':           { animal:'Volaille', color:'#f59e0b', risk:'medium'  },
    'coryza':             { animal:'Volaille', color:'#fbbf24', risk:'medium'  },
    'crd':                { animal:'Volaille', color:'#fcd34d', risk:'low'     },
    'weak_leg':           { animal:'Volaille', color:'#d97706', risk:'low'     },
    'Cheesy gland':       { animal:'Caprin',   color:'#dc2626', risk:'high'    },
    'Contagious ecthyma': { animal:'Caprin',   color:'#ef4444', risk:'high'    },
    'Lice infestation':   { animal:'Caprin',   color:'#f87171', risk:'medium'  },
    'Mange':              { animal:'Caprin',   color:'#fca5a5', risk:'medium'  },
    'Ringworm':           { animal:'Caprin',   color:'#dc2626', risk:'low'     },
    'Anthracnose':        { animal:'Olivier',  color:'#84cc16', risk:'high'    },
    'BlackScale':         { animal:'Olivier',  color:'#65a30d', risk:'medium'  },
    'OlivePeacockSpot':   { animal:'Olivier',  color:'#4d7c0f', risk:'medium'  },
    'fire':               { animal:'Sécurité', color:'#ef4444', risk:'critical'},
    'smoke':              { animal:'Sécurité', color:'#f97316', risk:'critical'},
  };

  const prevalence = useMemo(() => {
    const freq = {};
    events.forEach(e => {
      const cls = e.object_class;
      const info = DISEASE_MAP[cls];
      if (!info) return;
      if (!freq[cls]) freq[cls] = { name:cls, ...info, count:0, totalConf:0 };
      freq[cls].count++;
      freq[cls].totalConf += (e.confidence||0);
    });
    return Object.values(freq).sort((a,b)=>b.count-a.count);
  }, [events]);

  const staticDisplay = [
    { name:'Fowl Pox',    animal:'Volaille', count:0, risk:'medium',   color:'#d97706' },
    { name:'Mange',       animal:'Caprin',   count:0, risk:'medium',   color:'#dc2626' },
    { name:'Anthracnose', animal:'Olivier',  count:0, risk:'high',     color:'#84cc16' },
    { name:'fire',        animal:'Sécurité', count:0, risk:'critical', color:'#ef4444' },
  ];
  const displayData = prevalence.length ? prevalence : staticDisplay;
  const riskLevels  = ['critical','high','medium','low'];
  const riskColors  = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };

  return (
    <div style={cardS}>
      <SectionHdr icon={<Shield size={18} color={C.red}/>} title="Prévalence Pathologies · Deep Learning CV" sub="Classes maladies détectées par YOLOv11 · data.yaml mapping" badge="PATHOLOGIE"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DISTRIBUTION NIVEAUX DE RISQUE</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={riskLevels.map(r=>({ name:r.toUpperCase(), value: MODEL_REGISTRY.flatMap(m=>m.classes).filter(c=>DISEASE_MAP[c]?.risk===r).length || 1 }))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value"
              >
                {riskLevels.map((r,i)=><Cell key={i} fill={riskColors[r]}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>MALADIES DÉTECTÉES (classes data.yaml)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displayData.slice(0,8)} layout="vertical" margin={{left:10,right:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={110}/>
              <Tooltip {...TT}/>
              <Bar dataKey="count" radius={[0,6,6,0]} name="Détections">
                {displayData.slice(0,8).map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:10 }}>COUVERTURE MALADIES PAR ESPÈCE (data.yaml)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
          {MODEL_REGISTRY.filter(m=>m.task==='disease'||m.task==='security').map(m=>(
            <div key={m.key} style={{ background:'rgba(255,255,255,.03)', borderRadius:14, padding:'12px 14px', border:`1px solid ${m.color}25` }}>
              <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
              <div style={{ fontSize:11, fontWeight:800, color:'white' }}>{m.name}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{m.nc} classes · {m.arch}</div>
              <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                {m.classes.slice(0,3).map(c=>(
                  <span key={c} style={{ fontSize:8, padding:'2px 7px', borderRadius:99, background:`${m.color}15`, color:m.color, fontWeight:700 }}>{c}</span>
                ))}
                {m.classes.length>3 && <span style={{ fontSize:8, color:C.muted }}>+{m.classes.length-3}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   5. COW BEHAVIOR DEEP LEARNING ANALYSIS
══════════════════════════════════════════════════════════════════ */
function BehaviorAnalysisChart({ events }) {
  const behaviorData = useMemo(() => {
    const behaviors = { Lie:0, Stand:0, Walk:0 };
    events.filter(e => ['Lie','Stand','Walk'].includes(e.object_class))
          .forEach(e => { behaviors[e.object_class]++; });
    return Object.entries(behaviors).map(([b,v])=>({ behavior:b, count:v }));
  }, [events]);

  const totalBehaviors = behaviorData.reduce((s,d)=>s+d.count,0);
  const walkPct  = totalBehaviors ? Math.round((behaviorData.find(d=>d.behavior==='Walk')?.count||0)/totalBehaviors*100) : 0;
  const liePct   = totalBehaviors ? Math.round((behaviorData.find(d=>d.behavior==='Lie')?.count||0)/totalBehaviors*100) : 0;
  const stressScore = liePct > 60 ? 'Stress élevé' : walkPct > 50 ? 'Activité normale' : 'Repos optimal';
  const insight = liePct > 60
    ? '⚠️ Taux de Lie élevé — possible douleur ou maladie. Inspection vétérinaire recommandée.'
    : walkPct > 50
    ? '✅ Activité de marche normale — troupeau en bonne santé comportementale.'
    : '📊 Distribution comportementale équilibrée — continuer monitoring.';

  return (
    <div style={cardS}>
      <SectionHdr icon={<Activity size={18} color={C.cyan}/>} title="Analyse Comportementale Bovins · YOLOv11" sub="Modèle cow_behavior · Classes: Lie / Stand / Walk (data.yaml)" badge="BEHAVIOR DL"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
        {[
          { l:'Score Activité', v:stressScore, c:liePct>60?C.red:C.green },
          { l:'Taux Lie', v:`${liePct}%`, c:liePct>60?C.red:C.amber, sub:'Repos / Douleur' },
          { l:'Taux Walk', v:`${walkPct}%`, c:C.green, sub:'Activité normale' },
        ].map(k=>(
          <div key={k.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'12px 14px', border:`1px solid ${C.border}`, textAlign:'center' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:800, letterSpacing:.8, textTransform:'uppercase' }}>{k.l}</div>
            <div style={{ fontSize:17, fontWeight:900, color:k.c, marginTop:6, lineHeight:1.2 }}>{k.v}</div>
            {k.sub && <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DISTRIBUTION COMPORTEMENTS</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={totalBehaviors>0 ? behaviorData : [{behavior:'Lie',count:40},{behavior:'Stand',count:45},{behavior:'Walk',count:15}]}
                cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count"
              >
                {['#0891b2','#6366f1','#22c55e'].map((c,i)=><Cell key={i} fill={c}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>INDICE BIEN-ÊTRE (modèle DL)</div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={[
              { metric:'Mobilité',   score: walkPct > 30 ? 85 : 50 },
              { metric:'Repos',      score: liePct  > 60 ? 40 : 80 },
              { metric:'Debout',     score: behaviorData.find(d=>d.behavior==='Stand')?.count ? 70 : 50 },
              { metric:'Activité',   score: walkPct },
              { metric:'Bien-être',  score: liePct > 60 ? 40 : 75 },
            ]}>
              <PolarGrid stroke={C.border}/>
              <PolarAngleAxis dataKey="metric" tick={{fill:C.muted,fontSize:9}}/>
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="score" stroke={C.cyan} fill={C.cyan} fillOpacity={0.3}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ padding:'12px 16px', borderRadius:12, background:`${C.cyan}08`, border:`1px solid ${C.cyan}20`, fontSize:12, color:'#e2e8f0', lineHeight:1.5 }}>
        <strong style={{color:C.cyan}}>IA Insight Comportemental :</strong> {insight}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   6. MODEL HEALTH STATUS (API /cv/models/health)
══════════════════════════════════════════════════════════════════ */
function ModelHealthStatus({ healthData }) {
  const modelsList = useMemo(() => {
    if (!healthData?.models) return MODEL_REGISTRY.map(m=>({ ...m, loaded: false, path_exists: false }));
    return MODEL_REGISTRY.map(m=>{
      const h = healthData.models[m.key] || {};
      return { ...m, loaded: h.loaded||false, path_exists: h.path_exists||false };
    });
  }, [healthData]);

  const loadedCount = modelsList.filter(m=>m.loaded).length;
  const readyCount  = modelsList.filter(m=>m.path_exists).length;

  return (
    <div style={cardS}>
      <SectionHdr icon={<Cpu size={18} color={C.amber}/>} title="État des Modèles Deep Learning" sub={`${loadedCount}/${MODEL_REGISTRY.length} chargés · ${readyCount} fichiers .pt disponibles`} badge={`${Math.round(loadedCount/MODEL_REGISTRY.length*100)}% ready`}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10 }}>
        {modelsList.map(m=>(
          <div key={m.key} style={{ background:'rgba(255,255,255,.02)', borderRadius:14, padding:'14px 16px', border:`1px solid ${m.loaded?m.color+'40':C.border}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <span style={{ fontSize:20 }}>{m.icon}</span>
              <span style={{ padding:'2px 8px', borderRadius:99, fontSize:9, fontWeight:800, background:m.loaded?`${C.green}15`:`${C.red}12`, color:m.loaded?C.green:C.red, border:`1px solid ${m.loaded?C.green:C.red}25` }}>
                {m.loaded ? 'LOADED' : m.path_exists ? 'READY' : 'MISSING'}
              </span>
            </div>
            <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:3 }}>{m.name}</div>
            <div style={{ fontSize:9, color:C.muted }}>{m.arch} · {m.nc} classes</div>
            <div style={{ fontSize:9, color:m.color, marginTop:4, fontWeight:600 }}>{m.task.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>CLASSES PAR TÂCHE ML</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={Object.entries(
            MODEL_REGISTRY.reduce((g,m)=>{ g[m.task]=(g[m.task]||0)+m.nc; return g; },{})
          ).map(([t,nc])=>({ task:t, classes:nc }))} margin={{left:-10,right:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="task" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip {...TT}/>
            <Bar dataKey="classes" name="Total classes" radius={[6,6,0,0]}>
              {['#6366f1','#0891b2','#ef4444','#f59e0b','#16a34a'].map((c,i)=><Cell key={i} fill={c}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   7. PLANT CV INTELLIGENCE (API /cv/stats/plants)
══════════════════════════════════════════════════════════════════ */
function PlantCVIntelligence({ plantStats }) {
  const plantModels = MODEL_REGISTRY.filter(m => m.domain === 'plant');
  const totalPlantClasses = plantModels.reduce((s,m)=>s+m.nc, 0);

  return (
    <div style={cardS}>
      <SectionHdr icon={<Leaf size={18} color={C.green}/>} title="Phyto-Intelligence · Modèles Maladies Végétales" sub={`${plantModels.length} modèles · ${totalPlantClasses} classes · Feuilles/Insectes/Olivier/Agrumes`} badge="PHYTO DL"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {plantStats && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>STATS DÉTECTIONS PLANTES (7j)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { l:'Total détections', v:plantStats.total_detections||0,   c:C.green },
                { l:'Confiance moy.',   v:`${plantStats.avg_confidence_pct||0}%`, c:C.cyan  },
                { l:'Insectes 7j',      v:plantStats.insect_detections_7d||0, c:C.amber },
              ].map(k=>(
                <div key={k.l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,.03)', border:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:12, color:C.muted }}>{k.l}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:k.c }}>{k.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>MODÈLES PHYTO (data.yaml)</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={plantModels.map(d=>({ name:`${d.icon} ${d.name.split(' ')[0]}`, value:d.nc }))} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                {plantModels.map((m,i)=><Cell key={i} fill={m.color}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:9}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
        {plantModels.map(m=>(
          <div key={m.key} style={{ background:'rgba(255,255,255,.03)', borderRadius:14, padding:14, border:`1px solid ${m.color}25` }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{m.icon}</div>
            <div style={{ fontSize:11, fontWeight:800, color:m.color }}>{m.name}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>{m.nc} classes · v{m.version}</div>
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
              {m.classes.slice(0,3).map(c=>(
                <div key={c} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:m.color, flexShrink:0 }}/>
                  <span style={{ fontSize:9, color:C.muted }}>{c.replace(/_/g,' ')}</span>
                </div>
              ))}
              {m.classes.length>3 && <span style={{ fontSize:9, color:C.muted }}>+{m.classes.length-3} classes…</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   8. CLASS TAXONOMY TREEMAP — tous les 96 classes data.yaml
══════════════════════════════════════════════════════════════════ */
const TREEMAP_COLORS = {
  animal:   ['#7c3aed','#8b5cf6','#a78bfa','#0891b2','#06b6d4','#dc2626','#ef4444','#d97706','#f59e0b','#db2777'],
  plant:    ['#16a34a','#15803d','#166534','#059669','#047857','#84cc16','#65a30d','#22c55e','#f97316','#eab308'],
  security: ['#ef4444','#dc2626','#b91c1c','#f97316','#ea580c','#c2410c','#991b1b','#7f1d1d'],
};

function ClassTaxonomyTreemap() {
  const treeData = useMemo(() => {
    const domainGroups = { animal: [], plant: [], security: [] };
    MODEL_REGISTRY.forEach(m => {
      const group = domainGroups[m.domain] || domainGroups.animal;
      group.push({
        name: `${m.icon} ${m.name}`,
        size: m.nc,
        color: m.color,
        classes: m.classes.join(', '),
        nc: m.nc,
      });
    });
    return [
      { name: '🐾 Animaux', children: domainGroups.animal, color: '#7c3aed' },
      { name: '🌱 Plantes', children: domainGroups.plant,   color: '#16a34a' },
      { name: '🔥 Sécurité', children: domainGroups.security, color: '#ef4444' },
    ];
  }, []);

  const flatData = MODEL_REGISTRY.map(m => ({ name: `${m.icon} ${m.name.split(' ').slice(0,2).join(' ')}`, size: m.nc, color: m.color }));

  const CustomTreemapContent = ({ x, y, width, height, name, size, color }) => {
    if (width < 30 || height < 20) return null;
    return (
      <g>
        <rect x={x+1} y={y+1} width={width-2} height={height-2} rx={8} fill={color} fillOpacity={0.8} stroke="rgba(255,255,255,.15)" strokeWidth={1}/>
        {width > 60 && height > 30 && (
          <>
            <text x={x+width/2} y={y+height/2-6} textAnchor="middle" fill="white" fontSize={Math.min(12, width/8)} fontWeight={800}>{name}</text>
            <text x={x+width/2} y={y+height/2+10} textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize={Math.min(10, width/9)}>{size} cls</text>
          </>
        )}
      </g>
    );
  };

  const domainStats = [
    { l:'Animaux',   v: MODEL_REGISTRY.filter(m=>m.domain==='animal').reduce((s,m)=>s+m.nc,0),   c:'#7c3aed', icon:'🐾' },
    { l:'Plantes',   v: MODEL_REGISTRY.filter(m=>m.domain==='plant').reduce((s,m)=>s+m.nc,0),    c:'#16a34a', icon:'🌱' },
    { l:'Sécurité',  v: MODEL_REGISTRY.filter(m=>m.domain==='security').reduce((s,m)=>s+m.nc,0), c:'#ef4444', icon:'🔥' },
    { l:'Total',     v: TOTAL_CLASSES, c:C.accent, icon:'🧠' },
  ];

  return (
    <div style={cardS}>
      <SectionHdr icon={<Layers size={18} color={C.accent}/>} title="Taxonomie Complète des Classes · 96 Classes data.yaml" sub="Visualisation hiérarchique de tous les objets détectables par les 13 modèles YOLOv11" badge={`${TOTAL_CLASSES} classes`}/>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {domainStats.map(k=>(
          <div key={k.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:14, padding:'14px', border:`1px solid ${k.c}25`, textAlign:'center' }}>
            <div style={{ fontSize:22 }}>{k.icon}</div>
            <div style={{ fontSize:22, fontWeight:900, color:k.c, marginTop:6 }}>{k.v}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:3, fontWeight:700 }}>{k.l}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:10 }}>TREEMAP — TAILLE PROPORTIONNELLE AU NOMBRE DE CLASSES (data.yaml · nc)</div>
        <ResponsiveContainer width="100%" height={300}>
          <Treemap data={flatData} dataKey="size" aspectRatio={4/3} content={<CustomTreemapContent/>}>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                const model = MODEL_REGISTRY.find(m => `${m.icon} ${m.name.split(' ').slice(0,2).join(' ')}` === d.name);
                return (
                  <div style={{ ...TT.contentStyle, maxWidth:260 }}>
                    <div style={{ fontWeight:800, color:d.color, marginBottom:6 }}>{d.name}</div>
                    <div style={{ color:'#94a3b8', marginBottom:4 }}>{d.size} classes · {model?.arch}</div>
                    {model && <div style={{ fontSize:10, color:'#64748b', lineHeight:1.5 }}>{model.classes.slice(0,5).join(' · ')}{model.classes.length>5?` +${model.classes.length-5}`:''}</div>}
                  </div>
                );
              }}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>COMPLEXITÉ DES MODÈLES (nc × version dataset)</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={MODEL_REGISTRY.map(m=>({ name:`${m.icon}${m.name.split(' ')[0]}`, nc:m.nc, complexity: m.nc * m.version, color:m.color }))} margin={{left:-10,right:10,bottom:30}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="name" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0}/>
            <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip {...TT} formatter={(v,n)=>[v, n==='nc'?'Classes':'Complexité (nc×ver)']}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Bar dataKey="nc" name="Classes (nc)" radius={[4,4,0,0]} fill={C.accent} opacity={0.7}/>
            <Bar dataKey="complexity" name="Complexité" radius={[4,4,0,0]} fill={C.cyan} opacity={0.5}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   9. ROBOFLOW DATASET REGISTRY — data.yaml metadata
══════════════════════════════════════════════════════════════════ */
function DatasetRegistryPanel() {
  const licenseData = useMemo(() => {
    const counts = {};
    MODEL_REGISTRY.forEach(m => { counts[m.license] = (counts[m.license]||0)+1; });
    return Object.entries(counts).map(([name,value])=>({ name, value }));
  }, []);

  const workspaceData = useMemo(() => {
    return MODEL_REGISTRY.map(m=>({ workspace: m.workspace.split('-').slice(0,2).join('-'), nc: m.nc, name: m.name, color: m.color }))
      .sort((a,b)=>b.nc-a.nc);
  }, []);

  const licenseColors = { 'CC BY 4.0':'#6366f1', 'MIT':'#06b6d4', 'Public Domain':'#22c55e', 'Kaggle':'#fbbf24' };
  const versionData = MODEL_REGISTRY.map(m=>({ name:`${m.icon}${m.name.split(' ')[0]}`, version:m.version, nc:m.nc, color:m.color })).sort((a,b)=>b.version-a.version);

  return (
    <div style={cardS}>
      <SectionHdr icon={<Database size={18} color={C.cyan}/>} title="Registre Datasets Roboflow · data.yaml" sub={`13 datasets · ${MODEL_REGISTRY.reduce((s,m)=>s+m.nc,0)} classes · Roboflow Universe`} badge="DATASETS"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DISTRIBUTION LICENCES (data.yaml)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={licenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({name,value})=>`${name} (${value})`} labelLine={false}>
                {licenseData.map((d,i)=><Cell key={i} fill={licenseColors[d.name]||C.accent}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>VERSION DATASET PAR MODÈLE</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={versionData} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={90}/>
              <Tooltip {...TT} formatter={v=>[`v${v}`,'Version']}/>
              <Bar dataKey="version" radius={[0,6,6,0]} name="Version dataset">
                {versionData.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>NC × VERSION — MATURITÉ DATASET</div>
        <ResponsiveContainer width="100%" height={160}>
          <ScatterChart margin={{left:-10,right:20,top:10,bottom:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
            <XAxis dataKey="version" name="Version" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} label={{value:'Version dataset',position:'insideBottom',offset:-5,fill:C.muted,fontSize:10}}/>
            <YAxis dataKey="nc" name="Nb classes" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} label={{value:'Classes',angle:-90,position:'insideLeft',fill:C.muted,fontSize:10}}/>
            <Tooltip {...TT} cursor={{ strokeDasharray:'3 3' }} content={({active,payload})=>{
              if(!active||!payload?.length) return null;
              const d = payload[0].payload;
              return <div style={TT.contentStyle}><b style={{color:d.color}}>{d.name}</b><br/>{d.nc} classes · v{d.version}</div>;
            }}/>
            <Scatter data={MODEL_REGISTRY.map(m=>({ name:m.name, nc:m.nc, version:m.version, color:m.color }))} shape={({cx,cy,payload})=>(
              <circle cx={cx} cy={cy} r={Math.sqrt(payload.nc)*2.5} fill={payload.color} fillOpacity={0.75} stroke="rgba(255,255,255,.2)" strokeWidth={1}/>
            )}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:8 }}>
        {MODEL_REGISTRY.map(m=>(
          <div key={m.key} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,.03)', border:`1px solid ${C.border}` }}>
            <span style={{ fontSize:16 }}>{m.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.name}</div>
              <div style={{ fontSize:9, color:C.muted, marginTop:1 }}>{m.workspace} · v{m.version}</div>
            </div>
            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:`${licenseColors[m.license]||C.accent}15`, color:licenseColors[m.license]||C.accent, fontWeight:700, whiteSpace:'nowrap' }}>{m.license}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   10. CROP DISEASE INTELLIGENCE — analyse par espèce végétale
══════════════════════════════════════════════════════════════════ */
function CropDiseaseIntelligence() {
  const cropGroups = useMemo(() => {
    const crops = {};
    const addCrop = (crop, disease, model, color) => {
      if (!crops[crop]) crops[crop] = { name:crop, diseases:[], color, totalDiseases:0 };
      crops[crop].diseases.push({ name:disease, model });
      crops[crop].totalDiseases++;
    };

    // From leaves model (data.yaml)
    addCrop('🫘 Haricots',    'Angular LeafSpot',  'Leaf Disease', '#16a34a');
    addCrop('🫘 Haricots',    'Rust',              'Leaf Disease', '#16a34a');
    addCrop('🍓 Fraise',      'Angular LeafSpot',  'Leaf Disease', '#dc2626');
    addCrop('🍓 Fraise',      'Anthracnose',       'Leaf Disease', '#dc2626');
    addCrop('🍓 Fraise',      'Blossom Blight',    'Leaf Disease', '#dc2626');
    addCrop('🍓 Fraise',      'Gray Mold',         'Leaf Disease', '#dc2626');
    addCrop('🍓 Fraise',      'Leaf Spot',         'Leaf Disease', '#dc2626');
    addCrop('🍓 Fraise',      'Powdery Mildew',    'Leaf Disease', '#dc2626');
    addCrop('🍅 Tomate',      'Blight',            'Leaf Disease', '#f97316');
    addCrop('🍅 Tomate',      'Leaf Mold',         'Leaf Disease', '#f97316');
    addCrop('🍅 Tomate',      'Spider Mites',      'Leaf Disease', '#f97316');

    // From plantdoc (data.yaml)
    addCrop('🍎 Pomme',       'Scab Leaf',         'PlantDoc',     '#22c55e');
    addCrop('🍎 Pomme',       'Rust Leaf',         'PlantDoc',     '#22c55e');
    addCrop('🌶️ Poivron',    'Leaf Spot',         'PlantDoc',     '#ef4444');
    addCrop('🌽 Maïs',        'Gray Leaf Spot',    'PlantDoc',     '#f59e0b');
    addCrop('🌽 Maïs',        'Leaf Blight',       'PlantDoc',     '#f59e0b');
    addCrop('🌽 Maïs',        'Rust Leaf',         'PlantDoc',     '#f59e0b');
    addCrop('🥔 Pomme de terre','Early Blight',    'PlantDoc',     '#d97706');
    addCrop('🥔 Pomme de terre','Late Blight',     'PlantDoc',     '#d97706');
    addCrop('🍅 Tomate',      'Early Blight',      'PlantDoc',     '#f97316');
    addCrop('🍅 Tomate',      'Septoria Spot',     'PlantDoc',     '#f97316');
    addCrop('🍅 Tomate',      'Bacterial Spot',    'PlantDoc',     '#f97316');
    addCrop('🍇 Raisin',      'Black Rot',         'PlantDoc',     '#7c3aed');

    // Olive (data.yaml)
    addCrop('🫒 Olivier',     'Anthracnose',       'Olive Disease','#84cc16');
    addCrop('🫒 Olivier',     'Black Scale',       'Olive Disease','#84cc16');
    addCrop('🫒 Olivier',     'Peacock Spot',      'Olive Disease','#84cc16');
    addCrop('🫒 Olivier',     'Psyllid',           'Olive Disease','#84cc16');
    addCrop('🫒 Olivier',     'Tuberculosis',      'Olive Disease','#84cc16');

    // Orange (data.yaml)
    addCrop('🍊 Orange',      'Huanglongbing',     'Orange Leaf',  '#f97316');
    addCrop('🍊 Orange',      'Canker',            'Orange Leaf',  '#f97316');

    // Lemon (data.yaml)
    addCrop('🍋 Citron',      'Anthracnose',       'Lemon Leaf',   '#eab308');
    addCrop('🍋 Citron',      'Bacterial Blight',  'Lemon Leaf',   '#eab308');
    addCrop('🍋 Citron',      'Citrus Canker',     'Lemon Leaf',   '#eab308');
    addCrop('🍋 Citron',      'Curl Virus',        'Lemon Leaf',   '#eab308');
    addCrop('🍋 Citron',      'Sooty Mould',       'Lemon Leaf',   '#eab308');
    addCrop('🍋 Citron',      'Spider Mites',      'Lemon Leaf',   '#eab308');

    return Object.values(crops).sort((a,b)=>b.totalDiseases-a.totalDiseases);
  }, []);

  const insectClasses = MODEL_REGISTRY.find(m=>m.key==='insects')?.classes || [];

  return (
    <div style={cardS}>
      <SectionHdr icon={<Bug size={18} color={C.green}/>} title="Intelligence Maladies Végétales · Analyse par Culture" sub="Couverture pathologique complète des 6 modèles phyto · data.yaml classes" badge="PHYTO MAP"/>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>MALADIES DÉTECTABLES PAR CULTURE (data.yaml)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cropGroups} layout="vertical" margin={{left:10,right:30}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
            <XAxis type="number" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} label={{value:'Nb maladies détectables',position:'insideBottom',offset:-5,fill:C.muted,fontSize:9}}/>
            <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} width={130}/>
            <Tooltip {...TT} formatter={v=>[v,'Maladies détectables']}/>
            <Bar dataKey="totalDiseases" radius={[0,8,8,0]} name="Maladies">
              {cropGroups.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>RÉPARTITION CULTURES (nb maladies)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={cropGroups.map(c=>({ name:c.name, value:c.totalDiseases }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value">
                {cropGroups.map((c,i)=><Cell key={i} fill={c.color}/>)}
              </Pie>
              <Tooltip {...TT} formatter={v=>[v,'Maladies']}/>
              <Legend wrapperStyle={{fontSize:9}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>INSECTES AGRICOLES (10 classes · data.yaml)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {insectClasses.map((ins,i)=>(
              <div key={ins} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 10px', borderRadius:8, background:'rgba(255,255,255,.03)', border:`1px solid ${C.border}` }}>
                <div style={{ width:18, height:18, borderRadius:4, background:`hsl(${(i*36)%360},65%,45%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'white' }}>{i+1}</div>
                <span style={{ fontSize:10, color:C.muted }}>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>DENSITÉ MALADIES PAR CULTURE (HEATMAP-STYLE)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {cropGroups.map(crop=>(
            <div key={crop.name} style={{ borderRadius:12, padding:'12px', background:`${crop.color}12`, border:`1px solid ${crop.color}30` }}>
              <div style={{ fontSize:16, marginBottom:4 }}>{crop.name.split(' ')[0]}</div>
              <div style={{ fontSize:11, fontWeight:800, color:crop.color }}>{crop.name.replace(/^[^\s]+\s/,'')}</div>
              <div style={{ fontSize:20, fontWeight:900, color:'white', margin:'6px 0' }}>{crop.totalDiseases}</div>
              <div style={{ fontSize:9, color:C.muted }}>maladies détectables</div>
              <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:3 }}>
                {crop.diseases.slice(0,2).map(d=>(
                  <span key={d.name} style={{ fontSize:8, padding:'2px 5px', borderRadius:99, background:`${crop.color}20`, color:crop.color, fontWeight:600 }}>{d.name}</span>
                ))}
                {crop.diseases.length>2 && <span style={{ fontSize:8, color:C.muted }}>+{crop.diseases.length-2}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   11. ANIMAL MULTI-MODEL COVERAGE — espèce × capacités
══════════════════════════════════════════════════════════════════ */
function AnimalCoverageMatrix() {
  const ANIMALS = [
    { name:'Vache',   icon:'🐄', key:'cow',     color:'#7c3aed' },
    { name:'Chèvre',  icon:'🐐', key:'goat',    color:'#dc2626' },
    { name:'Mouton',  icon:'🐑', key:'sheep',   color:'#8b5cf6' },
    { name:'Poulet',  icon:'🐔', key:'poultry', color:'#d97706' },
    { name:'Lapin',   icon:'🐰', key:'rabbit',  color:'#db2777' },
    { name:'Abeille', icon:'🐝', key:'bee',     color:'#fbbf24' },
  ];
  const CAPABILITIES = [
    { name:'Détection', key:'detection', color:'#6366f1', icon:'👁️' },
    { name:'Maladie',   key:'disease',   color:'#ef4444', icon:'🦠' },
    { name:'Comportement', key:'behavior', color:'#0891b2', icon:'🧠' },
    { name:'OBB',       key:'obb',       color:'#fbbf24', icon:'🔲' },
  ];

  const matrix = useMemo(() => {
    return ANIMALS.map(animal => {
      const caps = {};
      CAPABILITIES.forEach(cap => {
        caps[cap.key] = MODEL_REGISTRY.filter(m =>
          m.task === cap.key && m.species.some(s => s === animal.key || (animal.key === 'poultry' && s === 'poultry') || (animal.key === 'cow' && m.key === 'cow_behavior' && cap.key === 'behavior'))
        );
      });
      return { ...animal, caps };
    });
  }, []);

  const coverageByAnimal = ANIMALS.map(animal => ({
    name: `${animal.icon} ${animal.name}`,
    detection: MODEL_REGISTRY.filter(m=>m.task==='detection'&&m.species.includes(animal.key)).length,
    disease:   MODEL_REGISTRY.filter(m=>m.task==='disease'  &&m.species.includes(animal.key)).length,
    behavior:  MODEL_REGISTRY.filter(m=>m.task==='behavior' &&m.species.includes(animal.key)).length,
    obb:       MODEL_REGISTRY.filter(m=>m.task==='obb'      &&m.species.includes(animal.key)).length,
    color: animal.color,
  }));

  const animalClassCount = ANIMALS.map(animal => {
    const allClasses = MODEL_REGISTRY.filter(m => m.species.includes(animal.key)).flatMap(m => m.classes);
    return { name: `${animal.icon} ${animal.name}`, classes: allClasses.length, color: animal.color };
  });

  return (
    <div style={cardS}>
      <SectionHdr icon={<Target size={18} color={C.amber}/>} title="Couverture Multi-Modèle par Espèce Animale" sub="Matrice espèce × capacité IA · data.yaml · 5 espèces · 3 types de détection" badge="ANIMAL AI"/>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>MODÈLES PAR ESPÈCE × CAPACITÉ</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={coverageByAnimal} margin={{left:-10,right:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="detection" fill='#6366f1' radius={[3,3,0,0]} name="Détection"    stackId="a"/>
              <Bar dataKey="disease"   fill='#ef4444' radius={[0,0,0,0]} name="Maladie"      stackId="a"/>
              <Bar dataKey="behavior"  fill='#0891b2' radius={[0,0,0,0]} name="Comportement" stackId="a"/>
              <Bar dataKey="obb"       fill='#fbbf24' radius={[3,3,0,0]} name="OBB"          stackId="a"/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>TOTAL CLASSES DÉTECTABLES PAR ESPÈCE</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={animalClassCount}>
              <PolarGrid stroke={C.border}/>
              <PolarAngleAxis dataKey="name" tick={{fill:C.muted,fontSize:9}}/>
              <PolarRadiusAxis tick={false} axisLine={false}/>
              <Radar dataKey="classes" stroke={C.amber} fill={C.amber} fillOpacity={0.35} name="Classes totales"/>
              <Tooltip {...TT}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Matrix grid */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:12 }}>MATRICE DÉTAILLÉE ESPÈCE × CAPACITÉ IA</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:4 }}>
            <thead>
              <tr>
                <th style={{ width:110, textAlign:'left', padding:'6px 10px', fontSize:10, color:C.muted, fontWeight:700 }}>Espèce</th>
                {CAPABILITIES.map(cap=>(
                  <th key={cap.key} style={{ textAlign:'center', padding:'6px 10px', fontSize:10, color:cap.color, fontWeight:800, background:`${cap.color}12`, borderRadius:8 }}>
                    {cap.icon} {cap.name}
                  </th>
                ))}
                <th style={{ textAlign:'center', padding:'6px 10px', fontSize:10, color:C.muted, fontWeight:700 }}>Score IA</th>
              </tr>
            </thead>
            <tbody>
              {ANIMALS.map(animal => {
                const detModels = MODEL_REGISTRY.filter(m=>m.task==='detection'&&m.species.includes(animal.key));
                const disModels = MODEL_REGISTRY.filter(m=>m.task==='disease'  &&m.species.includes(animal.key));
                const behModels = MODEL_REGISTRY.filter(m=>m.task==='behavior' &&m.species.includes(animal.key));
                const obbModels = MODEL_REGISTRY.filter(m=>m.task==='obb'      &&m.species.includes(animal.key));
                const score = detModels.length + disModels.length + behModels.length + obbModels.length;
                const maxScore = 4;
                return (
                  <tr key={animal.key}>
                    <td style={{ padding:'8px 10px', borderRadius:8, background:'rgba(255,255,255,.03)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:20 }}>{animal.icon}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:animal.color }}>{animal.name}</span>
                      </div>
                    </td>
                    {[detModels, disModels, behModels, obbModels].map((models, ci) => (
                      <td key={ci} style={{ textAlign:'center', padding:'8px 10px', background:'rgba(255,255,255,.02)', borderRadius:8 }}>
                        {models.length > 0 ? (
                          <div>
                            <CheckCircle size={14} color={CAPABILITIES[ci].color} style={{ display:'inline-block', marginBottom:3 }}/>
                            <div style={{ fontSize:9, color:C.muted }}>{models.map(m=>m.name.split(' ')[0]).join(', ')}</div>
                          </div>
                        ) : (
                          <div style={{ fontSize:10, color:'rgba(255,255,255,.15)' }}>—</div>
                        )}
                      </td>
                    ))}
                    <td style={{ textAlign:'center', padding:'8px 10px' }}>
                      <div style={{ display:'flex', justifyContent:'center', gap:3 }}>
                        {Array.from({length:maxScore}).map((_,i)=>(
                          <div key={i} style={{ width:8, height:8, borderRadius:'50%', background: i<score ? animal.color : 'rgba(255,255,255,.1)' }}/>
                        ))}
                      </div>
                      <div style={{ fontSize:9, color:C.muted, marginTop:3 }}>{score}/{maxScore}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bee OBB special card */}
      <div style={{ padding:'16px 20px', borderRadius:16, background:'linear-gradient(135deg,#fbbf2415,#0f172a)', border:'1px solid #fbbf2430', display:'flex', alignItems:'flex-start', gap:16 }}>
        <span style={{ fontSize:36 }}>🐝</span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, color:'#fbbf24', fontSize:13, marginBottom:4 }}>Bee Detection OBB — Architecture Spéciale</div>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>
            Modèle unique utilisant <strong style={{color:'#fbbf24'}}>YOLOv11-OBB</strong> (Oriented Bounding Box) — détecte la <em>rotation</em> des abeilles pour analyser les patterns de mouvement et la densité de la ruche. Entraîné sur <strong style={{color:'white'}}>120 époques</strong> · AdamW · 768×768px · 4 classes : <strong style={{color:'white'}}>bee · drone · pollenbee · queen</strong>.
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
            {[
              { l:'Classes', v:'4', c:'#fbbf24' },
              { l:'Architecture', v:'YOLOv11-OBB', c:'#f59e0b' },
              { l:'Epochs', v:'120', c:'#fbbf24' },
              { l:'ImgSz', v:'768×768', c:'#fbbf24' },
              { l:'Optimizer', v:'AdamW', c:'#fbbf24' },
            ].map(k=>(
              <div key={k.l} style={{ padding:'5px 12px', borderRadius:99, background:`${k.c}12`, border:`1px solid ${k.c}25`, fontSize:10, color:k.c, fontWeight:800 }}>
                {k.l}: {k.v}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deep learning model architecture area chart */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>ARCHITECTURE DEEP LEARNING — YOLOV11 PAR DOMAINE</div>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart
            data={[
              { domain:'Animaux (detect)',  models:MODEL_REGISTRY.filter(m=>m.domain==='animal'&&m.task==='detection').length, classes:MODEL_REGISTRY.filter(m=>m.domain==='animal'&&m.task==='detection').reduce((s,m)=>s+m.nc,0) },
              { domain:'Animaux (maladie)', models:MODEL_REGISTRY.filter(m=>m.domain==='animal'&&m.task==='disease').length,   classes:MODEL_REGISTRY.filter(m=>m.domain==='animal'&&m.task==='disease').reduce((s,m)=>s+m.nc,0) },
              { domain:'Comportement',      models:MODEL_REGISTRY.filter(m=>m.task==='behavior').length, classes:MODEL_REGISTRY.filter(m=>m.task==='behavior').reduce((s,m)=>s+m.nc,0) },
              { domain:'Phyto-IA',          models:MODEL_REGISTRY.filter(m=>m.domain==='plant').length,  classes:MODEL_REGISTRY.filter(m=>m.domain==='plant').reduce((s,m)=>s+m.nc,0) },
              { domain:'Sécurité',          models:MODEL_REGISTRY.filter(m=>m.domain==='security').length, classes:MODEL_REGISTRY.filter(m=>m.domain==='security').reduce((s,m)=>s+m.nc,0) },
            ]}
            margin={{left:-10,right:10,top:5}}
          >
            <defs>
              <linearGradient id="dlModels" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.accent} stopOpacity={0.4}/><stop offset="95%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
              <linearGradient id="dlClasses" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.cyan} stopOpacity={0.4}/><stop offset="95%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="domain" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip {...TT}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Area type="monotone" dataKey="models"  stroke={C.accent} fill="url(#dlModels)"  strokeWidth={2} name="Nb modèles"/>
            <Area type="monotone" dataKey="classes" stroke={C.cyan}   fill="url(#dlClasses)" strokeWidth={2} name="Nb classes"/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   12. TRAINING CONFIGURATION ANALYSIS — args.yaml data
══════════════════════════════════════════════════════════════════ */
function TrainingConfigAnalysis() {
  const data = MODEL_REGISTRY.map(m => {
    const t = TRAINING_CONFIG[m.key] || {};
    return {
      name:    `${m.icon} ${m.name.split(' ').slice(0,2).join(' ')}`,
      epochs:  t.epochs  || 0,
      imgsz:   t.imgsz   || 0,
      patience:t.patience|| 0,
      batch:   t.batch   || 8,
      color:   m.color,
      key:     m.key,
      nc:      m.nc,
      model_base: t.model_base || 'yolo11n',
    };
  });

  const scatterData = MODEL_REGISTRY.map(m => {
    const t = TRAINING_CONFIG[m.key] || {};
    return { name: m.name, nc: m.nc, epochs: t.epochs||0, color: m.color, imgsz: t.imgsz||768 };
  });

  const archGroups = MODEL_REGISTRY.reduce((g, m) => {
    const base = TRAINING_CONFIG[m.key]?.model_base || 'yolo11n';
    g[base] = (g[base]||0)+1;
    return g;
  }, {});

  return (
    <div style={cardS}>
      <SectionHdr
        icon={<TrendingUp size={18} color={C.amber}/>}
        title="Configuration Entraînement · args.yaml — 14 Modèles"
        sub="Epochs · Image size · Patience · Architecture de base · Données réelles args.yaml"
        badge="TRAINING"
      />

      {/* Summary chips */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10 }}>
        {[
          { l:'Total époques',  v: MODEL_REGISTRY.reduce((s,m)=>s+(TRAINING_CONFIG[m.key]?.epochs||0),0), c:C.accent },
          { l:'ImgSz dominant',v:'768×768',  c:C.cyan  },
          { l:'Batch size',    v:'8 (tous)', c:C.green  },
          { l:'Optimizer',     v:'AdamW',    c:C.amber  },
          { l:'LR initiale',   v:'0.001',    c:'#a78bfa'},
          { l:'LR finale',     v:'0.01×LR0', c:'#67e8f9'},
        ].map(k=>(
          <div key={k.l} style={{ background:'rgba(255,255,255,.03)', borderRadius:12, padding:'10px 14px', border:`1px solid ${C.border}`, textAlign:'center' }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:.8 }}>{k.l}</div>
            <div style={{ fontSize:16, fontWeight:900, color:k.c, marginTop:5 }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:14 }}>
        {/* Epochs per model */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>ÉPOQUES D'ENTRAÎNEMENT PAR MODÈLE (args.yaml)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{left:-10,right:10,bottom:50}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} angle={-40} textAnchor="end" interval={0}/>
              <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false} domain={[0,140]}/>
              <Tooltip {...TT} formatter={v=>[`${v} epochs`,'Epochs']}/>
              <ReferenceLine y={120} stroke={C.green}  strokeDasharray="4 2" label={{value:'120 (standard)',fill:C.green,fontSize:9,position:'right'}}/>
              <ReferenceLine y={50}  stroke={C.amber}  strokeDasharray="4 2" label={{value:'50 (livestock)',fill:C.amber,fontSize:9,position:'right'}}/>
              <ReferenceLine y={100} stroke={C.cyan}   strokeDasharray="4 2" label={{value:'100 (insects)',fill:C.cyan,fontSize:9,position:'right'}}/>
              <Bar dataKey="epochs" radius={[6,6,0,0]} name="Epochs">
                {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Architecture pie + patience */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>ARCHITECTURE BASE</div>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={Object.entries(archGroups).map(([arch,count])=>({ name:arch, value:count }))}
                  cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value"
                >
                  <Cell fill={C.accent}/>
                  <Cell fill={C.amber}/>
                </Pie>
                <Tooltip {...TT}/>
                <Legend wrapperStyle={{fontSize:10}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:6 }}>PATIENCE EarlyStopping</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {[{l:'patience=25',  count:MODEL_REGISTRY.filter(m=>(TRAINING_CONFIG[m.key]?.patience||0)===25).length,  c:C.green },
                {l:'patience=100', count:MODEL_REGISTRY.filter(m=>(TRAINING_CONFIG[m.key]?.patience||0)===100).length, c:C.amber },
              ].map(k=>(
                <div key={k.l} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,.03)', border:`1px solid ${C.border}` }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:k.c }}/>
                  <span style={{ fontSize:11, color:C.muted, flex:1 }}>{k.l}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:k.c }}>{k.count} modèles</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Epochs × nc scatter */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>COMPLEXITÉ vs EPOCHS (nc × epochs)</div>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{left:0,right:20,top:10,bottom:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="epochs" name="Epochs" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} label={{value:'Epochs',position:'insideBottom',offset:-4,fill:C.muted,fontSize:9}}/>
              <YAxis dataKey="nc" name="Classes" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} label={{value:'Classes',angle:-90,position:'insideLeft',fill:C.muted,fontSize:9}}/>
              <Tooltip {...TT} content={({active,payload})=>{
                if(!active||!payload?.length) return null;
                const d=payload[0].payload;
                return <div style={TT.contentStyle}><b style={{color:d.color}}>{d.name}</b><br/>{d.nc} classes · {d.epochs} epochs · {d.imgsz}px</div>;
              }}/>
              <Scatter
                data={scatterData}
                shape={({cx,cy,payload})=>(
                  <circle cx={cx} cy={cy} r={Math.sqrt(payload.nc)*2.2+3} fill={payload.color} fillOpacity={0.8} stroke="rgba(255,255,255,.3)" strokeWidth={1}/>
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>IMAGE SIZE PAR MODÈLE</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{left:-10,right:10,bottom:50}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} angle={-40} textAnchor="end" interval={0}/>
              <YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} domain={[600,800]}/>
              <Tooltip {...TT} formatter={v=>[`${v}×${v}px`,'ImgSz']}/>
              <ReferenceLine y={768} stroke={C.green} strokeDasharray="4 2" label={{value:'768px',fill:C.green,fontSize:9}}/>
              <ReferenceLine y={640} stroke={C.amber} strokeDasharray="4 2" label={{value:'640px',fill:C.amber,fontSize:9}}/>
              <Bar dataKey="imgsz" radius={[4,4,0,0]} name="Image size (px)">
                {data.map((d,i)=><Cell key={i} fill={d.imgsz===768?C.accent:C.amber}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full model config table */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:10 }}>TABLEAU COMPLET CONFIGURATION — 14 MODÈLES (args.yaml)</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:'0 4px', fontSize:11 }}>
            <thead>
              <tr style={{ color:C.muted, fontSize:10, fontWeight:700 }}>
                {['Modèle','Base','Epochs','ImgSz','Patience','Batch','LR0','Optimizer'].map(h=>(
                  <th key={h} style={{ padding:'6px 10px', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODEL_REGISTRY.map(m => {
                const t = TRAINING_CONFIG[m.key]||{};
                const isSpecial = t.epochs!==120||t.imgsz!==768||t.patience!==25;
                return (
                  <tr key={m.key} style={{ background: isSpecial?`${m.color}10`:'rgba(255,255,255,.02)' }}>
                    <td style={{ padding:'7px 10px', borderRadius:'8px 0 0 8px', fontWeight:700, color:m.color, whiteSpace:'nowrap' }}>{m.icon} {m.name}</td>
                    <td style={{ padding:'7px 10px', fontFamily:'monospace', fontSize:10, color:t.model_base==='yolo26n-obb'?C.amber:C.muted }}>{t.model_base||'yolo11n'}</td>
                    <td style={{ padding:'7px 10px', fontWeight:isSpecial&&t.epochs!==120?800:400, color:isSpecial&&t.epochs!==120?C.amber:C.text }}>{t.epochs}</td>
                    <td style={{ padding:'7px 10px', color:t.imgsz===640?C.amber:C.text }}>{t.imgsz}px</td>
                    <td style={{ padding:'7px 10px', color:t.patience===100?C.amber:C.muted }}>{t.patience}</td>
                    <td style={{ padding:'7px 10px', color:C.muted }}>{t.batch}</td>
                    <td style={{ padding:'7px 10px', fontFamily:'monospace', fontSize:10, color:C.muted }}>{t.lr0}</td>
                    <td style={{ padding:'7px 10px', borderRadius:'0 8px 8px 0', color:C.cyan, fontWeight:700 }}>AdamW</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   13. AUGMENTATION STRATEGY MATRIX — args.yaml augmentation params
══════════════════════════════════════════════════════════════════ */
function AugmentationMatrix() {
  const AUG_FIELDS = [
    { key:'mosaic',      label:'Mosaic',      desc:'4-image composite',        max:1   },
    { key:'mixup',       label:'MixUp',       desc:'Image blending',           max:0.2 },
    { key:'copy_paste',  label:'Copy-Paste',  desc:'Segment copy-paste',       max:0.1 },
    { key:'degrees',     label:'Rotation',    desc:'Max rotation degrees',     max:10  },
    { key:'flipud',      label:'Flip Vert.',  desc:'Vertical flip prob',       max:0.1 },
    { key:'erasing',     label:'Erasing',     desc:'Random erasing',           max:0.4 },
    { key:'shear',       label:'Shear',       desc:'Shear transform',          max:2   },
  ];

  const intensity = (val, max) => max > 0 ? Math.min(1, val / max) : 0;
  const cellColor = (val, max, baseColor) => {
    const i = intensity(val, max);
    if (i === 0) return 'rgba(255,255,255,.04)';
    return `${baseColor}${Math.round(i * 0.8 * 255).toString(16).padStart(2,'0')}`;
  };

  const augSummary = MODEL_REGISTRY.map(m => {
    const t = TRAINING_CONFIG[m.key] || {};
    const score = (t.mixup>0?1:0)+(t.copy_paste>0?1:0)+(t.degrees>0?1:0)+(t.flipud>0?1:0)+(t.shear>0?1:0);
    return { name:`${m.icon}${m.name.split(' ')[0]}`, score, color:m.color };
  });

  const radarData = [
    { aug:'Mosaic',     ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:(TRAINING_CONFIG[m.key]?.mosaic||0)*100}),{}) },
    { aug:'MixUp',      ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:(TRAINING_CONFIG[m.key]?.mixup||0)*500}),{}) },
    { aug:'Copy-Paste', ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:(TRAINING_CONFIG[m.key]?.copy_paste||0)*1000}),{}) },
    { aug:'Rotation',   ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:TRAINING_CONFIG[m.key]?.degrees||0}),{}) },
    { aug:'Flip Vert',  ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:(TRAINING_CONFIG[m.key]?.flipud||0)*1000}),{}) },
    { aug:'Erasing',    ...MODEL_REGISTRY.reduce((o,m)=>({...o,[m.key]:(TRAINING_CONFIG[m.key]?.erasing||0)*100}),{}) },
  ];

  const augGroupBar = [
    { group:'Geo. lourd',  models:['cow_behavior','goat_disease','chicken_disease','chicken_detect','rabbit','plantdoc'], augs:4 },
    { group:'Insects',     models:['insects'],   augs:3 },
    { group:'Aucune augm.',models:['fire','leaves','lemon','olive','orange','bee','livestock'], augs:0 },
  ];

  return (
    <div style={cardS}>
      <SectionHdr
        icon={<GitBranch size={18} color={C.cyan}/>}
        title="Stratégie d'Augmentation · Deep Learning — args.yaml"
        sub="Analyse complète des techniques d'augmentation par modèle · Mosaic · MixUp · Copy-Paste · Rotation"
        badge="AUGMENTATION"
      />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>SCORE AUGMENTATION PAR MODÈLE (nb techniques actives)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={augSummary} layout="vertical" margin={{left:10,right:30}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/>
              <XAxis type="number" domain={[0,5]} tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false} width={90}/>
              <Tooltip {...TT} formatter={v=>[`${v}/5 techniques`,'Score augm.']}/>
              <Bar dataKey="score" radius={[0,8,8,0]} name="Techniques actives">
                {augSummary.map((d,i)=><Cell key={i} fill={d.score>=4?C.green:d.score>=2?C.amber:d.score>0?C.cyan:C.muted}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:8 }}>GROUPES D'AUGMENTATION</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { label:'🔴 Augmentation intensive', models:['cow_behavior','goat_disease','chicken_disease','chicken_detect','rabbit','plantdoc'], color:C.red, desc:'Mixup+CopyPaste+Rotation+FlipUD' },
              { label:'🟡 Augmentation modérée',  models:['insects'], color:C.amber, desc:'Rotation+Mixup+Shear (insects spécifique)' },
              { label:'⚫ Sans augmentation géo.', models:['fire','leaves','lemon','olive','orange','bee','livestock'], color:C.muted, desc:'Mosaic+Erasing uniquement' },
            ].map(g=>(
              <div key={g.label} style={{ padding:'10px 14px', borderRadius:12, background:`${g.color}08`, border:`1px solid ${g.color}20` }}>
                <div style={{ fontSize:11, fontWeight:800, color:g.color, marginBottom:4 }}>{g.label}</div>
                <div style={{ fontSize:9, color:C.muted, marginBottom:6 }}>{g.desc}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                  {g.models.map(k=>{
                    const m=MODEL_REGISTRY.find(x=>x.key===k);
                    return m ? <span key={k} style={{ fontSize:9, padding:'2px 7px', borderRadius:99, background:`${m.color}15`, color:m.color, fontWeight:700 }}>{m.icon}{m.name.split(' ')[0]}</span> : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full heatmap matrix */}
      <div>
        <div style={{ fontSize:11, fontWeight:700, color:C.muted, marginBottom:12 }}>MATRICE D'AUGMENTATION — INTENSITÉ PAR MODÈLE ET TECHNIQUE</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:3, fontSize:10 }}>
            <thead>
              <tr>
                <th style={{ textAlign:'left', padding:'4px 10px', color:C.muted, fontSize:9, fontWeight:700, minWidth:120 }}>Modèle</th>
                {AUG_FIELDS.map(f=>(
                  <th key={f.key} style={{ textAlign:'center', padding:'4px 8px', color:C.muted, fontSize:9, fontWeight:700, whiteSpace:'nowrap' }} title={f.desc}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODEL_REGISTRY.map(m=>{
                const t = TRAINING_CONFIG[m.key]||{};
                return (
                  <tr key={m.key}>
                    <td style={{ padding:'5px 10px', borderRadius:8, fontWeight:700, fontSize:10, color:m.color, whiteSpace:'nowrap' }}>{m.icon} {m.name.split(' ').slice(0,2).join(' ')}</td>
                    {AUG_FIELDS.map(f=>{
                      const val = t[f.key]||0;
                      const pct = intensity(val, f.max);
                      const bg  = pct===0 ? 'rgba(255,255,255,.04)' : `${m.color}${Math.round(pct*200+30).toString(16).padStart(2,'0')}`;
                      return (
                        <td key={f.key} style={{ textAlign:'center', padding:'5px 8px', borderRadius:6, background:bg, color:pct>0.5?'white':pct>0?m.color:C.muted, fontWeight:pct>0?800:400, fontSize:10 }} title={`${f.label}: ${val}`}>
                          {val===0 ? '—' : val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10 }}>
          <span style={{ fontSize:10, color:C.muted }}>Intensité :</span>
          {['Nulle','Faible','Moyenne','Forte'].map((l,i)=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:16, height:16, borderRadius:4, background:`rgba(99,102,241,${i*0.3})`, border:`1px solid ${C.border}` }}/>
              <span style={{ fontSize:9, color:C.muted }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key insights */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10 }}>
        {[
          { icon:'🔄', title:'Mosaic universelle', desc:'Les 14 modèles utilisent Mosaic=1.0 — standard YOLOv11', color:C.green },
          { icon:'🎲', title:'MixUp sélectif', desc:'6/14 modèles (animaux + plantdoc) utilisent MixUp pour la robustesse', color:C.cyan },
          { icon:'🐝', title:'Bee — aucune géo.', desc:'OBB requiert des boîtes orientées stables — pas de rotation artificielle', color:C.amber },
          { icon:'🐛', title:'Insects — shear=2°', desc:'Seul modèle avec shear transform — insectes en poses variées', color:'#059669' },
        ].map(k=>(
          <div key={k.title} style={{ padding:'12px 14px', borderRadius:12, background:`${k.color}08`, border:`1px solid ${k.color}20` }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:11, fontWeight:800, color:k.color }}>{k.title}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:4, lineHeight:1.5 }}>{k.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function CVModelsDashboard({ farmId }) {
  const [events,     setEvents]     = useState([]);
  const [drift,      setDrift]      = useState(null);
  const [health,     setHealth]     = useState(null);
  const [plantStats, setPlantStats] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const params = farmId ? `?farm_id=${farmId}` : '';
    Promise.allSettled([
      api.get(`/cv/events${params}&limit=200`),
      api.get('/cv/stats/drift?days=7'),
      api.get('/cv/models/health'),
      api.get('/cv/stats/plants'),
    ]).then(([evR, drR, hlR, plR]) => {
      if (evR.status === 'fulfilled') setEvents(Array.isArray(evR.value?.data) ? evR.value.data : []);
      if (drR.status === 'fulfilled') setDrift(drR.value?.data);
      if (hlR.status === 'fulfilled') setHealth(hlR.value?.data);
      if (plR.status === 'fulfilled') setPlantStats(plR.value?.data);
    }).finally(() => setLoading(false));
  }, [farmId]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, padding:'4px 0' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'20px 24px', background:`linear-gradient(135deg, #0f172a, #1e293b)`, borderRadius:24, border:`1px solid ${C.border}` }}>
        <div style={{ width:52, height:52, borderRadius:16, background:`${C.accent}20`, border:`1px solid ${C.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Brain size={28} color={C.accent}/>
        </div>
        <div>
          <h2 style={{ color:C.text, fontWeight:900, fontSize:20, margin:0, letterSpacing:-.3 }}>
            ML / Deep Learning / Computer Vision Dashboard
          </h2>
          <p style={{ color:C.muted, fontSize:12, margin:'4px 0 0' }}>
            {MODEL_REGISTRY.length} modèles YOLOv11 · {TOTAL_CLASSES} classes · data.yaml · APIs temps réel · MLOps monitoring
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { l:`${MODEL_REGISTRY.length} modèles`, c:C.accent },
            { l:`${TOTAL_CLASSES} classes`,          c:C.cyan   },
            { l:`${events.length} events`,           c:C.green  },
          ].map(b=>(
            <div key={b.l} style={{ padding:'6px 14px', borderRadius:99, background:`${b.c}12`, border:`1px solid ${b.c}25`, fontSize:11, fontWeight:800, color:b.c }}>
              {b.l}
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
          <div style={{ width:36, height:36, border:`2px solid ${C.border}`, borderTopColor:C.accent, borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 14px' }}/>
          <div style={{ fontSize:13 }}>Chargement données ML/CV…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && (
        <>
          {/* Row 1: Registry + Health */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <ModelRegistryGrid />
            <ModelHealthStatus healthData={health}/>
          </div>

          {/* Row 2: Live detections full width */}
          <LiveDetectionsChart events={events}/>

          {/* Row 3: Drift + Behavior */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <MLOpsDriftMonitor driftData={drift}/>
            <BehaviorAnalysisChart events={events}/>
          </div>

          {/* Row 4: Disease + Plants */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <DiseasePrevalenceChart events={events}/>
            <PlantCVIntelligence plantStats={plantStats}/>
          </div>

          {/* Row 5: NEW — Class Taxonomy Treemap (full width) */}
          <ClassTaxonomyTreemap />

          {/* Row 6: NEW — Dataset Registry + Crop Disease Intelligence */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <DatasetRegistryPanel />
            <CropDiseaseIntelligence />
          </div>

          {/* Row 7: NEW — Animal Coverage Matrix (full width) */}
          <AnimalCoverageMatrix />

          {/* Row 8: Training Configuration Analysis */}
          <TrainingConfigAnalysis />

          {/* Row 9: Augmentation Strategy Matrix */}
          <AugmentationMatrix />
        </>
      )}
    </div>
  );
}
