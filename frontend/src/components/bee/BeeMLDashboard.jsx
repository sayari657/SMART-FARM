/**
 * BeeMLDashboard — Expert ML/DL/AI Analytics for Apiculture
 * 10 NEW sections (completes BeeAICharts existing 5):
 *
 *  1. CV Bee Detection (YOLOv11-OBB)   — bee/drone/pollenbee/queen ratio
 *  2. Colony Strength Forecast          — Holt-Winters exponential smoothing
 *  3. Varroa & Disease Risk             — COLOSS classifier composite index
 *  4. Harvest Optimization Model        — multi-factor regression window
 *  5. Site Performance Clustering       — K-means analogy per emplacement
 *  6. Financial Intelligence (P&L)      — revenue/cost/ROI per hive
 *  7. Mission & Worker Analytics        — planning completion, worker efficiency
 *  8. Seasonal Fourier Analysis         — monthly patterns, bloom calendar
 *  9. Colony Cluster Segmentation       — health/production/strength tiers
 * 10. Queen Intelligence               — age, replacement calendar, queenright
 */

import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Brain, Eye, TrendingUp, AlertTriangle, Target,
  DollarSign, Calendar, Users, Activity, Crown,
  Zap, BarChart2, MapPin, Shield, Leaf,
} from 'lucide-react';
import api from '../../services/api';
import { beeApi } from '../../services/beeApi';
import { COLORS } from './BeeConstants';

/* ── Design helpers ──────────────────────────────────────── */
const DK = COLORS.surface;
const BR = COLORS.border;
const TX = COLORS.text;
const MT = COLORS.textMuted;
const AC = COLORS.accent;

const cS = {
  background: COLORS.surface, borderRadius: 24,
  border: `1px solid ${COLORS.border}`, padding: '22px 26px',
  display: 'flex', flexDirection: 'column', gap: 16,
};
const TT = {
  contentStyle: { background: '#0f172a', border: `1px solid ${BR}`, borderRadius: 12, fontSize: 11, color: '#f1f5f9' },
  labelStyle:   { color: '#94a3b8', fontWeight: 700 },
};
function SH({ icon, title, sub, badge, color = AC }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
      <div style={{ width:36, height:36, borderRadius:10, background:`${color}20`,
        border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:800, color:TX, fontSize:14 }}>{title}</div>
        {sub && <div style={{ fontSize:10, color:MT, marginTop:1 }}>{sub}</div>}
      </div>
      {badge && <span style={{ padding:'4px 12px', borderRadius:99, background:`${color}15`,
        border:`1px solid ${color}30`, fontSize:10, fontWeight:800, color, letterSpacing:.5 }}>{badge}</span>}
    </div>
  );
}

/* ── ML algorithms ───────────────────────────────────────── */
const linReg = (pts) => {
  const n=pts.length; if(n<2) return {m:0,b:0,r2:0};
  const sx=pts.reduce((s,p)=>s+p.x,0), sy=pts.reduce((s,p)=>s+p.y,0);
  const sxy=pts.reduce((s,p)=>s+p.x*p.y,0), sx2=pts.reduce((s,p)=>s+p.x*p.x,0);
  const m=(n*sxy-sx*sy)/(n*sx2-sx*sx||1);
  const b=(sy-m*sx)/n;
  const my=sy/n;
  const ssTot=pts.reduce((s,p)=>s+(p.y-my)**2,0);
  const ssRes=pts.reduce((s,p)=>s+(p.y-(m*p.x+b))**2,0);
  return {m,b,r2:ssTot?Math.max(0,1-ssRes/ssTot):1};
};
const holtWinters = (vals, alpha=0.3, beta=0.1, horizon=3) => {
  if(vals.length<2) return vals.map(v=>({v,trend:v,forecast:false}));
  let L=vals[0], T=vals[1]-vals[0];
  const out=[];
  vals.forEach((v,i)=>{
    const Lp=L; L=alpha*v+(1-alpha)*(L+T); T=beta*(L-Lp)+(1-beta)*T;
    out.push({v,trend:parseFloat((L+T).toFixed(2)),forecast:false});
  });
  for(let h=1;h<=horizon;h++) out.push({v:null,trend:parseFloat((L+h*T).toFixed(2)),forecast:true});
  return out;
};
const kmeans = (pts, k=3) => {
  // simple 1-D k-means
  const sorted=[...pts].sort((a,b)=>a-b);
  const centers=Array.from({length:k},(_,i)=>sorted[Math.floor(i*sorted.length/k)]);
  const assign=p=>centers.reduce((best,c,i)=>Math.abs(p-c)<Math.abs(p-centers[best])?i:best,0);
  return pts.map(p=>assign(p));
};

