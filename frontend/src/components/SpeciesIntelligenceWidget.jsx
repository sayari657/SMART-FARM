import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, LineChart, Line, ComposedChart } from 'recharts';
import { Activity, Heart, ShieldAlert, ThermometerSun, AlertTriangle, TrendingUp, Sparkles, Feather, Droplets } from 'lucide-react';

export default function SpeciesIntelligenceWidget({ species, color }) {
  const data = useMemo(() => {
    switch(species) {
      case 'cow':
        return {
          title: "Intelligence Laitière & Troupeau",
          chartTitle: "Prévision Courbe de Lactation (305j)",
          chartData: [
            { day: 'J0', real: 0, pred: 0 },
            { day: 'J40', real: 28, pred: 30 },
            { day: 'J90', real: 35, pred: 36 },
            { day: 'J150', real: 25, pred: 24 },
            { day: 'J220', real: 18, pred: 18 },
            { day: 'J305', real: 0, pred: 0 },
          ],
          cards: [
            {
              icon: <ThermometerSun size={20}/>,
              title: "Indice Stress Thermique (THI)",
              subtitle: "THI Actuel: 72 (Modéré)",
              statusColor: "#f59e0b",
              bg: "#fef3c7",
              insight: "Alerte IA: Baisse possible de 1.2L/vache. Assurez la ventilation et l'accès à l'eau."
            },
            {
              icon: <Heart size={20}/>,
              title: "Assistant IA Reproduction",
              subtitle: "Prédiction Prochain Oestrus",
              statusColor: "#10b981",
              bg: "#d1fae5",
              insight: "Insight: 3 vaches (#102, #108) présentent une activité élevée. Fenêtre IA: Prochaines 12h."
            }
          ]
        };
      case 'sheep':
        return {
          title: "Analytique Troupeau & Laine",
          chartTitle: "Production de Laine & Qualité Mensuelle",
          chartData: [
            { month: 'Jan', prod: 1.2, qual: 88 },
            { month: 'Fév', prod: 1.4, qual: 90 },
            { month: 'Mar', prod: 1.6, qual: 92 },
            { month: 'Avr', prod: 2.1, qual: 95 },
            { month: 'Mai', prod: 2.4, qual: 94 },
          ],
          cards: [
            {
              icon: <TrendingUp size={20}/>,
              title: "Prédiction Agnelage",
              subtitle: "Précision Modèle: 96%",
              statusColor: color,
              bg: `${color}15`,
              insight: "Insight: Pic d'agnelage attendu entre le 14 et 18 Mars. Préparez 12 box supplémentaires."
            },
            {
              icon: <ShieldAlert size={20}/>,
              title: "Risque Parasitaire (Météo)",
              subtitle: "Indice de Risque: Élevé",
              statusColor: "#ef4444",
              bg: "#fee2e2",
              insight: "Alerte IA: Humidité forte sur la parcelle B. Rotation de pâturage conseillée d'ici 48h."
            }
          ]
        };
      case 'goat':
        return {
          title: "Adaptabilité Caprine & Lait",
          chartTitle: "Activité de Pâturage (Gps/Comportement)",
          chartData: [
            { hour: '06h', broute: 20, grimpe: 5 },
            { hour: '10h', broute: 80, grimpe: 45 },
            { hour: '14h', broute: 40, grimpe: 15 },
            { hour: '18h', broute: 70, grimpe: 60 },
            { hour: '20h', broute: 10, grimpe: 0 },
          ],
          cards: [
            {
              icon: <Activity size={20}/>,
              title: "Score Comportement Pâturage",
              subtitle: "Moyenne Troupeau: 8.4/10",
              statusColor: "#10b981",
              bg: "#d1fae5",
              insight: "Analyse: L'activité d'escalade est optimale. Résistance à l'effort excellente aujourd'hui."
            },
            {
              icon: <Droplets size={20}/>,
              title: "Qualité Lait (TB/TP)",
              subtitle: "Tendances Profil",
              statusColor: color,
              bg: `${color}15`,
              insight: "Prédiction: Le rendement fromager devrait augmenter de 3% avec la nouvelle ration riche en fibres."
            }
          ]
        };
      case 'rabbit':
        return {
          title: "Reproduction Cunicole & Environnement",
          chartTitle: "Prévision Cycle de Reproduction (Mise-bas)",
          chartData: [
            { week: 'Sem 1', nés: 45, sevrés: 42 },
            { week: 'Sem 2', nés: 52, sevrés: 48 },
            { week: 'Sem 3', nés: 60, sevrés: 55 },
            { week: 'Sem 4', nés: 58, sevrés: 0 }, // Future
          ],
          cards: [
            {
              icon: <AlertTriangle size={20}/>,
              title: "Sensibilité Thermique Cages",
              subtitle: "Zone B : Risque",
              statusColor: "#ef4444",
              bg: "#fee2e2",
              insight: "Alerte IA: La température de la Rangée B approche 28°C. Risque de mortalité des lapereaux (+15%)."
            },
            {
              icon: <Sparkles size={20}/>,
              title: "Optimisation Hygiène",
              subtitle: "Score Sanitaire: 92%",
              statusColor: "#0ea5e9",
              bg: "#e0f2fe",
              insight: "Insight: Faible risque d'entéropathie détecté. Maintenez le protocole de nettoyage actuel."
            }
          ]
        };
      default: return null;
    }
  }, [species, color]);

  if (!data) return null;

  return (
    <div className="ap-f2" style={{marginBottom:32}}>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
        <Sparkles color={color} size={22} />
        <h3 style={{margin:0, fontSize:18, fontWeight:800, color:'var(--color-text-1)'}}>{data.title}</h3>
      </div>
      
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20}}>
        {/* Main Chart */}
        <div className="card" style={{display:'flex', flexDirection:'column'}}>
          <div style={{fontWeight:800, marginBottom:16, color:'var(--color-text-2)', fontSize:13}}>{data.chartTitle}</div>
          <div style={{height:220, flex:1}}>
            <ResponsiveContainer width="100%" height="100%">
              {species === 'cow' ? (
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="cowColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <Tooltip cursor={{stroke:'rgba(0,0,0,0.1)'}} contentStyle={{borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Area type="monotone" dataKey="pred" name="Prévision IA" stroke="#94a3b8" strokeDasharray="5 5" fill="none" />
                  <Area type="monotone" dataKey="real" name="Production" stroke={color} fillOpacity={1} fill="url(#cowColor)" strokeWidth={3} />
                </AreaChart>
              ) : species === 'sheep' ? (
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <Tooltip cursor={{fill:'var(--color-surface-2)'}} contentStyle={{borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Bar yAxisId="left" dataKey="prod" name="Laine (T)" fill={color} radius={[4,4,0,0]} />
                  <Line yAxisId="right" type="monotone" dataKey="qual" name="Qualité Index" stroke="#10b981" strokeWidth={3} />
                </BarChart>
              ) : species === 'goat' ? (
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="goat1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.4}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient>
                    <linearGradient id="goat2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <Tooltip />
                  <Area type="monotone" dataKey="broute" name="Broutage" stroke={color} fill="url(#goat1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="grimpe" name="Escalade" stroke="#f59e0b" fill="url(#goat2)" strokeWidth={2} />
                </AreaChart>
              ) : (
                <ComposedChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize:11}} />
                  <Tooltip cursor={{fill:'var(--color-surface-2)'}} contentStyle={{borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Bar dataKey="nés" name="Lapereaux Nés" fill={color} radius={[4,4,0,0]} barSize={20} />
                  <Line type="monotone" dataKey="sevrés" name="Sevrés" stroke="#10b981" strokeWidth={3} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Metric Cards */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          {data.cards.map((c, i) => (
            <div key={i} className="card" style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center', borderLeft:`4px solid ${c.statusColor}`}}>
              <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:12}}>
                <div style={{background:c.bg, color:c.statusColor, padding:10, borderRadius:10}}>
                  {c.icon}
                </div>
                <div>
                  <div style={{fontWeight:800, fontSize:14, color:'var(--color-text-1)'}}>{c.title}</div>
                  <div style={{fontSize:12, color:'var(--color-text-3)'}}>{c.subtitle}</div>
                </div>
              </div>
              <div style={{
                background:'var(--color-surface-2)', borderRadius:8, padding:12, 
                fontSize:12, color:'var(--color-text-2)', lineHeight:1.5
              }}>
                <Sparkles size={12} color={c.statusColor} style={{marginRight:6, verticalAlign:'middle'}} />
                {c.insight}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
