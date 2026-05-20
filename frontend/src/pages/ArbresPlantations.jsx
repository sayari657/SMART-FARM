import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bot, Send, User, Mic, MicOff, Volume2, Upload, Leaf,
  Flower2, CheckCircle2, X, Bug, History, Trash2, Image as ImageIcon,
  TreePine, AlertCircle, Maximize2, Citrus,
  FileText, ChevronDown, ChevronUp, Loader2,
  BarChart2, RefreshCw, Sparkles, Activity,
  Globe, Shield, Target, Eye, Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import { agentAPI, cvAPI, diagnosticAPI } from '../services/api';

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS — Enterprise Light
══════════════════════════════════════════════════════════ */
const T = {
  bg:         '#ffffff',
  surface:    '#ffffff',
  surfaceAlt: '#f8fafc',
  border:     '#e2e8f0',
  borderHi:   '#cbd5e1',
  green:      '#16a34a',
  greenLt:    '#dcfce7',
  greenGlow:  'rgba(22,163,74,0.1)',
  amber:      '#d97706',
  amberLt:    '#fef3c7',
  amberGlow:  'rgba(217,119,6,0.1)',
  red:        '#dc2626',
  redLt:      '#fee2e2',
  blue:       '#2563eb',
  blueLt:     '#dbeafe',
  orange:     '#ea580c',
  orangeLt:   '#ffedd5',
  yellow:     '#ca8a04',
  yellowLt:   '#fefce8',
  textPri:    '#0f172a',
  textSec:    '#475569',
  textMut:    '#94a3b8',
  shadow:     '0 1px 3px rgba(0,0,0,0.06),0 2px 8px rgba(0,0,0,0.05)',
  shadowMd:   '0 4px 12px rgba(0,0,0,0.07),0 8px 24px rgba(0,0,0,0.06)',
  shadowLg:   '0 8px 24px rgba(0,0,0,0.1),0 20px 48px rgba(0,0,0,0.09)',
};

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const REPORT_EVERY   = 10;
const AGRONOMIE_CATS = ['leaves', 'lemon', 'orange'];
const PHYTO_CATS     = ['olive', 'insects'];
const getGroup       = (cat) => PHYTO_CATS.includes(cat) ? 'phyto' : 'agronomie';

