import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, CheckSquare, MapPin, BarChart2, Shield, Heart, Globe, Cpu, ChevronRight, Smartphone, Layers, LayoutDashboard } from 'lucide-react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* --- Navbar --- */}
      <nav className="landing-nav">
        <div className="landing-nav-container">
          <div className="landing-logo">
            <Leaf className="landing-logo-icon" size={28} />
            <span className="landing-logo-text">SMART FARM AI</span>
          </div>
          
          <div className="landing-nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#how-it-works">Comment ça marche</a>
            <a href="#pricing">Tarifs</a>
          </div>

          <div className="landing-nav-actions">
            <div className="landing-lang">
              <Globe size={18} /> FR
            </div>
            <Link to="/login" className="landing-link-login">Connexion</Link>
            <Link to="/register" className="landing-btn-primary">Commencer</Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1 className="landing-hero-title">
            L'Intelligence au Service de <span className="text-primary">l'Agriculture</span>
          </h1>
          <p className="landing-hero-subtitle">
            La plateforme SaaS de nouvelle génération conçue pour révolutionner la gestion du bétail, le suivi des cultures et la rentabilité de votre exploitation.
          </p>
          <div className="landing-hero-actions">
            <Link to="/register" className="landing-btn-primary large">
              Commencer Gratuitement <ChevronRight size={20} />
            </Link>
            <Link to="/login" className="landing-btn-outline large">Accéder au Dashboard <LayoutDashboard size={20} style={{ marginLeft: 6 }} /></Link>
          </div>
          <div className="landing-hero-trust">
            <div className="stars">
              <span className="text-primary" style={{ fontSize: 20 }}>★ ★ ★ ★ ★</span>
            </div>
            <span>Approuvé par les agriculteurs pionniers</span>
          </div>
        </div>
        <div className="landing-hero-illustration">
          {/* Abstract Nodes/Farm Illustration */}
          <div className="circle-grid">
            <div className="connector-line" style={{ top: '15px', left: '50%', width: '150px', height: '160px', borderLeft: 'none', borderBottom: 'none', transform: 'translateX(-50%)' }}></div>
            
            <div className="circle-node node-1"><Leaf size={32} /></div>
            <div className="circle-node node-2"><Cpu size={28} /></div>
            <div className="circle-node node-3"><BarChart2 size={28} /></div>
            <div className="circle-node node-4"><MapPin size={28} /></div>
            <div className="circle-node node-5"><Heart size={28} /></div>
            
            <div className="circle-node node-center"><Layers size={48} /></div>
          </div>
        </div>
      </section>

      {/* --- Features Section --- */}
      <section id="features" className="landing-features">
        <div className="section-pill">FONCTIONNALITÉS</div>
        <h2 className="section-title">Tout ce qu'il vous faut pour gérer votre exploitation agricole</h2>
        <p className="section-subtitle">
          Des visites de terrain au suivi de production — tout dans une seule plateforme robuste.
        </p>

        <div className="features-grid">
          <FeatureCard 
            icon={<Leaf size={24} />} 
            title="Gestion des Fermes" 
            desc="Suivez chaque unité avec nos capteurs environnementaux. Les indicateurs visuels de santé (vert/orange/rouge) procurent un aperçu instantané."
          />
          <FeatureCard 
            icon={<CheckSquare size={24} />} 
            title="Visites de Terrain" 
            desc="Enregistrement 100% visuel. Aucun clavier nécessaire — tapez pour inspecter en quelques minutes directement depuis votre smartphone."
          />
          <FeatureCard 
            icon={<MapPin size={24} />} 
            title="Monitoring GPS" 
            desc="Cartographiez tous vos emplacements. Suivez les déplacements saisonniers et l'allocation des surfaces d'exploitation."
          />
          <FeatureCard 
            icon={<BarChart2 size={24} />} 
            title="Suivi de Production" 
            desc="Enregistrez les récoltes (lait, miel, viande) par zone. Surveillez les rendements et projetez les tendances via notre IA."
          />
          <FeatureCard 
            icon={<Shield size={24} />} 
            title="Télémesure Sécurisée" 
            desc="Le monitoring basé sur MQTT garantit une remontée des métriques vitaux avec une latence minimale et une haute sécurité."
          />
          <FeatureCard 
            icon={<Cpu size={24} />} 
            title="Intelligence Vision" 
            desc="La détection d'objets avec YOLO permet le suivi automatisé du bétail, la détection des maladies et l'analyse de comportement."
          />
          <FeatureCard 
            icon={<Heart size={24} />} 
            title="Moteur de Santé" 
            desc="Score de santé automatique du bétail basé sur la télémétrie. Détectez les anomalies avant qu'elles ne deviennent des problèmes."
          />
          <FeatureCard 
            icon={<Globe size={24} />} 
            title="Multi-Langues" 
            desc="Support complet pour le Français, l'Anglais et l'Arabe avec interface RTL intégrale."
          />
        </div>
      </section>

      {/* --- How it works Section --- */}
      <section id="how-it-works" className="landing-steps">
        <div className="section-pill">COMMENT ÇA MARCHE</div>
        <h2 className="section-title">Comment fonctionne SMART FARM</h2>
        <p className="section-subtitle">Trois étapes simples pour bâtir une exploitation connectée.</p>

        <div className="steps-container">
          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">1</div>
              <Smartphone size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Déployez vos Capteurs</h3>
            <p>Ajoutez vos fermes sur l'interface et configurez vos modules IoT et caméras IA sur les zones de pâturage.</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>

          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">2</div>
              <Cpu size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Collecte Automatique</h3>
            <p>Laissez nos algorithmes collecter, analyser et traiter les images des caméras et la télémétrie environnementale 24h/24.</p>
          </div>
          <div className="step-arrow"><ChevronRight size={24} color="var(--color-primary)" /></div>

          <div className="step-item">
            <div className="step-circle">
              <div className="step-number">3</div>
              <BarChart2 size={48} color="var(--color-primary)" strokeWidth={1} />
            </div>
            <h3>Pilotez et Anticipez</h3>
            <p>Exploitez nos tableaux de bord de santé prédictifs et rapports de production pour optimiser vos rendements.</p>
          </div>
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section id="pricing" className="landing-pricing">
        <div className="section-pill">TARIFS</div>
        <h2 className="section-title">Tarification Simple et Transparente</h2>
        <p className="section-subtitle">Commencez gratuitement. Passez au niveau supérieur quand l'exploitation s'agrandit.</p>

        <div className="pricing-grid">
          <div className="pricing-card">
            <h4>Initiation</h4>
            <div className="price">Gratuit<span className="month">//mois</span></div>
            <p className="price-desc">Pour les petites structures et la découverte</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Jusqu'à 50 animaux statiques</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> 1 utilisateur</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Tableaux de bord de base</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Historique 14 jours</li>
            </ul>
            <Link to="/register" className="landing-btn-outline w-full">Créer un compte</Link>
          </div>

          <div className="pricing-card popular">
            <div className="popular-badge">⚡ Le plus populaire</div>
            <h4>Professionnel</h4>
            <div className="price">29€<span className="month">//mois</span></div>
            <p className="price-desc">Pour les agriculteurs modernes connectés</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Données en temps-réel illimitées</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Jusqu'à 5 équipes</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Analyse prédictive IA</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Exports avancés Excel/PDF</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Support prioritaire intégré</li>
            </ul>
            <Link to="/register" className="landing-btn-primary w-full">Essayer l'offre Pro</Link>
          </div>

          <div className="pricing-card">
            <h4>Entreprise</h4>
            <div className="price">Sur mesure</div>
            <p className="price-desc">Pour les coopératives et larges domaines</p>
            <ul className="price-features">
              <li><CheckSquare size={16} color="var(--color-primary)" /> Modèles Computer Vision Custom</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Acteurs illimités</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Accès strict API & Webhooks</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Serveur local / Souveraineté</li>
              <li><CheckSquare size={16} color="var(--color-primary)" /> Account Manager Dédié</li>
            </ul>
            <button className="landing-btn-outline w-full">Contacter nos experts</button>
          </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="landing-cta">
        <div className="cta-container">
          <h2>Prêt à numériser votre agriculture ?</h2>
          <p>Rejoignez un réseau de spécialistes qui utilisent SMART FARM pour une gestion durable et optimisée.</p>
          <Link to="/register" className="landing-btn-white large">
            Commencer l'Essai Gratuit <ChevronRight size={20} />
          </Link>
          
          <div className="cta-bg-shapes">
             <div className="cta-circle cta-circle-1"></div>
             <div className="cta-circle cta-circle-2"></div>
             <div className="cta-circle cta-circle-3"></div>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col brand">
            <div className="landing-logo white">
              <Leaf className="landing-logo-icon" size={24} />
              <span>SMART FARM AI</span>
            </div>
            <p>La plateforme souveraine d'intelligence agronomique pour moderniser et accompagner vos parcelles au quotidien.</p>
            <div className="secure-badge">
              <Shield size={16} color="#fbbf24" /> Données 100% Chiffrées de bout-en-bout
            </div>
          </div>
          <div className="footer-col">
            <h4>PRODUIT</h4>
            <a href="#features">Moteur IA</a>
            <a href="#pricing">Tarification</a>
            <a href="#how-it-works">Télémétrie</a>
            <a href="#">Mises à jour</a>
          </div>
          <div className="footer-col">
            <h4>ENTREPRISE</h4>
            <a href="#">Notre Mission</a>
            <a href="#">Recherche & Développement</a>
            <a href="#">Carrières</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-col">
            <h4>LÉGAL</h4>
            <a href="#">Confidentialité</a>
            <a href="#">CGU</a>
            <a href="#">Souveraineté des Données</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 SMART FARM AI Enterprise. Tous droits réservés. Construit par <strong>InTech Solutions</strong>.</p>
          <div className="footer-langs">
            <a href="#">English</a>
            <a href="#" className="active">Français</a>
            <a href="#">العربية</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card">
      <div className="feature-icon-wrapper">
        {icon}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}