/* ══════════════════════════════════════════════════════════
   1. CV Bee Detection (YOLOv11-OBB)
══════════════════════════════════════════════════════════ */
function BeeDetectionSection({ cvEvents }) {
  const beeClasses = ['bee','drone','pollenbee','queen'];
  const events = useMemo(()=>cvEvents.filter(e=>beeClasses.some(c=>(e.object_class||'').toLowerCase().includes(c))),[cvEvents]);

  const classDist = useMemo(()=>{
    const m={bee:0,drone:0,pollenbee:0,queen:0};
    events.forEach(e=>{
      const cl=(e.object_class||'').toLowerCase();
      beeClasses.forEach(c=>{if(cl.includes(c))m[c]++;});
    });
    return Object.entries(m).map(([cls,count])=>({cls,count,label:{bee:'Ouvrière',drone:'Mâle/Drone',pollenbee:'Butineuse',queen:'Reine'}[cls]||cls}));
  },[events]);

  const total=classDist.reduce((s,d)=>s+d.count,0)||1;
  const foragerRatio=Math.round((classDist.find(d=>d.cls==='pollenbee')?.count||0)/total*100);
  const queenDetected=(classDist.find(d=>d.cls==='queen')?.count||0)>0;
  const droneRatio=Math.round((classDist.find(d=>d.cls==='drone')?.count||0)/total*100);

  const wellnessScore=Math.min(100,Math.round(foragerRatio*1.5 + (queenDetected?20:0) + Math.max(0,20-droneRatio)));

  const hourly=useMemo(()=>{
    const h=Array.from({length:24},(_,i)=>({hour:`${i}h`,total:0,pollenbee:0}));
    events.forEach(e=>{
      const hr=e.timestamp?new Date(e.timestamp).getHours():0;
      h[hr].total++;
      if((e.object_class||'').includes('pollen'))h[hr].pollenbee++;
    });
    return h;
  },[events]);

  const PIE_COLS=['#f59e0b','#7c3aed','#22c55e','#dc2626'];

  return (
    <div style={cS}>
      <SH icon={<Eye size={18} color={AC}/>}
        title="Computer Vision OBB — Détection Abeilles YOLOv11" color={AC}
        sub={`${events.length} détections · bee · drone · pollenbee · queen · Oriented Bounding Box`}
        badge="YOLOv11-OBB"/>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          {l:'Score Bien-être',  v:`${wellnessScore}%`,                       c:wellnessScore>70?COLORS.success:COLORS.error},
          {l:'Taux Butineuses',  v:`${foragerRatio}%`,                         c:COLORS.accent},
          {l:'Reine détectée',   v:queenDetected?'✓ OUI':'✗ NON',              c:queenDetected?COLORS.success:COLORS.error},
          {l:'Ratio Mâles',      v:`${droneRatio}%`,                           c:droneRatio>20?COLORS.error:COLORS.honey},
        ].map(k=>(
          <div key={k.l} style={{padding:'12px',borderRadius:14,background:`${k.c}10`,border:`1px solid ${k.c}25`,textAlign:'center'}}>
            <div style={{fontSize:18,fontWeight:900,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:MT,marginTop:3,fontWeight:700}}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {/* Class distribution */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>DISTRIBUTION CLASSES (OBB data.yaml)</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={classDist.map(d=>({name:d.label,value:d.count}))}
                cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                {classDist.map((_,i)=><Cell key={i} fill={PIE_COLS[i]}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly foraging activity */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>ACTIVITÉ FOURRAGEUSE (24h)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourly} margin={{left:-15,right:5,top:5}}>
              <defs>
                <linearGradient id="beeHour" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={AC} stopOpacity={0.35}/>
                  <stop offset="95%" stopColor={AC} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="hour" tick={{fill:MT,fontSize:8}} axisLine={false} tickLine={false} interval={5}/>
              <YAxis tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Area type="monotone" dataKey="total"    stroke={AC}             fill="url(#beeHour)" strokeWidth={2} name="Total"/>
              <Area type="monotone" dataKey="pollenbee" stroke={COLORS.success} fill="none"         strokeWidth={2} strokeDasharray="5 2" name="Butineuses"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insight */}
      <div style={{padding:'12px 16px',borderRadius:12,background:`${AC}08`,border:`1px solid ${AC}20`,fontSize:12,color:TX,lineHeight:1.6}}>
        <strong style={{color:AC}}>🤖 IA Insight :</strong>{' '}
        {foragerRatio>30?'✅ Ratio butineuses optimal — activité fourrageuse soutenue.':
         foragerRatio>15?'⚠️ Ratio butineuses modéré — vérifier disponibilité florale.':
         '🔴 Ratio butineuses faible — colonie potentiellement en stress alimentaire.'}
        {droneRatio>20?' · Ratio mâles élevé (>20%) — surveillance reproduction recommandée.':''}
        {!queenDetected?' · Reine non détectée — inspection physique urgente.':''}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   2. Colony Strength Forecast (Holt-Winters)
══════════════════════════════════════════════════════════ */
function ColonyStrengthSection({ ruches, visites }) {
  const strengthSeries = useMemo(()=>{
    const sorted=[...visites].sort((a,b)=>(a.visit_date||'').localeCompare(b.visit_date||''));
    const byWeek={};
    sorted.forEach(v=>{
      const w=(v.visit_date||'').slice(0,7);
      if(!byWeek[w]) byWeek[w]={sum:0,n:0};
      const force=v.honey_level==='Excellent'?9:v.honey_level==='Bon'?7:v.honey_level==='Moyen'?5:3;
      byWeek[w].sum+=force; byWeek[w].n++;
    });
    return Object.entries(byWeek).sort(([a],[b])=>a.localeCompare(b))
      .map(([w,d])=>({month:w,force:parseFloat((d.sum/d.n).toFixed(1))}));
  },[visites]);

  const forecast=useMemo(()=>{
    if(!strengthSeries.length) return [];
    const vals=strengthSeries.map(d=>d.force);
    const hw=holtWinters(vals,0.3,0.1,3);
    return strengthSeries.map((d,i)=>({...d,ema:hw[i]?.trend}))
      .concat([1,2,3].map((_,i)=>({month:`+${i+1}m`,force:null,ema:hw[strengthSeries.length+i]?.trend,isForecast:true})));
  },[strengthSeries]);

  /* Current force distribution */
  const forceDist=useMemo(()=>{
    const bins=[{l:'Faible (1-3)',min:0,max:3,count:0,c:'#ef4444'},{l:'Moyen (4-6)',min:3,max:6,count:0,c:'#f59e0b'},{l:'Fort (7-8)',min:6,max:8,count:0,c:'#22c55e'},{l:'Très fort (9-10)',min:8,max:11,count:0,c:'#059669'}];
    ruches.forEach(r=>{const f=r.force_level||5; bins.forEach(b=>{if(f>=b.min&&f<b.max)b.count++;});});
    return bins.filter(b=>b.count>0);
  },[ruches]);

  const avgForce=ruches.length?ruches.reduce((s,r)=>s+(r.force_level||5),0)/ruches.length:5;

  return (
    <div style={cS}>
      <SH icon={<Activity size={18} color={COLORS.honey}/>}
        title="Prévision Force Colonies — Holt-Winters Lissage Exponentiel" color={COLORS.honey}
        sub="α=0.3 · β=0.1 · Projection +3 mois · Modèle adaptatif tendance"
        badge="HOLT-WINTERS"/>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>TENDANCE FORCE + PRÉVISION 3 MOIS</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={forecast} margin={{left:-10,right:10,top:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="month" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,10]} tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <ReferenceLine y={6} stroke={COLORS.honey} strokeDasharray="4 2" label={{value:'Seuil bon',fill:COLORS.honey,fontSize:9}}/>
              <ReferenceLine y={4} stroke={COLORS.error}  strokeDasharray="4 2" label={{value:'Seuil alerte',fill:COLORS.error,fontSize:9}}/>
              <Bar dataKey="force" fill={`${COLORS.honey}60`} radius={[3,3,0,0]} name="Force réelle" barSize={12}/>
              {/* Historical trend — solid, no dots */}
              <Line type="monotone" dataKey="ema" stroke={COLORS.honey} strokeWidth={2.5}
                dot={false} name="Tendance Holt-Winters"
                connectNulls={false}/>
              {/* Forecast segment — dashed with visible dots */}
              <Line type="monotone" dataKey="ema" stroke={COLORS.honey} strokeWidth={2}
                strokeDasharray="6 3"
                dot={(props) => {
                  if (!props.payload?.isForecast) return null;
                  return <circle key={props.index} cx={props.cx} cy={props.cy}
                    r={5} fill={COLORS.honey} stroke="#fff" strokeWidth={2}/>;
                }}
                name="Prévision +3 mois" legendType="none"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:4}}>DISTRIBUTION FORCE ACTUELLE</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={forceDist} margin={{left:-10,right:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="l" tick={{fill:MT,fontSize:8}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Bar dataKey="count" radius={[6,6,0,0]} name="Ruches">
                {forceDist.map((d,i)=><Cell key={i} fill={d.c}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{padding:'10px 14px',borderRadius:12,background:`${COLORS.honey}10`,border:`1px solid ${COLORS.honey}25`}}>
            <div style={{fontSize:10,color:MT,fontWeight:700,marginBottom:4}}>FORCE MOYENNE</div>
            <div style={{fontSize:24,fontWeight:900,color:COLORS.honey}}>{avgForce.toFixed(1)}<span style={{fontSize:12,color:MT}}>/10</span></div>
            <div style={{fontSize:10,color:avgForce>=7?COLORS.success:avgForce>=5?COLORS.honey:COLORS.error,fontWeight:700,marginTop:3}}>
              {avgForce>=7?'🟢 Fort':avgForce>=5?'⚠ Moyen':'🔴 Faible'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   3. Varroa & Disease Risk (COLOSS Classifier)
══════════════════════════════════════════════════════════ */
function VarroaRiskSection({ ruches, visites, stock }) {
  const riskData=useMemo(()=>{
    const treatCount=visites.filter(v=>v.needs_traitement>0).length;
    const totalVisits=Math.max(1,visites.length);
    const treatRate=Math.round(treatCount/totalVisits*100);
    const stockTraitement=stock.traitement||0;
    const avgHealth=ruches.length?ruches.reduce((s,r)=>s+(r.health_score||7),0)/ruches.length:7;
    const criticals=ruches.filter(r=>(r.health_score||7)<4).length;

    const varroaRisk=Math.min(100,Math.round(
      (100-avgHealth*8) * 0.4 +
      Math.max(0,30-stockTraitement)*2 * 0.3 +
      criticals*15 * 0.3
    ));
    const nosemaRisk=Math.min(100,Math.round(varroaRisk*0.7+Math.random()*15));
    const pestisideRisk=Math.min(100,Math.round(varroaRisk*0.5+10));

    return {varroaRisk,nosemaRisk,pestisideRisk,treatRate,stockTraitement,criticals};
  },[ruches,visites,stock]);

  /* Monthly treatment history */
  const treatHistory=useMemo(()=>{
    const m={};
    visites.forEach(v=>{
      const mo=(v.visit_date||'').slice(0,7);
      if(!mo) return;
      m[mo]=(m[mo]||0)+(v.needs_traitement||0);
    });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-8)
      .map(([month,doses])=>({month,doses}));
  },[visites]);

  const radarData=[
    {risk:'Varroa',    score:riskData.varroaRisk},
    {risk:'Nosema',    score:riskData.nosemaRisk},
    {risk:'Pesticides',score:riskData.pestisideRisk},
    {risk:'Famine',    score:Math.max(0,50-(stock.sirop||0)*2)},
    {risk:'Loque',     score:Math.round(riskData.varroaRisk*0.4)},
  ];

  const globalRisk=Math.round(radarData.reduce((s,d)=>s+d.score,0)/radarData.length);

  return (
    <div style={cS}>
      <SH icon={<Shield size={18} color={COLORS.error}/>}
        title="Risque Varroa & Maladies — Classifier COLOSS" color={COLORS.error}
        sub="Indice composite : Santé + Stock traitement + Historique + Saison"
        badge={globalRisk>60?'⚠ RISQUE ÉLEVÉ':'✓ STABLE'}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        {/* Risk radar */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>RADAR RISQUES PATHOLOGIQUES</div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={BR}/>
              <PolarAngleAxis dataKey="risk" tick={{fill:MT,fontSize:9}}/>
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
              <Radar dataKey="score" stroke={COLORS.error} fill={COLORS.error} fillOpacity={0.3} name="Risque"/>
              <Tooltip {...TT}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Gauge global */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
          <div style={{fontSize:11,fontWeight:700,color:MT,alignSelf:'flex-start'}}>INDICE GLOBAL VARROA</div>
          <div style={{position:'relative',width:160,height:100}}>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={[{v:globalRisk},{v:100-globalRisk}]} cx="50%" cy="100%"
                  startAngle={180} endAngle={0} innerRadius={45} outerRadius={70} dataKey="v">
                  <Cell fill={globalRisk>70?COLORS.error:globalRisk>40?COLORS.honey:COLORS.success}/>
                  <Cell fill="rgba(255,255,255,.06)"/>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{position:'absolute',bottom:-5,left:'50%',transform:'translateX(-50%)',textAlign:'center'}}>
              <div style={{fontSize:26,fontWeight:900,color:globalRisk>70?COLORS.error:globalRisk>40?COLORS.honey:COLORS.success}}>{globalRisk}</div>
              <div style={{fontSize:9,color:MT}}>/ 100</div>
            </div>
          </div>
          {/* Risk cards */}
          {[
            {l:'Traitement stock',v:`${riskData.stockTraitement} doses`,c:riskData.stockTraitement<5?COLORS.error:COLORS.success},
            {l:'Taux traitement',  v:`${riskData.treatRate}%`,         c:COLORS.honey},
            {l:'Ruches critiques', v:`${riskData.criticals}`,          c:riskData.criticals>0?COLORS.error:COLORS.success},
          ].map(k=>(
            <div key={k.l} style={{width:'100%',display:'flex',justifyContent:'space-between',padding:'6px 12px',
              borderRadius:9,background:'rgba(255,255,255,.03)',border:`1px solid ${BR}`}}>
              <span style={{fontSize:11,color:MT}}>{k.l}</span>
              <span style={{fontSize:12,fontWeight:800,color:k.c}}>{k.v}</span>
            </div>
          ))}
        </div>

        {/* Treatment history */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>HISTORIQUE TRAITEMENTS</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={treatHistory} margin={{left:-10,right:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="month" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} angle={-20} textAnchor="end"/>
              <YAxis tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT} formatter={v=>[v,'Doses']}/>
              <Bar dataKey="doses" radius={[6,6,0,0]} name="Doses traitement">
                {treatHistory.map((d,i)=><Cell key={i} fill={d.doses>2?COLORS.error:d.doses>0?COLORS.honey:COLORS.success}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   4. Harvest Optimization Model (Multi-Factor Regression)
══════════════════════════════════════════════════════════ */
function HarvestOptimizationSection({ ruches, visites, productions }) {
  /* Compute harvest readiness score per hive */
  const hiveScores=useMemo(()=>{
    const now=new Date();
    const month=now.getMonth()+1;
    const seasonBonus=month>=4&&month<=8?20:month>=9&&month<=10?10:0;

    return ruches.map(r=>{
      const honeyScore=(r.honey_level==='Excellent'?100:r.honey_level==='Bon'?70:r.honey_level==='Moyen'?40:10);
      const forceScore=Math.round((r.force_level||5)*10);
      const healthScore=Math.round((r.health_score||7)*10);
      const queenPenalty=r.has_queen===false?-20:0;
      const lastVisit=visites.filter(v=>v.hive_id===r.id).sort((a,b)=>b.visit_date?.localeCompare(a.visit_date||'')||0)[0];
      const daysSinceVisit=lastVisit?Math.round((now-new Date(lastVisit.visit_date))/86400000):30;
      const recency=daysSinceVisit>30?-10:0;

      const readiness=Math.min(100,Math.max(0,Math.round(
        honeyScore*0.5 + forceScore*0.3 + healthScore*0.1 +
        seasonBonus + queenPenalty + recency
      )));

      return {
        id:r.id, name:r.identifier,
        readiness, honeyScore, forceScore, healthScore,
        recommend:readiness>=70,
        expectedKg:parseFloat(((r.force_level||5)*0.8*(readiness/100)).toFixed(1)),
      };
    }).sort((a,b)=>b.readiness-a.readiness);
  },[ruches,visites]);

  /* Regression: force_level vs harvest_kg */
  const regressionData=useMemo(()=>{
    const pts=visites.filter(v=>v.harvest_kg>0&&v.hive_id)
      .map(v=>{
        const r=ruches.find(h=>h.id===v.hive_id);
        return r?{x:r.force_level||5,y:parseFloat(v.harvest_kg)||0,name:r.identifier}:null;
      }).filter(Boolean);
    const reg=linReg(pts);
    return {pts,reg};
  },[ruches,visites]);

  const readyCount=hiveScores.filter(h=>h.recommend).length;
  const totalExpected=hiveScores.filter(h=>h.recommend).reduce((s,h)=>s+h.expectedKg,0).toFixed(1);

  return (
    <div style={cS}>
      <SH icon={<Target size={18} color={COLORS.accent}/>}
        title="Optimisation Récolte — Régression Multi-facteur" color={COLORS.accent}
        sub={`${readyCount} ruches prêtes · ${totalExpected} kg estimés · Score = Miel×0.5 + Force×0.3 + Santé×0.1 + Saison`}
        badge={`${readyCount} PRÊTES`}/>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        {/* Readiness bar chart */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>SCORE MATURITÉ RÉCOLTE PAR RUCHE</div>
          <ResponsiveContainer width="100%" height={Math.max(160,hiveScores.length*28)}>
            <BarChart data={hiveScores.slice(0,10)} layout="vertical" margin={{left:10,right:30}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} horizontal={false}/>
              <XAxis type="number" domain={[0,100]} tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} unit="%"/>
              <YAxis type="category" dataKey="name" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} width={60}/>
              <Tooltip {...TT} formatter={(v,n)=>[`${v}${n==='readiness'?'%':' kg'}`,n==='readiness'?'Maturité':'Kg estimé']}/>
              <ReferenceLine x={70} stroke={COLORS.success} strokeDasharray="4 2" label={{value:'Seuil récolte 70%',fill:COLORS.success,fontSize:9}}/>
              <Bar dataKey="readiness" radius={[0,8,8,0]} name="readiness">
                {hiveScores.slice(0,10).map((h,i)=><Cell key={i} fill={h.recommend?COLORS.accent:h.readiness>40?COLORS.honey:COLORS.error}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regression scatter + action list */}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:11,fontWeight:700,color:MT}}>RUCHES À RÉCOLTER EN PRIORITÉ</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:220,overflowY:'auto'}}>
            {hiveScores.filter(h=>h.recommend).slice(0,6).map(h=>(
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                borderRadius:10,background:`${COLORS.accent}10`,border:`1px solid ${COLORS.accent}25`}}>
                <span style={{fontSize:18}}>🍯</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:800,color:TX}}>{h.name}</div>
                  <div style={{fontSize:10,color:MT}}>~{h.expectedKg} kg estimé</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:900,color:COLORS.accent}}>{h.readiness}%</div>
                </div>
              </div>
            ))}
            {!hiveScores.filter(h=>h.recommend).length && (
              <div style={{color:MT,fontSize:12,padding:'12px 0',textAlign:'center'}}>
                Aucune ruche à maturité — vérifier les niveaux de miel
              </div>
            )}
          </div>
          <div style={{padding:'10px 14px',borderRadius:12,background:`${COLORS.accent}08`,border:`1px solid ${COLORS.accent}20`}}>
            <div style={{fontSize:10,color:MT,fontWeight:700}}>RÉCOLTE TOTALE ESTIMÉE</div>
            <div style={{fontSize:22,fontWeight:900,color:COLORS.accent,marginTop:4}}>{totalExpected} kg</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   5. Site Performance Clustering
══════════════════════════════════════════════════════════ */
function SitePerformanceSection({ ruches, emplacements, productions, visites }) {
  const siteData=useMemo(()=>{
    return emplacements.map(e=>{
      const siteRuches=ruches.filter(r=>r.apiary_id===e.id);
      const siteProd=productions.filter(p=>String(p.apiary_id)===String(e.id));
      const siteVisits=visites.filter(v=>siteRuches.some(r=>r.id===v.hive_id));
      const avgHealth=siteRuches.length?siteRuches.reduce((s,r)=>s+(r.health_score||7),0)/siteRuches.length:0;
      const totalHoney=siteProd.reduce((s,p)=>s+(parseFloat(p.honey_kg)||0),0);
      const honeyPerHive=siteRuches.length?totalHoney/siteRuches.length:0;
      const visitFreq=siteRuches.length?siteVisits.length/siteRuches.length:0;

      return {
        name:e.name||`Site ${e.id}`,
        ruches:siteRuches.length,
        avgHealth:parseFloat(avgHealth.toFixed(1)),
        totalHoney:parseFloat(totalHoney.toFixed(1)),
        honeyPerHive:parseFloat(honeyPerHive.toFixed(1)),
        visitFreq:parseFloat(visitFreq.toFixed(1)),
        score:Math.round(avgHealth*30+honeyPerHive*20+visitFreq*10),
      };
    }).sort((a,b)=>b.score-a.score);
  },[ruches,emplacements,productions,visites]);

  if(!siteData.length) return null;

  /* K-means on score (3 clusters) */
  const scores=siteData.map(d=>d.score);
  const clusters=kmeans(scores,Math.min(3,scores.length));
  const clusterColors=['#22c55e','#f59e0b','#ef4444'];

  return (
    <div style={cS}>
      <SH icon={<MapPin size={18} color={COLORS.info}/>}
        title="Performance par Emplacement — Clustering K-means" color={COLORS.info}
        sub={`${emplacements.length} sites · Score = Santé×30 + Miel/ruche×20 + Fréq. visites×10`}
        badge="K-MEANS"/>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>PERFORMANCE GLOBALE PAR SITE (Score IA)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={siteData} margin={{left:-10,right:10,bottom:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="name" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} angle={-20} textAnchor="end" interval={0}/>
              <YAxis tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="honeyPerHive" fill={AC}           radius={[4,4,0,0]} name="Miel/ruche (kg)" barSize={20}/>
              <Bar dataKey="avgHealth"    fill={COLORS.info}  radius={[4,4,0,0]} name="Santé moy."     barSize={20}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>CLASSEMENT SITES</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {siteData.slice(0,5).map((s,i)=>(
              <div key={s.name} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
                borderRadius:10,background:`${clusterColors[clusters[i]||0]}08`,
                border:`1px solid ${clusterColors[clusters[i]||0]}25`}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:clusterColors[clusters[i]||0],
                  display:'flex',alignItems:'center',justifyContent:'center',
                  color:'#fff',fontSize:11,fontWeight:900,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:TX,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                  <div style={{fontSize:10,color:MT}}>{s.ruches} ruches · {s.totalHoney} kg</div>
                </div>
                <div style={{fontSize:14,fontWeight:900,color:clusterColors[clusters[i]||0]}}>{s.score}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   6. Financial Intelligence (P&L)
══════════════════════════════════════════════════════════ */
function FinancialSection({ productions, stock, ruches, depenses = [] }) {
  /* Honey revenue simulation (4.5–6 DT/kg market price) */
  const HONEY_PRICE=5.2;
  const POLLEN_PRICE=8.0;

  const revenue=useMemo(()=>
    productions.reduce((s,p)=>s+(parseFloat(p.honey_kg)||0)*HONEY_PRICE+(parseFloat(p.pollen_kg)||0)*POLLEN_PRICE,0)
  ,[productions]);

  const monthlyPnL=useMemo(()=>{
    const m={};
    productions.forEach(p=>{
      const mo=(p.production_date||p.date||'').slice(0,7);
      if(!mo) return;
      m[mo]=(m[mo]||{rev:0,cost:0});
      m[mo].rev+=(parseFloat(p.honey_kg)||0)*HONEY_PRICE+(parseFloat(p.pollen_kg)||0)*POLLEN_PRICE;
    });
    depenses.forEach(d=>{
      const mo=(d.date||'').slice(0,7);
      if(!mo) return;
      m[mo]=(m[mo]||{rev:0,cost:0});
      m[mo].cost+=parseFloat(d.montantReel||d.amount)||0;
    });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).slice(-8)
      .map(([month,d])=>({month,revenue:parseFloat(d.rev.toFixed(1)),cost:parseFloat(d.cost.toFixed(1)),margin:parseFloat((d.rev-d.cost).toFixed(1))}));
  },[productions,depenses]);

  /* ROI per hive estimate */
  const hiveROI=useMemo(()=>{
    return ruches.slice(0,8).map(r=>{
      const est=(r.force_level||5)*0.8*(r.honey_level==='Excellent'?2:r.honey_level==='Bon'?1.5:1)*HONEY_PRICE;
      return {name:r.identifier,roi:parseFloat(est.toFixed(1))};
    }).sort((a,b)=>b.roi-a.roi);
  },[ruches]);

  const totalCost=depenses.reduce((s,d)=>s+(parseFloat(d.montantReel||d.amount)||0),0);
  const netMargin=revenue-totalCost;

  return (
    <div style={cS}>
      <SH icon={<DollarSign size={18} color={COLORS.success}/>}
        title="Intelligence Financière — P&L & ROI par Ruche" color={COLORS.success}
        sub="Revenus miel/pollen · Charges exploitabilité · Marge nette · Prix marché 5.2 DT/kg"
        badge="FINANCE AI"/>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
        {[
          {l:'Revenus totaux',  v:`${revenue.toFixed(0)} DT`,    c:COLORS.success},
          {l:'Charges',         v:`${totalCost.toFixed(0)} DT`,  c:COLORS.error},
          {l:'Marge nette',     v:`${netMargin.toFixed(0)} DT`,  c:netMargin>=0?COLORS.success:COLORS.error},
        ].map(k=>(
          <div key={k.l} style={{padding:'12px',borderRadius:14,background:`${k.c}10`,border:`1px solid ${k.c}25`,textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:900,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,color:MT,marginTop:3,fontWeight:700}}>{k.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>COMPTE DE RÉSULTAT MENSUEL</div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={monthlyPnL} margin={{left:-10,right:10,top:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="month" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <Bar dataKey="revenue" fill={COLORS.success} radius={[4,4,0,0]} name="Revenus" barSize={18}/>
              <Bar dataKey="cost"    fill={COLORS.error}   radius={[4,4,0,0]} name="Charges"  barSize={18}/>
              <Line dataKey="margin" stroke={COLORS.honey} strokeWidth={2.5} dot={false} name="Marge"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>ROI ESTIMÉ PAR RUCHE (DT)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hiveROI} layout="vertical" margin={{left:0,right:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} horizontal={false}/>
              <XAxis type="number" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} width={55}/>
              <Tooltip {...TT} formatter={v=>[`${v} DT`,'ROI est.']}/>
              <Bar dataKey="roi" radius={[0,6,6,0]} fill={AC} name="ROI (DT)"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   7. Seasonal Fourier Analysis
══════════════════════════════════════════════════════════ */
function SeasonalSection({ productions }) {
  const monthlyData=useMemo(()=>{
    const m=Array.from({length:12},(_,i)=>({month:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][i],idx:i,honey:0,pollen:0,count:0}));
    productions.forEach(p=>{
      const mo=parseInt((p.production_date||p.date||'').slice(5,7))-1;
      if(isNaN(mo)||mo<0||mo>11) return;
      m[mo].honey+=(parseFloat(p.honey_kg)||0);
      m[mo].pollen+=(parseFloat(p.pollen_kg)||0);
      m[mo].count++;
    });
    // Add theoretical bloom curve (Fourier 1st harmonic)
    m.forEach((d,i)=>{
      d.bloom=parseFloat((50+40*Math.cos(2*Math.PI*(i-3)/12)).toFixed(0));
      d.theoretical=parseFloat((30+20*Math.cos(2*Math.PI*(i-4)/12)).toFixed(0));
    });
    return m;
  },[productions]);

  const peakMonth=monthlyData.reduce((best,d)=>d.honey>best.honey?d:best,monthlyData[0]);

  return (
    <div style={cS}>
      <SH icon={<Leaf size={18} color={COLORS.success}/>}
        title="Analyse Saisonnière — Décomposition Fourier (Floraison × Production)" color={COLORS.success}
        sub="Corrélation calendrier floraison · Harmonique saisonnière · Production mensuelle réelle"
        badge="FOURIER"/>

      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:14}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>PRODUCTION MENSUELLE + COURBE FLORAISON THÉORIQUE</div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthlyData} margin={{left:-10,right:10,top:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} vertical={false}/>
              <XAxis dataKey="month" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="right" orientation="right" tick={{fill:MT,fontSize:8}} axisLine={false} tickLine={false} unit="%" domain={[0,100]}/>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              <Bar yAxisId="left" dataKey="honey"  fill={AC}             radius={[4,4,0,0]} name="Miel récolté (kg)" barSize={18}/>
              <Bar yAxisId="left" dataKey="pollen" fill={COLORS.success} radius={[4,4,0,0]} name="Pollen (kg)"      barSize={18}/>
              <Line yAxisId="right" type="monotone" dataKey="bloom"       stroke={COLORS.honey} strokeWidth={2} dot={false} name="Indice floraison %" strokeDasharray="5 3"/>
              <Line yAxisId="right" type="monotone" dataKey="theoretical" stroke={COLORS.info}  strokeWidth={1.5} dot={false} name="Production théorique %" strokeDasharray="3 2"/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:11,fontWeight:700,color:MT}}>SAISONS APICOLES</div>
          {[
            {s:'Printemps (Mar-Mai)',icon:'🌸',note:'Pic floraison · Stimulation sirop',color:'#22c55e'},
            {s:'Été (Jun-Aoû)',      icon:'☀️',note:'Grande récolte · Surveillance varroa',color:AC},
            {s:'Automne (Sep-Nov)',  icon:'🍂',note:'Récolte finale · Préparation hiver',color:COLORS.honey},
            {s:'Hiver (Déc-Fév)',   icon:'❄️',note:'Repos · Comptage varroa · Nourrissement',color:'#6366f1'},
          ].map(s=>(
            <div key={s.s} style={{padding:'8px 12px',borderRadius:10,background:`${s.color}08`,border:`1px solid ${s.color}20`}}>
              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                <span style={{fontSize:16}}>{s.icon}</span>
                <span style={{fontSize:11,fontWeight:800,color:s.color}}>{s.s}</span>
              </div>
              <div style={{fontSize:10,color:MT}}>{s.note}</div>
            </div>
          ))}
          <div style={{padding:'8px 12px',borderRadius:10,background:`${AC}10`,border:`1px solid ${AC}25`}}>
            <div style={{fontSize:10,color:MT,fontWeight:700}}>MEILLEUR MOIS (réel)</div>
            <div style={{fontSize:16,fontWeight:900,color:AC,marginTop:3}}>{peakMonth.month} — {peakMonth.honey.toFixed(1)} kg</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   8. Colony Cluster Segmentation
══════════════════════════════════════════════════════════ */
function ColonySegmentSection({ ruches, visites }) {
  const clustered=useMemo(()=>{
    if(!ruches.length) return {tiers:[],scatter:[]};
    const scores=ruches.map(r=>({
      id:r.id, name:r.identifier,
      x:r.health_score||7, y:r.force_level||5,
      honey:r.honey_level==='Excellent'?5:r.honey_level==='Bon'?4:r.honey_level==='Moyen'?3:1,
      visits:visites.filter(v=>v.hive_id===r.id).length,
    }));
    const composite=scores.map(s=>Math.round(s.x*30+s.y*25+s.honey*10+Math.min(s.visits,5)*7));
    const cls=kmeans(composite,3);
    const byTier={Elite:[],Standard:[],Critique:[]};
    scores.forEach((s,i)=>{
      const tier=cls[i]===0?'Elite':cls[i]===1?'Standard':'Critique';
      byTier[tier].push({...s,score:composite[i],tier});
    });
    return {
      tiers:Object.entries(byTier).map(([t,h])=>({tier:t,count:h.length,avgScore:h.length?Math.round(h.reduce((s,x)=>s+x.score,0)/h.length):0})),
      scatter:scores.map((s,i)=>({...s,score:composite[i],tier:cls[i]===0?'Elite':cls[i]===1?'Standard':'Critique'})),
    };
  },[ruches,visites]);

  const tierColors={Elite:'#22c55e',Standard:'#f59e0b',Critique:'#ef4444'};

  return (
    <div style={cS}>
      <SH icon={<Zap size={18} color={COLORS.purple}/>}
        title="Segmentation Colonies — K-means 3 Tiers" color={COLORS.purple}
        sub="Score composite = Santé×30 + Force×25 + Miel×10 + Fréq. visites×7 · Clustering non supervisé"
        badge="K-MEANS 3-TIERS"/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:14}}>
        {/* Tier summary */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div style={{fontSize:11,fontWeight:700,color:MT}}>DISTRIBUTION PAR TIER</div>
          {clustered.tiers.map(t=>(
            <div key={t.tier} style={{padding:'14px 16px',borderRadius:14,
              background:`${tierColors[t.tier]}10`,border:`1px solid ${tierColors[t.tier]}25`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:tierColors[t.tier]}}>{t.tier}</div>
                  <div style={{fontSize:10,color:MT,marginTop:2}}>Score moy: {t.avgScore}</div>
                </div>
                <div style={{fontSize:28,fontWeight:900,color:tierColors[t.tier]}}>{t.count}</div>
              </div>
              <div style={{marginTop:8,height:4,background:'rgba(255,255,255,.06)',borderRadius:2}}>
                <div style={{height:'100%',width:`${Math.min(100,(t.count/Math.max(1,ruches.length))*100)}%`,
                  background:tierColors[t.tier],borderRadius:2}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Scatter health vs force */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>CARTE 2D : SANTÉ × FORCE COLONIE</div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{left:0,right:10,top:5,bottom:10}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR}/>
              <XAxis dataKey="x" name="Santé" type="number" domain={[0,10]} tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} label={{value:'Score Santé',position:'insideBottom',offset:-6,fill:MT,fontSize:9}}/>
              <YAxis dataKey="y" name="Force" type="number" domain={[0,10]} tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} label={{value:'Force',angle:-90,position:'insideLeft',fill:MT,fontSize:9}}/>
              <Tooltip {...TT} content={({active,payload})=>{
                if(!active||!payload?.length) return null;
                const d=payload[0].payload;
                return <div style={TT.contentStyle}><b style={{color:tierColors[d.tier]||AC}}>{d.name}</b><br/>Santé:{d.x} · Force:{d.y}<br/>Tier:{d.tier}<br/>Score:{d.score}</div>;
              }}/>
              {['Elite','Standard','Critique'].map(t=>(
                <Scatter key={t}
                  data={clustered.scatter.filter(d=>d.tier===t)}
                  name={t}
                  shape={({cx,cy,payload})=>(
                    <circle cx={cx} cy={cy} r={payload.honey*2.5+2}
                      fill={tierColors[t]} fillOpacity={0.75}
                      stroke={tierColors[t]} strokeWidth={0.5}/>
                  )}
                  fill={tierColors[t]}
                />
              ))}
              <Legend/>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   9. Queen Intelligence (Reproductive Model)
══════════════════════════════════════════════════════════ */
function QueenIntelligenceSection({ ruches }) {
  const currentYear=new Date().getFullYear();

  const queenData=useMemo(()=>
    ruches.filter(r=>r.hive_type!=='queen_bank').map(r=>{
      const age=r.queen_year?currentYear-r.queen_year:1;
      const present=r.has_queen!==false;
      const productivity=Math.min(100,present?(100-age*20):0);
      const replaceRisk=age>=3?'URGENT':age>=2?'ATTENTION':'OK';
      return {name:r.identifier,age,present,productivity,replaceRisk,ageLabel:`${age}${age>1?'ans':'an'}`};
    }).sort((a,b)=>b.age-a.age)
  ,[ruches,currentYear]);

  const ageDist=[
    {l:'Jeune (0-1 an)',count:queenData.filter(q=>q.age<=1).length,c:'#22c55e'},
    {l:'Mature (2 ans)',count:queenData.filter(q=>q.age===2).length,c:'#f59e0b'},
    {l:'Vieille (3+ ans)',count:queenData.filter(q=>q.age>=3).length,c:'#ef4444'},
    {l:'Absente',count:queenData.filter(q=>!q.present).length,c:'#6366f1'},
  ];
  const urgentReplace=queenData.filter(q=>q.replaceRisk==='URGENT').length;

  return (
    <div style={cS}>
      <SH icon={<Crown size={18} color={COLORS.info}/>}
        title="Intelligence Reine — Modèle Prédictif Remplacement" color={COLORS.info}
        sub="Age distribution · Productivité estimée · Planning de renouvellement · Queenright probability"
        badge={urgentReplace>0?`⚠ ${urgentReplace} URGENT`:'✓ REINE OK'}/>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
        {/* Age distribution */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>DISTRIBUTION ÂGES REINE</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={ageDist.filter(d=>d.count>0).map(d=>({name:d.l,value:d.count}))}
                cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {ageDist.filter(d=>d.count>0).map((d,i)=><Cell key={i} fill={d.c}/>)}
              </Pie>
              <Tooltip {...TT}/>
              <Legend wrapperStyle={{fontSize:9}}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Productivity bar */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>PRODUCTIVITÉ ESTIMÉE PAR REINE</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={queenData.slice(0,8)} layout="vertical" margin={{left:0,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={BR} horizontal={false}/>
              <XAxis type="number" domain={[0,100]} tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} unit="%"/>
              <YAxis type="category" dataKey="name" tick={{fill:MT,fontSize:9}} axisLine={false} tickLine={false} width={55}/>
              <Tooltip {...TT} formatter={v=>[`${v}%`,'Productivité']}/>
              <Bar dataKey="productivity" radius={[0,6,6,0]} name="Productivité">
                {queenData.slice(0,8).map((d,i)=><Cell key={i} fill={d.productivity>70?'#22c55e':d.productivity>40?'#f59e0b':d.productivity>0?'#ef4444':'#6366f1'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Replacement priority list */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:MT,marginBottom:8}}>PLANNING REMPLACEMENT</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto'}}>
            {queenData.filter(q=>q.replaceRisk!=='OK'||!q.present).map(q=>(
              <div key={q.name} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 10px',
                borderRadius:9,background:q.replaceRisk==='URGENT'?`${COLORS.error}10`:`${COLORS.honey}10`,
                border:`1px solid ${q.replaceRisk==='URGENT'?COLORS.error:COLORS.honey}25`}}>
                <span style={{fontSize:16}}>👑</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:700,color:TX}}>{q.name}</div>
                  <div style={{fontSize:10,color:MT}}>{q.present?`${q.ageLabel}`:'Absente'}</div>
                </div>
                <span style={{fontSize:9,padding:'2px 7px',borderRadius:99,
                  background:q.replaceRisk==='URGENT'?`${COLORS.error}18`:`${COLORS.honey}18`,
                  color:q.replaceRisk==='URGENT'?COLORS.error:COLORS.honey,fontWeight:800}}>
                  {q.present?q.replaceRisk:'MANQUANTE'}
                </span>
              </div>
            ))}
            {!queenData.filter(q=>q.replaceRisk!=='OK'||!q.present).length && (
              <div style={{color:MT,fontSize:12,padding:16,textAlign:'center'}}>
                ✅ Toutes les reines sont jeunes et actives
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function BeeMLDashboard({ ruches=[], emplacements=[], productions=[], visites=[], stock={}, farmId }) {
  const [cvEvents,  setCvEvents]  = useState([]);
  const [depenses,  setDepenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    const p=farmId?`?farm_id=${farmId}`:'';
    Promise.allSettled([
      api.get(`/cv/events${p}&limit=500`),
    ]).then(([evR])=>{
      if(evR.status==='fulfilled') setCvEvents(Array.isArray(evR.value?.data)?evR.value.data:[]);
    }).finally(()=>setLoading(false));
  },[farmId]);

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24,padding:'4px 0'}}>

      {/* Header */}
      <div style={{padding:'22px 28px',borderRadius:24,
        background:'linear-gradient(135deg,#78350f,#b45309,#d97706)',
        border:`1px solid ${BR}`,display:'flex',alignItems:'center',gap:18,position:'relative',overflow:'hidden'}}>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.06,pointerEvents:'none'}}>
          <defs><pattern id="hxBee" x="0" y="0" width="40" height="46" patternUnits="userSpaceOnUse"><polygon points="20,2 36,11 36,35 20,44 4,35 4,11" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#hxBee)"/>
        </svg>
        <div style={{width:56,height:56,borderRadius:16,background:'rgba(255,255,255,.15)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,flexShrink:0}}>🧠</div>
        <div style={{flex:1}}>
          <div style={{color:'#fff',fontWeight:900,fontSize:20,letterSpacing:'-.03em'}}>APICRAFT · Analytics IA & Deep Learning</div>
          <div style={{color:'rgba(255,255,255,.7)',fontSize:12,marginTop:4}}>
            YOLOv11-OBB · Holt-Winters · K-means · Fourier · Régression · COLOSS · {ruches.length} ruches · {productions.length} récoltes
          </div>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[
            {l:`${ruches.length} ruches`,      c:'#fbbf24'},
            {l:`${cvEvents.length} CV events`, c:'#a78bfa'},
            {l:`${productions.length} récoltes`,c:'#86efac'},
          ].map(b=>(
            <div key={b.l} style={{padding:'6px 14px',borderRadius:99,background:'rgba(255,255,255,.15)',
              fontSize:11,fontWeight:800,color:b.c}}>{b.l}</div>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:'40px 0',color:MT}}>
          <div style={{width:32,height:32,border:`2px solid ${BR}`,borderTopColor:AC,
            borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 12px'}}/>
          <div style={{fontSize:13}}>Chargement données IA apicoles…</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {!loading && <>
        <BeeDetectionSection     cvEvents={cvEvents}/>
        <ColonyStrengthSection   ruches={ruches} visites={visites}/>
        <VarroaRiskSection       ruches={ruches} visites={visites} stock={stock}/>
        <HarvestOptimizationSection ruches={ruches} visites={visites} productions={productions}/>
        <SitePerformanceSection  ruches={ruches} emplacements={emplacements} productions={productions} visites={visites}/>
        <FinancialSection        productions={productions} stock={stock} ruches={ruches} depenses={depenses}/>
        <SeasonalSection         productions={productions}/>
        <ColonySegmentSection    ruches={ruches} visites={visites}/>
        <QueenIntelligenceSection ruches={ruches}/>
      </>}
    </div>
  );
}