const loadCnt  = (g)     => +(localStorage.getItem(`pb_${g}_cnt`) || 0);
const saveCnt  = (g, n)  => localStorage.setItem(`pb_${g}_cnt`, n);
const loadReps = (g)     => { try { const p = JSON.parse(localStorage.getItem(`pb_${g}_reps`) || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const saveReps = (g, rs) => localStorage.setItem(`pb_${g}_reps`, JSON.stringify(rs));

/* ══════════════════════════════════════════════════════════
   SCANNER PANEL
══════════════════════════════════════════════════════════ */
function ScannerPanel({ title, subtitle, category, accent, accentLt, icon: Icon, onAnalyze }) {
  const { t } = useTranslation();
  const [img,       setImg]       = useState(null);
  const [dets,      setDets]      = useState([]);
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState(null);
  const [palette,   setPalette]   = useState({});
  const [scanned,   setScanned]   = useState(false);
  const [saved,     setSaved]     = useState(false);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    cvAPI.getModelMetadata(category)
      .then(res => {
        const clrs = ['#ef4444','#f97316','#16a34a','#a855f7','#8b5cf6','#eab308',
                      '#06b6d4','#84cc16','#ec4899','#3b82f6','#10b981','#ea580c'];
        const p = {};
        Object.values(res.data.names).forEach((n, i) => {
          p[n.toLowerCase().replace(/\s+/g,'_')] = clrs[i % clrs.length];
        });
        setPalette(p);
      })
      .catch(() => {});
  }, [category]);

  const getClr = useCallback(
    (lbl) => palette[lbl?.toLowerCase().replace(/\s+/g,'_') || ''] || accent,
    [palette, accent]
  );

  const drawBoxes = useCallback((ds) => {
    const canvas = canvasRef.current, im = imgRef.current;
    if (!canvas || !im || !ds?.length) return;
    canvas.width = im.offsetWidth; canvas.height = im.offsetHeight;
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ds.forEach(d => {
      const [cx_p, cy_p, w_p, h_p, rot=0] = d.bbox;
      const w=w_p/100*W, h=h_p/100*H, cx=cx_p/100*W, cy=cy_p/100*H;
      const x1=cx-w/2, y1=cy-h/2;
      const bc = getClr(d.label);
      ctx.save();
      ctx.translate(cx,cy); ctx.rotate(rot); ctx.translate(-cx,-cy);
      ctx.strokeStyle=bc; ctx.lineWidth=2.5; ctx.shadowBlur=12; ctx.shadowColor=bc;
      ctx.strokeRect(x1,y1,w,h);
      const cl=Math.min(w,h)*0.18; ctx.lineWidth=3.5;
      [[x1,y1],[x1+w,y1],[x1,y1+h],[x1+w,y1+h]].forEach(([px,py]) => {
        const dx=px===x1?cl:-cl, dy=py===y1?cl:-cl;
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+dx,py); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px,py+dy); ctx.stroke();
      });
      ctx.shadowBlur=0;
      const txt = d.label.replace(/_/g,' ').toUpperCase()+'  '+Math.round(d.confidence*100)+'%';
      ctx.font='bold 10px Inter,sans-serif';
      const tw=ctx.measureText(txt).width, lh=18, ly=Math.max(y1-lh-3,0);
      const [r,g,b]=[parseInt(bc.slice(1,3),16),parseInt(bc.slice(3,5),16),parseInt(bc.slice(5,7),16)];
      ctx.fillStyle=`rgba(${r},${g},${b},0.9)`;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x1,ly,tw+10,lh,3);
      else ctx.rect(x1,ly,tw+10,lh);
      ctx.fill();
      ctx.fillStyle='#fff'; ctx.fillText(txt,x1+5,ly+12);
      ctx.restore();
    });
  }, [getClr]);

  useEffect(() => {
    if (img && dets.length) {
      const t = setTimeout(() => drawBoxes(dets), 120);
      return () => clearTimeout(t);
    }
  }, [dets, img, drawBoxes]);

  const compress = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = ev => {
      const image = new Image(); image.src = ev.target.result;
      image.onload = () => {
        const c = document.createElement('canvas'), MAX = 720;
        let w=image.width, h=image.height;
        if(w>h?w>MAX:h>MAX){if(w>h){h*=MAX/w;w=MAX;}else{w*=MAX/h;h=MAX;}}
        c.width=w; c.height=h; c.getContext('2d').drawImage(image,0,0,w,h);
        const b64 = c.toDataURL('image/jpeg',0.85);
        c.toBlob(bl=>resolve({file:new File([bl],file.name,{type:'image/jpeg'}),b64}),'image/jpeg',0.85);
      };
    };
  });

  const run = async (file) => {
    setBusy(true); setErr(null); setDets([]); setScanned(false); setSaved(false);
    try {
      const {file:opt, b64} = await compress(file);
      const res = await cvAPI.detect(opt, category);
      const ds = res.data.detections || [];
      setDets(ds); setScanned(true);
      if (ds.length > 0) {
        setTimeout(async () => {
          try { await onAnalyze?.(ds, category, b64, true); setSaved(true); } catch {}
        }, 300);
      }
    } catch(e) { setErr(e.response?.data?.detail || 'Erreur analyse. Réessayez.'); }
    finally { setBusy(false); }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = f => setImg(f.target.result);
    reader.readAsDataURL(file);
    await run(file);
  };

  const reset = () => { setImg(null); setDets([]); setErr(null); setScanned(false); setSaved(false); };
  const counts  = dets.reduce((a,d)=>{a[d.label]=(a[d.label]||0)+1;return a;},{});
  const avgConf = dets.length ? Math.round(dets.reduce((s,d)=>s+d.confidence,0)/dets.length*100) : 0;

  return (
    <div style={{
      background: T.surface,
      border: `1.5px solid ${T.border}`,
      borderRadius: 18,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: T.shadowMd,
      transition: 'transform 0.2s,box-shadow 0.2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=T.shadowLg;}}
    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=T.shadowMd;}}
    >
      {/* Card header */}
      <div style={{
        padding:'12px 16px',
        background:`linear-gradient(135deg,${accentLt} 0%,#ffffff 100%)`,
        borderBottom:`1.5px solid ${T.border}`,
        display:'flex',alignItems:'center',gap:10,
      }}>
        <div style={{
          width:38,height:38,borderRadius:11,flexShrink:0,
          background:`linear-gradient(135deg,${accent},${accent}cc)`,
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:`0 4px 10px ${accent}44`,
        }}>
          <Icon size={18} color="#fff"/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:800,color:T.textPri,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>
          <div style={{fontSize:9,color:T.textMut,textTransform:'uppercase',letterSpacing:1,marginTop:1}}>{subtitle}</div>
        </div>
        <span style={{
          fontSize:8,padding:'2px 8px',borderRadius:99,flexShrink:0,
          background:accentLt,color:accent,border:`1px solid ${accent}33`,
          fontWeight:800,letterSpacing:0.8,textTransform:'uppercase',
        }}>{category}</span>
      </div>

      {/* Viewport */}
      <div style={{height:'clamp(180px,30vw,240px)',background:'#0f172a',position:'relative',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
        {!img && (
          <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${accent}14 1px,transparent 1px),linear-gradient(90deg,${accent}14 1px,transparent 1px)`,backgroundSize:'32px 32px',pointerEvents:'none'}}/>
        )}

        {img ? (
          <div style={{position:'relative',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img ref={imgRef} src={img} style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}} alt="scan"
              onLoad={()=>dets.length&&drawBoxes(dets)}/>
            <canvas ref={canvasRef} style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:10}}/>

            {busy && (
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(4px)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:30}}>
                <div style={{position:'relative',width:52,height:52,marginBottom:12}}>
                  <div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid ${accent}22`}}/>
                  <div style={{position:'absolute',inset:0,borderRadius:'50%',border:`2px solid transparent`,borderTopColor:accent,animation:'spin 0.8s linear infinite'}}/>
                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Zap size={14} color={accent}/>
                  </div>
                </div>
                <span style={{color:accent,fontWeight:800,fontSize:10,letterSpacing:2}}>{t('trees.analyzing')}</span>
                <span style={{color:'#64748b',fontSize:8,marginTop:3,letterSpacing:1}}>YOLO · {category.toUpperCase()}</span>
              </div>
            )}

            {!busy && dets.length > 0 && (
              <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,0.95),rgba(0,0,0,0.6))',padding:'8px 12px',zIndex:20}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`,flexShrink:0}}/>
                  <span style={{color:accent,fontWeight:800,fontSize:11}}>{dets.length} DÉTECTION(S)</span>
                  <span style={{fontSize:9,color:'#94a3b8'}}>conf. {avgConf}%</span>
                  {saved&&<span style={{marginLeft:'auto',fontSize:8,background:'#16a34a22',color:'#16a34a',border:'1px solid #16a34a44',padding:'1px 7px',borderRadius:99,fontWeight:800}}>✓ {t('trees.saved')}</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                  {Object.entries(counts).slice(0,4).map(([lbl,cnt])=>(
                    <span key={lbl} style={{fontSize:9,color:'#e2e8f0',background:'rgba(255,255,255,0.07)',padding:'1px 7px',borderRadius:99,border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',gap:3}}>
                      <span style={{width:5,height:5,borderRadius:'50%',background:getClr(lbl),flexShrink:0}}/>
                      {lbl.replace(/_/g,' ')} ×{cnt}
                    </span>
                  ))}
                  <div style={{marginLeft:'auto',display:'flex',gap:5}}>
                    <button onClick={()=>onAnalyze?.(dets,category,img)} style={{background:`linear-gradient(135deg,${accent},${accent}bb)`,border:'none',color:'#fff',borderRadius:7,padding:'4px 12px',cursor:'pointer',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',gap:4,boxShadow:`0 3px 10px ${accent}44`}}>
                      <Bot size={10}/> {t('trees.analyze')}
                    </button>
                    <button onClick={reset} style={{background:'rgba(255,255,255,0.09)',border:'1px solid rgba(255,255,255,0.14)',color:'#94a3b8',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontSize:9}}>{t('trees.reset')}</button>
                  </div>
                </div>
              </div>
            )}

            {!busy && scanned && !dets.length && (
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.85)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:20}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(22,163,74,0.15)',border:'1.5px solid rgba(22,163,74,0.4)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
                  <CheckCircle2 size={20} color="#16a34a"/>
                </div>
                <span style={{color:'#e2e8f0',fontWeight:700,fontSize:12}}>{t('trees.no_anomaly')}</span>
                <button onClick={reset} style={{marginTop:14,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#e2e8f0',borderRadius:8,padding:'5px 16px',cursor:'pointer',fontSize:10}}>{t('trees.new_analysis')}</button>
              </div>
            )}

            {err && (
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.9)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:40,padding:16,textAlign:'center'}}>
                <AlertCircle size={24} color="#ef4444" style={{marginBottom:8}}/>
                <span style={{color:'#ef4444',fontSize:11,marginBottom:12}}>{err}</span>
                <button onClick={reset} style={{background:'#ef4444',border:'none',color:'#fff',borderRadius:8,padding:'6px 16px',cursor:'pointer',fontSize:11,fontWeight:700}}>Réessayer</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{textAlign:'center',zIndex:1,padding:'0 16px'}}>
            <div style={{width:56,height:56,borderRadius:'50%',background:`${accent}18`,border:`2px dashed ${accent}55`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',animation:'breathe 3s ease-in-out infinite'}}>
              <Upload size={22} color={accent} style={{opacity:0.7}}/>
            </div>
            <p style={{fontSize:12,color:'#e2e8f0',marginBottom:3,fontWeight:600}}>{t('trees.import_image')}</p>
            <p style={{fontSize:9,color:'#64748b',marginBottom:14}}>PNG · JPG · WEBP</p>
            <label style={{cursor:'pointer',background:`linear-gradient(135deg,${accent},${accent}cc)`,color:'white',border:'none',borderRadius:10,padding:'8px 22px',fontWeight:700,fontSize:11,display:'inline-flex',alignItems:'center',gap:7,boxShadow:`0 5px 16px ${accent}44`}}>
              <Upload size={12}/> {t('trees.browse')}
              <input type="file" hidden accept="image/*" onChange={handleFile}/>
            </label>
          </div>
        )}
      </div>

      {/* Class legend */}
      {Object.keys(palette).length > 0 && (
        <div style={{padding:'6px 12px',background:T.surfaceAlt,borderTop:`1px solid ${T.border}`,display:'flex',flexWrap:'wrap',gap:5,minHeight:28,alignItems:'center'}}>
          {Object.entries(palette).slice(0,6).map(([cls,clr])=>(
            <span key={cls} style={{display:'flex',alignItems:'center',gap:3,fontSize:8,color:T.textMut,fontWeight:600}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:clr,flexShrink:0}}/>
              {cls.replace(/_/g,' ')}
            </span>
          ))}
          {Object.keys(palette).length>6&&<span style={{fontSize:8,color:T.textMut}}>+{Object.keys(palette).length-6}</span>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT CARD
══════════════════════════════════════════════════════════ */
function ReportCard({ report, onDelete, accent, accentLt }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:14,padding:'14px 16px',boxShadow:T.shadow,borderTop:`3px solid ${accent}`}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <div style={{width:32,height:32,borderRadius:9,background:accentLt,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <FileText size={14} color={accent}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,fontWeight:800,color:accent,textTransform:'uppercase',letterSpacing:0.7}}>{t('trees.ai_report')} · {report.detCount} images</div>
          <div style={{fontSize:9,color:T.textMut,marginTop:1}}>{new Date(report.timestamp).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <button onClick={()=>onDelete(report.id)} style={{background:'none',border:'none',cursor:'pointer',color:T.red,opacity:0.4,padding:4,lineHeight:0}}
          onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.4'}>
          <Trash2 size={12}/>
        </button>
      </div>
      <div style={{fontSize:12,color:T.textSec,lineHeight:1.7,direction:'rtl',background:T.surfaceAlt,borderRadius:9,padding:'9px 12px',border:`1px solid ${T.border}`}}>
        {expanded ? report.text : report.text?.slice(0,200)}
        {!expanded && report.text?.length>200 && '…'}
      </div>
      {report.text?.length>200 && (
        <button onClick={()=>setExpanded(e=>!e)} style={{background:accentLt,border:`1px solid ${accent}33`,color:accent,borderRadius:7,padding:'4px 12px',cursor:'pointer',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',gap:4,marginTop:8}}>
          {expanded?<><ChevronUp size={11}/>{t('trees.collapse')}</>:<><ChevronDown size={11}/>{t('trees.read_all')}</>}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GROUP SECTION (scanners + isolated reports)
══════════════════════════════════════════════════════════ */
function GroupSection({ title, subtitle, accent, accentLt, icon: Icon, scanners, reports, reportLoading, detCount, onDeleteReport }) {
  const { t } = useTranslation();
  const progress = detCount % REPORT_EVERY;
  const nextIn   = REPORT_EVERY - (progress || REPORT_EVERY);

  return (
    <div style={{marginBottom:40}}>
      {/* Section header */}
      <div style={{
        background:T.surface, border:`1.5px solid ${T.border}`,
        borderLeft:`5px solid ${accent}`, borderRadius:16,
        padding:'16px 22px', marginBottom:16,
        boxShadow:T.shadowMd, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap',
      }}>
        <div style={{width:46,height:46,borderRadius:14,background:`linear-gradient(135deg,${accent},${accent}aa)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 5px 15px ${accent}44`,flexShrink:0}}>
          <Icon size={22} color="#fff"/>
        </div>
        <div style={{flex:1,minWidth:160}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <h2 style={{margin:0,fontSize:19,fontWeight:900,color:T.textPri,letterSpacing:-0.4}}>{title}</h2>
            <span style={{fontSize:8,padding:'2px 9px',borderRadius:99,background:accentLt,color:accent,border:`1px solid ${accent}44`,fontWeight:800,letterSpacing:0.8,textTransform:'uppercase'}}>YOLO v8</span>
          </div>
          <p style={{margin:'3px 0 0',fontSize:11,color:T.textMut}}>{subtitle}</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {reportLoading&&<Loader2 size={12} color={accent} style={{animation:'spin 1s linear infinite'}}/>}
            <span style={{fontSize:10,color:T.textSec,fontWeight:600}}>
              {reportLoading ? t('trees.generating') : `${progress}/${REPORT_EVERY} · ${nextIn>0?`${nextIn} ${t('trees.before_report')}`:t('trees.report_triggered')}`}
            </span>
            <span style={{fontSize:11,fontWeight:900,color:accent,background:accentLt,border:`1px solid ${accent}33`,padding:'2px 11px',borderRadius:99}}>
              {detCount} scans
            </span>
          </div>
          <div style={{width:180,height:5,background:accentLt,borderRadius:99,overflow:'hidden'}}>
            <div style={{width:`${(progress/REPORT_EVERY)*100}%`,height:'100%',background:`linear-gradient(90deg,${accent}88,${accent})`,borderRadius:99,transition:'width 0.5s ease'}}/>
          </div>
        </div>
      </div>

      {/* Scanners */}
      <div style={{
        display:'grid',
        gridTemplateColumns:`repeat(auto-fill,minmax(min(100%,300px),1fr))`,
        gap:14, marginBottom:18,
      }}>
        {scanners}
      </div>

      {/* Reports zone */}
      <div style={{background:accentLt,border:`1.5px solid ${accent}22`,borderRadius:16,padding:18}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
          <div style={{width:32,height:32,borderRadius:9,background:`${accent}18`,border:`1.5px solid ${accent}33`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <BarChart2 size={15} color={accent}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:T.textPri}}>{t('trees.reports')} — {title}</div>
            <div style={{fontSize:9,color:T.textMut}}>{t('trees.generated_auto')} · 1 rapport / {REPORT_EVERY} images</div>
          </div>
          <div style={{marginLeft:'auto',fontSize:10,color:accent,background:T.surface,padding:'3px 11px',borderRadius:99,border:`1px solid ${accent}33`,fontWeight:700}}>
            {reports.length} rapport(s)
          </div>
        </div>

        {reportLoading && (
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:T.surface,borderRadius:11,marginBottom:12,border:`1.5px solid ${accent}33`}}>
            <Loader2 size={14} color={accent} style={{animation:'spin 1s linear infinite',flexShrink:0}}/>
            <div>
              <div style={{fontSize:12,color:accent,fontWeight:700}}>{t('trees.generating')}</div>
              <div style={{fontSize:9,color:T.textMut,marginTop:1}}>Labess-7B · Groq · Darija</div>
            </div>
          </div>
        )}

        {reports.length===0 && !reportLoading ? (
          <div style={{textAlign:'center',padding:'28px 0',background:T.surface,borderRadius:12,border:`1.5px dashed ${accent}44`,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
            <div style={{width:44,height:44,borderRadius:12,background:accentLt,border:`1.5px dashed ${accent}66`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <FileText size={18} color={`${accent}88`}/>
            </div>
            <div style={{fontSize:12,color:T.textSec,fontWeight:600}}>{t('trees.no_report')}</div>
            <div style={{fontSize:10,color:T.textMut}}>{t('trees.analyze_x_images').replace('x', REPORT_EVERY)}</div>
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {reports.map(r=><ReportCard key={r.id} report={r} onDelete={onDeleteReport} accent={accent} accentLt={accentLt}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function ArbresPlantations() {
  const { t, i18n } = useTranslation();
  const chatEndRef  = useRef(null);
  const isRtl       = i18n.language === 'ar';

  const [history,        setHistory]        = useState([]);
  const [selectedRec,    setSelectedRec]    = useState(null);
  const [plantStats,     setPlantStats]     = useState(null);
  const [recentEvents,   setRecentEvents]   = useState([]);
  const [botOpen,        setBotOpen]        = useState(false);
  const [messages,       setMessages]       = useState([{
    id:1, type:'bot',
    text:'Bonjour ! Je suis PlantBot. Scannez une image et je diagnostique instantanément en Darija.',
    time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),
  }]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [listening,      setListening]      = useState(false);
  const [agronCnt,       setAgronCnt]       = useState(()=>loadCnt('agronomie'));
  const [phytoCnt,       setPhytoCnt]       = useState(()=>loadCnt('phyto'));
  const [agronReps,      setAgronReps]      = useState(()=>loadReps('agronomie'));
  const [phytoReps,      setPhytoReps]      = useState(()=>loadReps('phyto'));
  const [repLoading,     setRepLoading]     = useState({agronomie:false,phyto:false});
  const [sess,           setSess]           = useState({scans:0,detections:0,diseases:0,confSum:0});

  useEffect(()=>{fetchHistory();fetchStats();},[]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:'smooth'});},[messages]);

  const fetchStats = async () => {
    try {
      const [s,e] = await Promise.all([cvAPI.plantStats(), cvAPI.recentPlantEvents(20)]);
      setPlantStats(s.data);
      setRecentEvents(Array.isArray(e.data) ? e.data : []);
    } catch {}
  };
  const fetchHistory = async () => {
    try { const r = await diagnosticAPI.list(); setHistory(r.data); } catch {}
  };

  const generateReport = useCallback(async (group, total) => {
    setRepLoading(p=>({...p,[group]:true}));
    const isPhyto = group === 'phyto';
    const query = isPhyto
      ? `بعد تحليل ${total} صورة فيتو-فيجن (زيتون، حشرات)، اعطيني تقرير بالدارجة التونسية: الأمراض الملاحظة، العلاجات العاجلة.`
      : `بعد تحليل ${total} صورة زراعية (فول، فراولة، طماطم، ليمون، برتقال)، اعطيني تقرير بالدارجة التونسية: الأمراض المكتشفة، خطة العلاج.`;
    try {
      const res = await agentAPI.chat(query, isPhyto?'insects':'leaves');
      const rep = { id:Date.now(), group, text:res.data.response_derja||'Rapport indisponible.', timestamp:new Date().toISOString(), detCount:total };
      const updated = [rep,...loadReps(group)].slice(0,10);
      saveReps(group,updated);
      if(isPhyto) setPhytoReps(updated); else setAgronReps(updated);
    } catch(e){ console.error('report:',e); }
    finally { setRepLoading(p=>({...p,[group]:false})); }
  },[]);

  const deleteReport = (group,id) => {
    const u = loadReps(group).filter(r=>r.id!==id);
    saveReps(group,u);
    if(group==='phyto') setPhytoReps(u); else setAgronReps(u);
  };

  const onAnalyze = useCallback(async (dets, cat, imgData='', isAuto=false) => {
    if(!dets?.length) return;
    const counts  = dets.reduce((a,d)=>{a[d.label]=(a[d.label]||0)+1;return a;},{});
    const summary = Object.entries(counts).map(([l,c])=>`${c} ${l.replace(/_/g,' ')}`).join(', ');
    const avgConf = dets.reduce((s,d)=>s+d.confidence,0)/dets.length;
    const group   = getGroup(cat);
    const newCnt  = loadCnt(group)+1;
    saveCnt(group,newCnt);
    if(group==='agronomie') setAgronCnt(newCnt); else setPhytoCnt(newCnt);
    if(newCnt % REPORT_EVERY === 0) generateReport(group, newCnt);
    setSess(p=>({scans:p.scans+1,detections:p.detections+dets.length,diseases:p.diseases+dets.filter(d=>d.confidence>0.5).length,confSum:p.confSum+avgConf}));

    if(isAuto){
      try {
        await diagnosticAPI.save({category:cat,image_url:imgData,detections:{count:dets.length,types:counts},chat_log:[{type:'bot',text:`Auto: ${summary}.`,time:new Date().toLocaleTimeString()}]});
        fetchHistory();
      } catch(e){ throw e; }
      return;
    }

    setBotOpen(true);
    const query=`J'ai détecté ${summary} sur mes ${cat==='olive'?'oliviers':cat==='insects'?'cultures':cat==='lemon'?'citronniers':cat==='orange'?'orangers':'plantations'}. Quels sont tes conseils ?`;
    const userMsg={id:Date.now(),type:'user',text:query,image:imgData,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
    setMessages(prev=>[...prev,userMsg]); setLoading(true);
    try {
      const res=await agentAPI.chat(query,cat==='olive'||cat==='insects'?'insects':'plant');
      const botMsg={id:Date.now()+1,type:'bot',text:res.data.response_derja||'Erreur.',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
      const log=[...messages,userMsg,botMsg];
      setMessages(log);
      await diagnosticAPI.save({category:cat,image_url:imgData,detections:{count:dets.length,types:counts},chat_log:log});
      fetchHistory();
    } catch {
      setMessages(prev=>[...prev,{id:Date.now()+2,type:'bot',text:'Erreur de connexion.',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}]);
    } finally { setLoading(false); }
  },[messages,generateReport]);

  const handleSend = async () => {
    if(!input.trim()||loading) return;
    const userMsg={id:Date.now(),type:'user',text:input,time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
    setMessages(p=>[...p,userMsg]); setInput(''); setLoading(true);
    try {
      const res=await agentAPI.chat(input,'plant');
      setMessages(p=>[...p,{id:Date.now()+1,type:'bot',text:res.data.response_derja||'Désolé.',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}]);
    } catch {
      setMessages(p=>[...p,{id:Date.now()+2,type:'bot',text:'Erreur.',time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}]);
    } finally { setLoading(false); }
  };

  const startListen = () => {
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    const r=new SR(); r.lang=isRtl?'ar-TN':'fr-FR';
    r.onstart=()=>setListening(true); r.onend=()=>setListening(false);
    r.onresult=e=>setInput(e.results[0][0].transcript); r.start();
  };
  const speak = txt => { const u=new SpeechSynthesisUtterance(txt); u.lang=isRtl?'ar-SA':'fr-FR'; window.speechSynthesis.speak(u); };

  const deleteHistRec = async (id) => {
    if(!window.confirm('Supprimer ce diagnostic ?')) return;
    try { await diagnosticAPI.delete(id); setHistory(p=>p.filter(h=>h.id!==id)); } catch {}
  };

  /* KPIs */
  const totalDets   = (plantStats?.total_detections||0)+sess.detections;
  const totalAlerts = (plantStats?.disease_alerts_7d||0)+sess.diseases;
  const avgConf     = sess.scans>0 ? Math.round(sess.confSum/sess.scans*100) : (plantStats?.avg_confidence_pct||0);
  const agronRem    = REPORT_EVERY-(agronCnt%REPORT_EVERY||REPORT_EVERY);
  const phytoRem    = REPORT_EVERY-(phytoCnt%REPORT_EVERY||REPORT_EVERY);
  const live        = sess.scans > 0;

  const kpis = [
    { label:t('trees.total_detections'),   value:totalDets.toLocaleString(), delta:live?`+${sess.detections} ${t('trees.session')}`:null,                            icon:Activity,     accent:T.green, lt:T.greenLt },
    { label:t('trees.disease_alerts_7d'),  value:String(totalAlerts),        delta:sess.diseases>0?`+${sess.diseases} ${t('trees.active')}`:null,                  icon:AlertCircle,  accent:T.red,   lt:T.redLt   },
    { label:t('trees.agronomy_scans'),    value:String(agronCnt),           delta:agronCnt>0?`${agronRem} ${t('trees.before_report')}`:t('trees.start'),                 icon:Leaf,         accent:T.green, lt:T.greenLt },
    { label:t('trees.phyto_vision_scans'), value:String(phytoCnt),           delta:phytoCnt>0?`${phytoRem} ${t('trees.before_report')}`:t('trees.start'),                icon:Bug,          accent:T.amber, lt:T.amberLt },
    { label:t('trees.avg_ai_confidence'),    value:`${avgConf}%`,              delta:live?`${sess.scans} scan(s)`:null,                                  icon:Target,       accent:T.blue,  lt:T.blueLt  },
  ];

  return (
    <>
      <style>{`
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes breathe { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.06);opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        .arb-scroll::-webkit-scrollbar{width:4px}
        .arb-scroll::-webkit-scrollbar-track{background:#f8fafc}
        .arb-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        .arb-scroll::-webkit-scrollbar-thumb:hover{background:#94a3b8}
      `}</style>

      <Navbar title={t('trees.title')} subtitle={t('trees.subtitle')}/>

      <div style={{background:T.bg,height:'100%',overflowY:'auto',direction:isRtl?'rtl':'ltr'}}>

        {/* ── Hero ───────────────────────────────────────── */}
        <div style={{
          background:'linear-gradient(135deg,#ffffff 0%,#f7fdf9 60%,#fffefa 100%)',
          borderBottom:`1.5px solid ${T.border}`,
          padding:'clamp(14px,3vw,24px) clamp(14px,4vw,40px) 20px',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:-50,right:60,width:220,height:220,borderRadius:'50%',background:`radial-gradient(circle,${T.green}0d 0%,transparent 70%)`,pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:-30,right:280,width:140,height:140,borderRadius:'50%',background:`radial-gradient(circle,${T.amber}0d 0%,transparent 70%)`,pointerEvents:'none'}}/>

          <div style={{maxWidth:1600,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap',position:'relative'}}>
            <div style={{display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:52,height:52,borderRadius:17,background:`linear-gradient(135deg,${T.green},#15803d)`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 8px 22px ${T.green}44`,flexShrink:0}}>
                <TreePine size={26} color="#fff"/>
              </div>
              <div>
                <div style={{fontSize:10,color:T.textMut,textTransform:'uppercase',letterSpacing:2,fontWeight:700,marginBottom:3}}>Smart Farm · Phyto Intelligence</div>
                <h1 style={{margin:0,fontSize:24,fontWeight:900,color:T.textPri,letterSpacing:-0.5}}>{t('trees.agronomy_phyto_vision')}</h1>
                <p style={{margin:'3px 0 0',fontSize:11,color:T.textMut}}>{t('trees.diagnostic_subtitle_full')}</p>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              {[{icon:Globe,label:'YOLO v8'},{icon:Shield,label:'RAG UTAP'},{icon:Sparkles,label:'Labess-7B'}].map(({icon:Ic,label})=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',background:'#ffffff',border:`1.5px solid ${T.border}`,borderRadius:99,fontSize:10,color:T.textSec,fontWeight:700,boxShadow:T.shadow}}>
                  <Ic size={11} color={T.green}/>{label}
                </div>
              ))}
              <button onClick={()=>{fetchStats();fetchHistory();}} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',background:`linear-gradient(135deg,${T.green},#15803d)`,border:'none',borderRadius:99,fontSize:10,color:'#fff',fontWeight:700,cursor:'pointer',boxShadow:`0 4px 12px ${T.green}44`}}>
                <RefreshCw size={11}/> {t('trees.refresh')}
              </button>
            </div>
          </div>
        </div>

        <div style={{maxWidth:1600,margin:'0 auto',padding:'clamp(14px, 3vw, 32px) clamp(14px, 3vw, 32px) 120px'}}>

          {/* ── KPI Row ───────────────────────────────────── */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(185px,1fr))',gap:14,marginBottom:32}}>
            {kpis.map((k,i)=>(
              <div key={i} style={{
                background:T.surface,border:`1.5px solid ${T.border}`,
                borderTop:`3px solid ${k.accent}`,borderRadius:16,
                padding:'18px 20px',boxShadow:T.shadowMd,
                position:'relative',overflow:'hidden',cursor:'default',
                transition:'transform 0.2s,box-shadow 0.2s',
                animation:`slideUp 0.3s ease ${i*0.06}s both`,
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=T.shadowLg;}}
              onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=T.shadowMd;}}
              >
                <div style={{position:'absolute',top:-10,right:-10,width:56,height:56,borderRadius:'50%',background:k.lt,opacity:0.5,pointerEvents:'none'}}/>
                {live&&<div style={{position:'absolute',top:12,right:12,width:6,height:6,borderRadius:'50%',background:k.accent,animation:'pulse 2s infinite'}}/>}
                <div style={{width:36,height:36,borderRadius:10,background:k.lt,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12}}>
                  <k.icon size={18} color={k.accent}/>
                </div>
                <div style={{fontSize:28,fontWeight:900,color:T.textPri,letterSpacing:-1,lineHeight:1}}>{k.value}</div>
                {k.delta&&(
                  <div style={{marginTop:5,display:'inline-block',fontSize:9,color:k.accent,fontWeight:800,background:k.lt,padding:'2px 7px',borderRadius:99,border:`1px solid ${k.accent}33`}}>{k.delta}</div>
                )}
                <div style={{marginTop:8,fontSize:10,color:T.textMut,fontWeight:700,textTransform:'uppercase',letterSpacing:0.6}}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* ── AGRONOMIE (3 scanners) ────────────────────── */}
          <GroupSection
            title={t('trees.agronomy')}
            subtitle={t('trees.agronomy_desc')}
            accent={T.green} accentLt={T.greenLt} icon={Leaf}
            detCount={agronCnt} reports={agronReps} reportLoading={repLoading.agronomie}
            onDeleteReport={id=>deleteReport('agronomie',id)}
            scanners={[
              <ScannerPanel key="leaves"
                title={t('trees.leaf_diseases')}   subtitle="Beans · Strawberry · Tomato"
                category="leaves" accent={T.green} accentLt={T.greenLt} icon={Leaf}
                onAnalyze={onAnalyze}/>,
              <ScannerPanel key="lemon"
                title={t('trees.lemon_diseases')}      subtitle="Lemon leaf pathologies"
                category="lemon"  accent={T.yellow} accentLt={T.yellowLt} icon={Citrus}
                onAnalyze={onAnalyze}/>,
              <ScannerPanel key="orange"
                title={t('trees.orange_diseases')}         subtitle="Orange leaf pathologies"
                category="orange" accent={T.orange} accentLt={T.orangeLt} icon={Citrus}
                onAnalyze={onAnalyze}/>,
            ]}
          />

          {/* ── PHYTO-VISION (2 scanners) ─────────────────── */}
          <GroupSection
            title={t('trees.phyto_vision')}
            subtitle={t('trees.phyto_vision_desc')}
            accent={T.amber} accentLt={T.amberLt} icon={Flower2}
            detCount={phytoCnt} reports={phytoReps} reportLoading={repLoading.phyto}
            onDeleteReport={id=>deleteReport('phyto',id)}
            scanners={[
              <ScannerPanel key="olive"
                title={t('trees.olive_diseases')}    subtitle="Peacock spot · Anthracnose · Psyllid"
                category="olive"   accent={T.amber} accentLt={T.amberLt} icon={Flower2}
                onAnalyze={onAnalyze}/>,
              <ScannerPanel key="insects"
                title={t('trees.insects_pests')}     subtitle="Army worm · Legume beetle · Rice pest"
                category="insects" accent={T.red}   accentLt={T.redLt}   icon={Bug}
                onAnalyze={onAnalyze}/>,
            ]}
          />

          {/* ── Detection Log ─────────────────────────────── */}
          <div style={{background:T.surface,border:`1.5px solid ${T.border}`,borderRadius:18,overflow:'hidden',marginBottom:28,boxShadow:T.shadowMd}}>
            <div style={{padding:'14px 20px',borderBottom:`1.5px solid ${T.border}`,background:T.surfaceAlt,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:T.blueLt,border:`1.5px solid ${T.blue}33`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Activity size={15} color={T.blue}/>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:800,color:T.textPri}}>{t('trees.detection_log')}</div>
                  <div style={{fontSize:9,color:T.textMut}}>{t('trees.detection_log_desc')}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:9,color:T.green,fontWeight:800,background:T.greenLt,padding:'3px 11px',borderRadius:99,border:`1px solid ${T.green}33`}}>
                  <span style={{width:5,height:5,borderRadius:'50%',background:T.green,animation:'pulse 2s infinite'}}/>{t('trees.live')}
                </div>
                <button onClick={fetchStats} style={{display:'flex',alignItems:'center',gap:5,background:T.surface,border:`1.5px solid ${T.border}`,color:T.textSec,borderRadius:9,padding:'5px 12px',cursor:'pointer',fontSize:10,fontWeight:600,boxShadow:T.shadow}}>
                  <RefreshCw size={11}/> {t('trees.refresh_btn')}
                </button>
              </div>
            </div>

            <div className="arb-scroll" style={{padding:14,display:'flex',flexDirection:'column',gap:7,maxHeight:320,overflowY:'auto'}}>
              {!Array.isArray(recentEvents) || recentEvents.length===0 ? (
                <div style={{padding:'32px 0',textAlign:'center',color:T.textMut,fontSize:11,display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <Eye size={28} color={T.textMut} style={{opacity:0.25}}/> {t('trees.no_events')}
                </div>
              ) : recentEvents.map((d,idx)=>{
                const sev=d.severity;
                const sc=sev==='info'?T.green:sev==='warning'?T.amber:T.red;
                const sl=sev==='info'?T.greenLt:sev==='warning'?T.amberLt:T.redLt;
                return (
                  <div key={d.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:`${sl}88`,borderRadius:10,border:`1px solid ${sc}22`,animation:`fadeIn 0.25s ease ${idx*0.02}s both`}}>
                    <div style={{width:32,height:32,borderRadius:9,background:sl,border:`1.5px solid ${sc}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {d.camera_id==='insects'?<Bug size={14} color={sc}/>:<TreePine size={14} color={sc}/>}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.textPri,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(d.object_class||'').replace(/_/g,' ')}</div>
                      <div style={{fontSize:9,color:T.textMut,marginTop:1}}>{d.confidence?(d.confidence*100).toFixed(0)+'% conf.':''} · {d.camera_id} · {d.timestamp?new Date(d.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</div>
                    </div>
                    <span style={{fontSize:8,padding:'2px 10px',borderRadius:99,background:sc,color:'#fff',fontWeight:800,textTransform:'uppercase',letterSpacing:0.7,flexShrink:0}}>
                      {sev==='info'?t('trees.healthy'):sev==='warning'?t('trees.alert'):t('trees.critical')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Diagnostic History ────────────────────────── */}
          <div style={{marginBottom:80}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
              <div style={{width:38,height:38,borderRadius:11,background:T.blueLt,border:`1.5px solid ${T.blue}33`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <History size={17} color={T.blue}/>
              </div>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:T.textPri}}>{t('trees.analysis_history')}</div>
                <div style={{fontSize:10,color:T.textMut}}>{history.length} analyse(s) sauvegardée(s)</div>
              </div>
            </div>

            {history.length===0 ? (
              <div style={{padding:'40px 0',textAlign:'center',background:T.surface,borderRadius:18,border:`2px dashed ${T.border}`,color:T.textMut,fontSize:11,display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                <ImageIcon size={32} color={T.textMut} style={{opacity:0.25}}/> {t('trees.no_analysis')}
              </div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
                {history.map((h,idx)=>{
                  const ac = AGRONOMIE_CATS.includes(h.category)?T.green:T.amber;
                  const al = AGRONOMIE_CATS.includes(h.category)?T.greenLt:T.amberLt;
                  return (
                    <div key={h.id} style={{
                      background:T.surface,border:`1.5px solid ${T.border}`,
                      borderRadius:16,overflow:'hidden',boxShadow:T.shadowMd,
                      transition:'transform 0.2s,box-shadow 0.2s',
                      animation:`slideUp 0.28s ease ${idx*0.035}s both`,
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=T.shadowLg;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow=T.shadowMd;}}
                    >
                      <div style={{height:140,background:'#0f172a',position:'relative',overflow:'hidden'}}>
                        {h.image_url
                          ?<img src={h.image_url} alt="diag" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',backgroundImage:`linear-gradient(${ac}10 1px,transparent 1px),linear-gradient(90deg,${ac}10 1px,transparent 1px)`,backgroundSize:'24px 24px'}}>
                            <ImageIcon size={30} color="#475569" style={{opacity:0.35}}/>
                          </div>
                        }
                        <div style={{position:'absolute',top:8,left:8,fontSize:8,padding:'2px 9px',borderRadius:99,background:`${ac}ee`,color:'#fff',fontWeight:900,letterSpacing:0.8,textTransform:'uppercase'}}>{h.category}</div>
                        <div style={{position:'absolute',top:8,right:8,background:'rgba(0,0,0,0.65)',padding:'2px 7px',borderRadius:6,color:'#e2e8f0',fontSize:8}}>{new Date(h.timestamp).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div style={{padding:'11px 13px'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                          <div style={{fontSize:12,fontWeight:800,color:ac}}>{h.category.toUpperCase()}</div>
                          <div style={{fontSize:9,color:T.textMut}}>{h.detections?.count||0} déts.</div>
                        </div>
                        <div style={{display:'flex',gap:7}}>
                          <button onClick={()=>setSelectedRec(h)} style={{flex:1,height:34,fontSize:11,background:al,border:`1.5px solid ${ac}44`,color:ac,borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,fontWeight:700,transition:'background 0.2s'}}
                            onMouseEnter={e=>e.currentTarget.style.background=`${ac}22`} onMouseLeave={e=>e.currentTarget.style.background=al}>
                            <Maximize2 size={12}/> Détails
                          </button>
                          <button onClick={()=>deleteHistRec(h.id)} style={{width:34,height:34,background:T.redLt,border:`1.5px solid ${T.red}33`,color:T.red,borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.2s'}}
                            onMouseEnter={e=>e.currentTarget.style.background='#fecaca'} onMouseLeave={e=>e.currentTarget.style.background=T.redLt}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Zoom Modal ────────────────────────────────── */}
        {selectedRec && (
          <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.72)',backdropFilter:'blur(10px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn 0.2s ease'}}>
            <div style={{width:'100%',maxWidth:900,height:'min(88vh, 100%)',display:'flex',flexDirection:'column',background:T.surface,borderRadius:22,overflow:'hidden',border:`1.5px solid ${T.border}`,boxShadow:`0 40px 80px rgba(0,0,0,0.28)`}}>
              <div style={{padding:'14px 22px',borderBottom:`1.5px solid ${T.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:T.surfaceAlt}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:32,height:32,borderRadius:9,background:T.blueLt,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <History size={14} color={T.blue}/>
                  </div>
                  <div>
                    <div style={{fontSize:14,fontWeight:800,color:T.textPri}}>Détails de l'Analyse</div>
                    <div style={{fontSize:9,color:T.textMut}}>{new Date(selectedRec.timestamp).toLocaleString('fr-FR')}</div>
                  </div>
                </div>
                <button onClick={()=>setSelectedRec(null)} style={{background:T.surfaceAlt,border:`1.5px solid ${T.border}`,color:T.textSec,cursor:'pointer',width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e=>e.currentTarget.style.background=T.surfaceAlt}>
                  <X size={14}/>
                </button>
              </div>
              <div style={{flex:1,display:'grid',gridTemplateColumns:'1.3fr 1fr',overflow:'hidden'}}>
                <div style={{background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',borderRight:`1.5px solid ${T.border}`}}>
                  {selectedRec.image_url&&<img src={selectedRec.image_url} alt="zoom" style={{maxWidth:'100%',maxHeight:'100%',objectFit:'contain'}}/>}
                </div>
                <div className="arb-scroll" style={{padding:22,overflowY:'auto',background:T.surfaceAlt,display:'flex',flexDirection:'column',gap:18}}>
                  <div>
                    <div style={{fontSize:9,textTransform:'uppercase',color:T.green,letterSpacing:1.5,fontWeight:800,marginBottom:10}}>Détections</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                      {Object.entries(selectedRec.detections?.types||{}).map(([l,c])=>(
                        <div key={l} style={{padding:'5px 12px',background:T.greenLt,border:`1.5px solid ${T.green}44`,borderRadius:9,fontSize:11,fontWeight:700,color:T.textSec}}>
                          {l.replace(/_/g,' ')} <span style={{color:T.green}}>×{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,textTransform:'uppercase',color:T.blue,letterSpacing:1.5,fontWeight:800,marginBottom:10}}>Discussion PlantBot</div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {(selectedRec.chat_log||[]).map((msg,i)=>(
                        <div key={i} style={{display:'flex',gap:8,flexDirection:msg.type==='user'?'row-reverse':'row'}}>
                          <div style={{width:26,height:26,borderRadius:'50%',background:msg.type==='user'?T.green:'#ffffff',border:`1.5px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {msg.type==='user'?<User size={12} color="#fff"/>:<Bot size={12} color={T.green}/>}
                          </div>
                          <div style={{padding:'9px 12px',borderRadius:12,fontSize:12,background:msg.type==='user'?T.green:'#ffffff',color:msg.type==='user'?'#fff':T.textSec,border:`1.5px solid ${T.border}`,flex:1,lineHeight:1.6}}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,paddingTop:14,borderTop:`1.5px solid ${T.border}`}}>
                    <button onClick={()=>{setBotOpen(true);setMessages(selectedRec.chat_log||[]);setSelectedRec(null);}} style={{flex:1,height:40,background:`linear-gradient(135deg,${T.green},#15803d)`,border:'none',color:'#fff',borderRadius:11,cursor:'pointer',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:7,boxShadow:`0 4px 12px ${T.green}44`}}>
                      <Bot size={13}/> Relancer Discussion
                    </button>
                    <button onClick={()=>{deleteHistRec(selectedRec.id);setSelectedRec(null);}} style={{width:40,height:40,background:T.redLt,border:`1.5px solid ${T.red}33`,color:T.red,borderRadius:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PlantBot ─────────────────────────────────── */}
        {botOpen ? (
          <div style={{
            position:'fixed',bottom:16,right:16,width:'min(380px, calc(100vw - 32px))',height:'min(540px,80dvh)',zIndex:1000,
            display:'flex',flexDirection:'column',
            background:T.surface, borderRadius:20, overflow:'hidden',
            border:`1.5px solid ${T.green}44`,
            boxShadow:`0 20px 56px rgba(0,0,0,0.16),0 0 0 1px ${T.green}18`,
            animation:'slideUp 0.28s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{padding:'13px 16px',background:`linear-gradient(135deg,${T.green},#15803d)`,display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:-28,right:-16,width:90,height:90,borderRadius:'50%',background:'rgba(255,255,255,0.08)',pointerEvents:'none'}}/>
              <div style={{display:'flex',alignItems:'center',gap:10,position:'relative'}}>
                <div style={{width:34,height:34,borderRadius:10,background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Bot size={18} color="#fff"/>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>PlantBot</div>
                  <div style={{fontSize:8,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:1.5,fontWeight:700}}>Expert Phyto · Darija + FR</div>
                </div>
              </div>
              <button onClick={()=>setBotOpen(false)} style={{background:'rgba(255,255,255,0.18)',border:'none',color:'#fff',cursor:'pointer',width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <X size={13}/>
              </button>
            </div>

            <div className="arb-scroll" style={{flex:1,padding:'12px 10px',overflowY:'auto',display:'flex',flexDirection:'column',gap:10,background:T.surfaceAlt}}>
              {messages.map(msg=>(
                <div key={msg.id} style={{alignSelf:msg.type==='user'?'flex-end':'flex-start',maxWidth:'86%',display:'flex',gap:7,flexDirection:msg.type==='user'?'row-reverse':'row',animation:'slideUp 0.18s ease'}}>
                  <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,background:msg.type==='user'?`linear-gradient(135deg,${T.green},#15803d)`:'#ffffff',border:`1.5px solid ${msg.type==='bot'?T.border:'transparent'}`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:T.shadow}}>
                    {msg.type==='user'?<User size={12} color="#fff"/>:<Bot size={12} color={T.green}/>}
                  </div>
                  <div style={{padding:'9px 12px',borderRadius:msg.type==='user'?'14px 3px 14px 14px':'3px 14px 14px 14px',fontSize:12,background:msg.type==='user'?`linear-gradient(135deg,${T.green},#15803d)`:'#ffffff',color:msg.type==='user'?'#fff':T.textSec,border:msg.type==='bot'?`1.5px solid ${T.border}`:'none',lineHeight:1.65,boxShadow:T.shadow}}>
                    {msg.image&&<img src={msg.image} alt="scan" style={{width:'100%',borderRadius:7,marginBottom:5,border:`1px solid ${T.border}`}}/>}
                    {msg.text}
                    {msg.type==='bot'&&<button onClick={()=>speak(msg.text)} style={{background:'none',border:'none',marginLeft:7,cursor:'pointer',opacity:0.4,verticalAlign:'middle',color:T.green}}><Volume2 size={10}/></button>}
                  </div>
                </div>
              ))}
              {loading&&(
                <div style={{alignSelf:'flex-start',padding:'9px 14px',borderRadius:'3px 14px 14px 14px',background:'#ffffff',border:`1.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:9}}>
                  <Loader2 size={12} color={T.green} style={{animation:'spin 1s linear infinite'}}/>
                  <span style={{fontSize:11,color:T.textMut,fontStyle:'italic'}}>Analyse…</span>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            <div style={{padding:'9px 10px 12px',background:'#ffffff',borderTop:`1.5px solid ${T.border}`}}>
              <div style={{display:'flex',gap:7,background:T.surfaceAlt,border:`1.5px solid ${T.border}`,borderRadius:12,padding:'5px 7px',alignItems:'center'}}
                onFocusCapture={e=>{e.currentTarget.style.borderColor=`${T.green}66`;e.currentTarget.style.boxShadow=`0 0 0 3px ${T.green}12`;}}
                onBlurCapture={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow='none';}}>
                <button onClick={startListen} style={{width:30,height:30,borderRadius:8,background:listening?T.greenLt:'#f1f5f9',border:listening?`1.5px solid ${T.green}44`:`1.5px solid ${T.border}`,color:listening?T.green:T.textMut,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {listening?<MicOff size={13}/>:<Mic size={13}/>}
                </button>
                <input type="text" placeholder="Posez votre question…" value={input} onChange={e=>setInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleSend()} style={{flex:1,background:'none',border:'none',outline:'none',color:T.textPri,fontSize:12,fontFamily:'inherit'}}/>
                <button onClick={handleSend} disabled={loading||!input.trim()} style={{width:30,height:30,borderRadius:8,background:input.trim()?`linear-gradient(135deg,${T.green},#15803d)`:'#e2e8f0',border:'none',color:input.trim()?'#fff':T.textMut,cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:input.trim()?`0 3px 10px ${T.green}44`:'none',transition:'all 0.2s'}}>
                  <Send size={13}/>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={()=>setBotOpen(true)} style={{
            position:'fixed',bottom:30,right:30,
            width:56,height:56,
            background:`linear-gradient(135deg,${T.green},#15803d)`,
            borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
            color:'white',border:'none',cursor:'pointer',zIndex:100,
            boxShadow:`0 8px 26px ${T.green}55`,
            transition:'transform 0.3s cubic-bezier(.175,.885,.32,1.275)',
          }}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.12)'}
          onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            <span style={{position:'absolute',width:'100%',height:'100%',borderRadius:'50%',background:T.green,opacity:0.25,animation:'pulse 2s infinite'}}/>
            <Bot size={22}/>
          </button>
        )}
      </div>
    </>
  );
}
