import React, { useState, useMemo, useCallback } from 'react';
import { Search, ExternalLink, X, Tag, ShoppingBag, Plus, Minus } from 'lucide-react';

const BASE = 'https://apiculture-haddad.com/wp-content/uploads/';

export const CATALOGUE = [
  {
    id: 'bois', label: 'Bois & Ruches', emoji: '🏠', color: '#92400e',
    products: [
      { name: 'Cadre en Bois', price: 1.40, img: BASE+'2026/01/Cadre-en-bois-300x300.png', url: 'https://apiculture-haddad.com/product/cadre-en-bois/' },
      { name: 'Cadre en plastique', price: 3.00, img: BASE+'2026/01/Cadre-Plastique-300x300.png', url: 'https://apiculture-haddad.com/product/cadre-en-plastique/' },
      { name: "Cadre Cire d'abeille", price: 3.50, img: BASE+'2026/01/Cadre-cire-dabeille-300x300.png', url: 'https://apiculture-haddad.com/product/2482/' },
      { name: 'Couvre cadre', price: 7.00, img: BASE+'2026/01/Couvre-cadre-1-300x300.png', url: 'https://apiculture-haddad.com/product/couvre-cadre/' },
      { name: 'Plateau Plastique', price: 12.00, img: BASE+'2026/01/Plateau-plastic-300x300.png', url: 'https://apiculture-haddad.com/product/plateau-plastic/' },
      { name: 'Toit Tôlé', price: 17.00, img: BASE+'2026/01/Toit-Tole-300x300.png', url: 'https://apiculture-haddad.com/product/2480/' },
      { name: 'Hausse vide', price: 28.00, img: BASE+'2026/01/Hausse-vide-300x300.png', url: 'https://apiculture-haddad.com/product/hausse-vide/' },
      { name: 'Ruchette Polystyrène', price: 30.00, img: BASE+'2026/01/Ruchette-polystyrene--300x300.png', url: 'https://apiculture-haddad.com/product/ruchette-polystyrene/' },
      { name: 'Hausse Avec Cadres', price: 38.00, img: BASE+'2026/01/Hausse-Avec-Cadres-300x300.png', url: 'https://apiculture-haddad.com/product/hausse-avec-cadres/' },
      { name: 'Ruchette Bois', price: 45.00, img: BASE+'2026/01/Ruchette-bois-300x300.png', url: 'https://apiculture-haddad.com/product/ruchette-bois/' },
      { name: 'Ruche complet', price: 68.00, img: BASE+'2026/01/Ruche-complet-300x300.png', url: 'https://apiculture-haddad.com/product/ruche-complet/' },
    ],
  },
  {
    id: 'tenues', label: 'Tenues de travail', emoji: '👔', color: '#1d4ed8',
    products: [
      { name: 'Masque Carré', price: 10.00, img: BASE+'2026/01/Masque-Carre-300x300.png', url: 'https://apiculture-haddad.com/product/masque-carre/' },
      { name: 'Masque Rond', price: 15.00, img: BASE+'2026/01/Masque-Rond-300x300.png', url: 'https://apiculture-haddad.com/product/masque-rond/' },
      { name: 'Gant Local Souple', price: 15.00, img: BASE+'2025/12/gant-local-300x300.png', url: 'https://apiculture-haddad.com/product/gant-local-souple/' },
      { name: 'Gants Importés', price: 20.00, img: BASE+'2026/01/Botte-Tunisienne-1-300x300.png', url: 'https://apiculture-haddad.com/product/gants-importes/' },
      { name: 'Masque Pro', price: 25.00, img: BASE+'2025/12/masque-pro-300x300.png', url: 'https://apiculture-haddad.com/product/masque-pro/' },
      { name: 'Combinaison', price: 25.00, img: BASE+'2025/12/combinaison-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison/' },
      { name: 'Demi Combinaison Standard', price: 25.00, img: BASE+'2026/01/Demi-Combinaison-Standard-Blanche-300x300.png', url: 'https://apiculture-haddad.com/product/demi-combinaison-standard-blanche/' },
      { name: 'Botte', price: 30.00, img: BASE+'2025/12/bottes-300x300.png', url: 'https://apiculture-haddad.com/product/botte/' },
      { name: 'Botte Tunisienne', price: 30.00, img: BASE+'2026/01/Bottes-300x300.png', url: 'https://apiculture-haddad.com/product/botte-tunisienne/' },
      { name: 'Gant Pro', price: 30.00, img: BASE+'2025/12/gant-pro-scaled-300x300.png', url: 'https://apiculture-haddad.com/product/gant-pro/' },
      { name: 'Demi Combinaison Grand Taille', price: 30.00, img: BASE+'2026/01/demi-Combinaison-grand-taille-blanche--300x300.png', url: 'https://apiculture-haddad.com/product/demi-combinaison-grand-taille-blanche/' },
      { name: 'Demi Combinaison Rond', price: 30.00, img: BASE+'2026/01/Demi_Combinaison-Rond-30-300x300.png', url: 'https://apiculture-haddad.com/product/demi-combinaison-rond/' },
      { name: 'Combinaison masque carré', price: 35.00, img: BASE+'2026/01/Combinaison-masque-carre-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-masque-carre-2/' },
      { name: 'Combinaison Enfant', price: 35.00, img: BASE+'2025/12/combinaison-enfant-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-enfant/' },
      { name: 'Masque Cowboy', price: 35.00, img: BASE+'2025/12/masque-cowboy.png', url: 'https://apiculture-haddad.com/product/masque-cowboy/' },
      { name: 'Demi Combinaison Ovale', price: 35.00, img: BASE+'2026/01/Demi_Combinaison-Ovale-300x300.png', url: 'https://apiculture-haddad.com/product/demi-combinaison-ovale/' },
      { name: 'Combinaison Grande Taille', price: 40.00, img: BASE+'2026/01/Combinaison-Grande-Taille--300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-blanche-complete-masque-carre/' },
      { name: 'Combinaison masque rond', price: 50.00, img: BASE+'2026/01/Combinaison-masque-rond-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-masque-rond/' },
      { name: 'Combinaison masque ovale', price: 55.00, img: BASE+'2025/12/combinaison-masque-oval-scaled-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-masque-ovale/' },
      { name: 'Kit Apiculteur 65', price: 65.00, img: BASE+'2025/12/kit-apiculteur-300x300.png', url: 'https://apiculture-haddad.com/product/kit-apiculteur-65/' },
      { name: 'Demi Combinaison Professionnel', price: 70.00, img: BASE+'2026/01/Demi-Combinaison-Professionnel-1-300x300.png', url: 'https://apiculture-haddad.com/product/demi-combinaison-professionnel/' },
      { name: 'Kit Apiculteur', price: 80.00, img: BASE+'2025/12/kit-apiculteur-complet-300x300.png', url: 'https://apiculture-haddad.com/product/kit-apiculteur/' },
      { name: 'Kit Tenu Apiculteur', price: 85.00, img: BASE+'2026/02/Kit-Tenue-Apiculteur-300x300.png', url: 'https://apiculture-haddad.com/product/kit-apiculteur-2/' },
      { name: 'Combinaison Professionnel', price: 110.00, img: BASE+'2026/01/combinaison-professionnel-300x300.png', url: 'https://apiculture-haddad.com/product/combinaison-professionnel/' },
    ],
  },
  {
    id: 'cire', label: "Cire d'abeille", emoji: '🕯️', color: '#ca8a04',
    products: [
      { name: 'Cire Bloc', price: 12.00, img: BASE+'2026/01/Cire-Bloc-300x300.png', url: 'https://apiculture-haddad.com/product/cire-bloc/' },
      { name: 'Cire Chine', price: 14.00, img: BASE+'2026/01/Cire-Chine-300x300.png', url: 'https://apiculture-haddad.com/product/cire-chine/' },
      { name: 'Cire Tunisienne 2ème choix', price: 15.00, img: BASE+'2026/01/Cire-Tunisienne-2eme-choix-300x300.png', url: 'https://apiculture-haddad.com/product/cire-tunisienne-2eme-choix/' },
      { name: 'Cire Tunisienne 1er choix', price: 20.00, img: BASE+'2026/01/Cire-Tunisienne-1er-choix-300x300.png', url: 'https://apiculture-haddad.com/product/cire-tunisienne-1er-choix/' },
      { name: 'Transformateur', price: 30.00, img: BASE+'2026/01/Transformateur--300x300.png', url: 'https://apiculture-haddad.com/product/transfaux/' },
      { name: 'Transformateur Pro', price: 75.00, img: BASE+'2026/01/Transformateur-pro--300x300.png', url: 'https://apiculture-haddad.com/product/transfaux-pro/' },
    ],
  },
  {
    id: 'nourisseurs', label: 'Nourisseurs & Nourrissement', emoji: '🍬', color: '#0d9488',
    products: [
      { name: "Nourrisseur D'Entré", price: 4.00, img: BASE+'2026/01/Nourrisseur-dEntre-300x300.png', url: 'https://apiculture-haddad.com/product/nourrisseur-dentre/' },
      { name: 'Substituant de Pollen', price: 5.00, img: BASE+'2026/01/Substituant-de-Pollen-300x300.png', url: 'https://apiculture-haddad.com/product/substituant-de-pollen/' },
      { name: 'Nourrisseur Couvre Cadre', price: 11.00, img: BASE+'2026/01/Nourrisseur-Couvre-Cadre-1-300x300.png', url: 'https://apiculture-haddad.com/product/nourrisseur-couvre-cadre/' },
      { name: "Sirop D'Abeille", price: 13.00, img: BASE+'2026/01/Sirop-dabeille--300x300.png', url: 'https://apiculture-haddad.com/product/sirop-dabeille/' },
      { name: 'Nourrisseur Couvre Cadre NV', price: 13.00, img: BASE+'2026/01/Nourrisseur-Couvre-Cadre-NV-1-300x300.png', url: 'https://apiculture-haddad.com/product/nourrisseur-couvre-cadre-nv-2/' },
      { name: 'Pâte Protéine', price: 23.00, img: BASE+'2026/01/Pate-Proteine-300x300.png', url: 'https://apiculture-haddad.com/product/patte-proteine/' },
    ],
  },
  {
    id: 'enfumoirs', label: 'Enfumoirs', emoji: '💨', color: '#6b7280',
    products: [
      { name: 'Enfumoir Local', price: 20.00, img: BASE+'2025/12/Grand-Enfoumoir-en-Inox-1-300x300.png', url: 'https://apiculture-haddad.com/product/enfumoir-local/' },
      { name: 'Enfumoir CH', price: 25.00, img: BASE+'2026/01/Grand-Enfoumoir-en-Inox-2-300x300.png', url: 'https://apiculture-haddad.com/product/enfumoir-ch/' },
      { name: 'Grand Enfumoir en Inox', price: 50.00, img: BASE+'2026/01/Grand-Enfoumoir-en-Inox-3-300x300.png', url: 'https://apiculture-haddad.com/product/grand-enfoumoir-en-inox/' },
    ],
  },
  {
    id: 'outils', label: 'Lève-cadres & Brosses', emoji: '🔧', color: '#78716c',
    products: [
      { name: 'Brosse', price: 8.00, img: BASE+'2025/12/brosse-1-300x300.png', url: 'https://apiculture-haddad.com/product/brosse/' },
      { name: 'Couteau à Désoperculer', price: 15.00, img: BASE+'2026/01/Couteau-a-Desoperculer-la-cire-15-300x300.png', url: 'https://apiculture-haddad.com/product/couteau-a-desoperculer-la-cire/' },
    ],
  },
  {
    id: 'extracteurs', label: 'Extracteurs & Maturateurs', emoji: '⚙️', color: '#0891b2',
    products: [
      { name: 'Maturateur Plastique', price: 30.00, img: BASE+'2026/01/Maturateur-Plastique-300x300.png', url: 'https://apiculture-haddad.com/product/maturateur-plastique/' },
      { name: 'Double Tamis Inox', price: 55.00, img: BASE+'2026/01/Double-Tamis-Inox-300x300.png', url: 'https://apiculture-haddad.com/product/double-tamis-inox/' },
      { name: 'Kit Extracteur', price: 100.00, img: BASE+'2026/05/kit-300x300.png', url: 'https://apiculture-haddad.com/product/kit/' },
      { name: 'Extracteur Plastique 2 cadres', price: 200.00, img: BASE+'2026/01/Extracteur-plastique-2-cadres-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-plastique-2-cadres/' },
      { name: 'Maturateur', price: 220.00, img: BASE+'2025/12/maturateur-300x300.png', url: 'https://apiculture-haddad.com/product/maturateur/' },
      { name: 'Maturateur double tamis 50kg', price: 250.00, img: BASE+'2026/01/Maturateur-50kg-300x300.png', url: 'https://apiculture-haddad.com/product/maturateur-50kg/' },
      { name: 'Maturateur double tamis 70kg', price: 300.00, img: BASE+'2026/01/Maturateur-70kg-300x300.png', url: 'https://apiculture-haddad.com/product/maturateur-70kg/' },
      { name: 'Réfractomètre', price: 300.00, img: BASE+'2026/01/Refractometre-1-1-300x300.png', url: 'https://apiculture-haddad.com/product/refractometre/' },
      { name: 'Bac à Désoperculer', price: 300.00, img: BASE+'2026/01/Bac-a-Desoperculer-300x300.png', url: 'https://apiculture-haddad.com/product/bac-a-desoperculer/' },
      { name: 'Extracteur Economique', price: 380.00, img: BASE+'2026/01/Extracteur-Economique-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-economique/' },
      { name: 'Défigeur De Miel', price: 580.00, img: BASE+'2026/01/Defigeur-De-Miel--300x300.png', url: 'https://apiculture-haddad.com/product/defigeur-de-miel/' },
      { name: 'Ceinture Chauffante', price: 800.00, img: BASE+'2026/01/ceinture-Chauffante-800dt-300x300.png', url: 'https://apiculture-haddad.com/product/ceinture-chauffante/' },
      { name: 'Moteur', price: 850.00, img: BASE+'2026/01/Moteur2-300x300.png', url: 'https://apiculture-haddad.com/product/moteur/' },
      { name: 'Bac à Désoperculer Inox Grand Modèle', price: 1700.00, img: BASE+'2026/01/Bac-a-Desoperculer-en-Inox-grand-model-1700-300x300.png', url: 'https://apiculture-haddad.com/product/bac-a-desoperculer-en-inox-grand-model/' },
      { name: 'Défigeur De Miel Pro', price: 1700.00, img: BASE+'2026/01/Defigeur-De-Miel-Pro--300x300.png', url: 'https://apiculture-haddad.com/product/defigeur-de-miel-pro/' },
      { name: 'Moteur 1700D', price: 1700.00, img: BASE+'2026/01/Moteur-300x300.png', url: 'https://apiculture-haddad.com/product/moteur-1700-d/' },
      { name: 'Extracteur Manuel 2 cadres', price: null, img: BASE+'2025/12/Extracteur-manuel-2-cadres-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-manuel-2-cadres/' },
      { name: 'Extracteur Manuel 3 cadres', price: null, img: BASE+'2025/12/Extracteur-manuel-4-cadres-2-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-manuel-3-cadres/' },
      { name: 'Extracteur Manuel 4 cadres', price: null, img: BASE+'2025/12/Extracteur-manuel-4-cadres-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-manuel-4-cadres/' },
      { name: 'Extracteur Manuel 4 cadres SAF', price: null, img: BASE+'2026/01/Extracteur-Manuel-4-cadres-SAF-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-manuel-4-cadres-saf/' },
      { name: 'Extracteur Electrique 4 cadres', price: null, img: BASE+'2026/01/Extracteur-electrique-4-cadres-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-electrique-4-cadres/' },
      { name: 'Extracteur Electrique 4 cadres Pro', price: null, img: BASE+'2026/01/Extracteur-electrique-4-cadres-1-300x300.png', url: 'https://apiculture-haddad.com/product/extracteur-electrique-4-cadres-2/' },
    ],
  },
  {
    id: 'elevage', label: "Matériel d'élevage", emoji: '🔬', color: '#7c3aed',
    products: [
      { name: 'Porte Cellule', price: 1.00, img: BASE+'2026/01/Porte-cellule--300x300.png', url: 'https://apiculture-haddad.com/product/porte-cellule/' },
      { name: 'Cage à Reine Carré', price: 1.50, img: BASE+'2026/01/Cage-a-Reine-Carre-1500-300x300.png', url: 'https://apiculture-haddad.com/product/cage-a-reine-carre/' },
      { name: 'Cage JZ', price: 1.50, img: BASE+'2026/01/Cage-JZ-300x300.png', url: 'https://apiculture-haddad.com/product/cage-jz/' },
      { name: "Matériel d'élevage", price: 3.50, img: BASE+'2026/01/Materiel-dElevage--300x300.png', url: 'https://apiculture-haddad.com/product/materiel-delevage/' },
      { name: 'Chasse Abeille PM', price: 4.00, img: BASE+'2026/01/Chasse-Abeille-PM-4-300x300.png', url: 'https://apiculture-haddad.com/product/chasse-abeille-pm/' },
      { name: 'Picking', price: 5.00, img: BASE+'2026/01/Picking-300x300.png', url: 'https://apiculture-haddad.com/product/picking/' },
      { name: 'Pince à Reine', price: 6.00, img: BASE+'2026/01/Pince-a-Reine-300x300.png', url: 'https://apiculture-haddad.com/product/pince-a-reine/' },
      { name: 'Bloc Reine', price: 7.00, img: BASE+'2026/01/Bloc-Reine-300x300.png', url: 'https://apiculture-haddad.com/product/bloc-reine/' },
      { name: 'Chasse Abeille GM', price: 7.00, img: BASE+'2026/01/Chasse-Abeille-GM-7-300x300.png', url: 'https://apiculture-haddad.com/product/chasse-abeille-gm/' },
      { name: 'Piston', price: 13.00, img: BASE+'2026/01/Piston-300x300.png', url: 'https://apiculture-haddad.com/product/piston/' },
      { name: 'Marqueur', price: 24.00, img: BASE+'2026/01/Marqueur-300x300.png', url: 'https://apiculture-haddad.com/product/marqueur/' },
      { name: 'Nuclei', price: 35.00, img: BASE+'2025/12/Nuclei-300x300.png', url: 'https://apiculture-haddad.com/product/nuclie/' },
      { name: 'Cupularve', price: 60.00, img: BASE+'2026/01/Cupularve-300x300.png', url: 'https://apiculture-haddad.com/product/cupularve/' },
      { name: "Cadre d'élevage", price: 70.00, img: BASE+'2025/12/cadre-reine-et-piking-300x300.png', url: 'https://apiculture-haddad.com/product/cadre-delvage/' },
      { name: 'Kit Jenter', price: 100.00, img: BASE+'2026/01/Kit-jenter-300x300.png', url: 'https://apiculture-haddad.com/product/kit-jenter/' },
    ],
  },
  {
    id: 'grilles', label: 'Grilles & Trappes à pollen', emoji: '🌸', color: '#db2777',
    products: [
      { name: 'Grille à Reine NICOT', price: 15.00, img: BASE+'2026/01/Grille-a-Reine-NICOT-15-300x300.png', url: 'https://apiculture-haddad.com/product/grille-a-reine-nicot/' },
      { name: 'Grille à Reine Acier', price: 16.00, img: BASE+'2026/01/Grille-a-Reine-Acier-15-dt-300x300.png', url: 'https://apiculture-haddad.com/product/grille-a-reine-acier/' },
      { name: 'Trappe à pollen bois', price: 29.00, promo: true, originalPrice: 45.00, img: BASE+'2026/01/1000016832-300x300.png', url: 'https://apiculture-haddad.com/product/trappe-a-pollen-bois-2/' },
      { name: 'Trappe à pollen', price: 40.00, img: BASE+'2026/05/Trappe-a-pollen-300x300.png', url: 'https://apiculture-haddad.com/product/trappe-a-pollen/' },
      { name: 'Trappe à pollen plateau', price: 45.00, img: BASE+'2026/05/Trappe-a-pollen-plateau-300x300.png', url: 'https://apiculture-haddad.com/product/trappe-a-pollen-plateau/' },
    ],
  },
  {
    id: 'robinets', label: 'Fil de fer & Robinets', emoji: '🔩', color: '#475569',
    products: [
      { name: 'Portière Glissante', price: 2.00, img: BASE+'2026/01/portiere-glissante-300x300.png', url: 'https://apiculture-haddad.com/product/portiere-glissante/' },
      { name: 'Portière Coulissante', price: 3.00, img: BASE+'2026/01/portiere-coulissante-1-300x300.png', url: 'https://apiculture-haddad.com/product/portiere-coulissante/' },
      { name: 'Fil de Fer Souple PM', price: 3.00, img: BASE+'2026/01/Fil-de-Fer-Souple-PM-300x300.png', url: 'https://apiculture-haddad.com/product/fil-de-fer-souple-pm/' },
      { name: 'Fil de Fer GM', price: 12.00, img: BASE+'2026/01/Fil-de-Fer-GM-300x300.png', url: 'https://apiculture-haddad.com/product/fil-de-fer-gm/' },
      { name: 'Robinet', price: 15.00, img: BASE+'2025/12/Robinet-300x300.png', url: 'https://apiculture-haddad.com/product/robinet/' },
      { name: 'Zig Zag', price: 15.00, img: BASE+'2026/01/ZIG-ZAG-300x300.png', url: 'https://apiculture-haddad.com/product/zig-zag/' },
      { name: 'Robinet Jaune', price: 17.00, img: BASE+'2026/01/Robinet-Jaune-300x300.png', url: 'https://apiculture-haddad.com/product/robinet-jaune/' },
      { name: 'Fil Inox', price: 20.00, img: BASE+'2026/01/Fil-Inox-300x300.png', url: 'https://apiculture-haddad.com/product/fil-inox/' },
      { name: 'Robinet Pro', price: 35.00, img: BASE+'2026/01/Robinet-Pro-35-300x300.png', url: 'https://apiculture-haddad.com/product/robinet-pro/' },
    ],
  },
  {
    id: 'antivarroa', label: 'Anti-varroa & Charmes', emoji: '🦟', color: '#dc2626',
    products: [
      { name: 'Charme 20gr', price: 8.00, img: BASE+'2026/01/Charme-20gr-300x300.png', url: 'https://apiculture-haddad.com/product/charme-20gr/' },
      { name: 'Charme Tube', price: 15.00, img: BASE+'2026/01/Charme-Tube-300x300.png', url: 'https://apiculture-haddad.com/product/charme-tube/' },
      { name: 'Varroa Stop TB', price: 15.00, img: BASE+'2026/01/Varroa-stop-TB-300x300.png', url: 'https://apiculture-haddad.com/product/varroa-stop-tb/' },
      { name: 'Varroa Stop Gel', price: 15.00, img: BASE+'2026/01/Varroa-Stop-Gel-300x300.png', url: 'https://apiculture-haddad.com/product/varroa-stop-gel/' },
      { name: 'Abejar Gel', price: 20.00, img: BASE+'2026/01/Abejar1-300x300.png', url: 'https://apiculture-haddad.com/product/abejar-gel/' },
      { name: "Charme d'abeille PM", price: 20.00, img: BASE+'2025/12/Charme-dabeille-1-300x300.png', url: 'https://apiculture-haddad.com/product/charme-dabeille-pm/' },
      { name: "Charme Rouge", price: 20.00, img: BASE+'2026/01/Charme-Rouge-300x300.png', url: 'https://apiculture-haddad.com/product/charme-rouge/' },
      { name: 'Baraday+', price: 20.00, img: BASE+'2026/05/Baraday-300x300.png', url: 'https://apiculture-haddad.com/product/baraday/' },
      { name: 'Bio Varol', price: 25.00, img: BASE+'2026/01/Bio-Varol-300x300.png', url: 'https://apiculture-haddad.com/product/bio-varol/' },
      { name: 'Di stop', price: 25.00, img: BASE+'2026/01/Di-stop-300x300.png', url: 'https://apiculture-haddad.com/product/di-stop/' },
      { name: "Charme d'abeille GM", price: 30.00, img: BASE+'2025/12/Charme-dabeille-300x300.png', url: 'https://apiculture-haddad.com/product/charme-dabeille-gm/' },
      { name: 'Abejar Aerosol', price: 30.00, img: BASE+'2026/01/Abejar-300x300.png', url: 'https://apiculture-haddad.com/product/abejar-aerosol/' },
      { name: 'Amitraze+', price: 30.00, img: BASE+'2026/05/Amitraze-300x300.png', url: 'https://apiculture-haddad.com/product/amitraze/' },
      { name: 'Bionat', price: 30.00, img: BASE+'2026/05/Bionat-300x300.png', url: 'https://apiculture-haddad.com/product/bionat/' },
      { name: 'Timol-vaporisateur', price: 30.00, img: BASE+'2026/05/Timol-vaporisateur-300x300.png', url: 'https://apiculture-haddad.com/product/timol-vaporisateur/' },
      { name: 'Apisant Chine', price: 48.00, img: BASE+'2026/01/Apisant-Chine-48-300x300.png', url: 'https://apiculture-haddad.com/product/apisant-chine/' },
    ],
  },
  {
    id: 'ruche', label: 'Produits de la ruche', emoji: '🍯', color: '#d97706',
    products: [
      { name: 'Cuillère à Miel', price: 2.00, img: BASE+'2026/01/Cuillere-a-Miel-2-300x300.png', url: 'https://apiculture-haddad.com/product/cuillere-a-miel/' },
      { name: 'Emballage Gelée Royale', price: 2.50, img: BASE+'2026/02/Emballage-Gele-Royale-300x300.png', url: 'https://apiculture-haddad.com/product/emballage-gele-royale/' },
      { name: 'Gelée Royale 10g', price: 15.00, img: BASE+'2026/02/Gele-Royale-300x300.png', url: 'https://apiculture-haddad.com/product/gele-royale/' },
      { name: 'Pousse Miel', price: 20.00, img: BASE+'2026/01/Pousse-Miel-15-300x300.png', url: 'https://apiculture-haddad.com/product/ousse-miel/' },
      { name: 'Pollen', price: 20.00, img: BASE+'2026/02/Pollen--300x300.png', url: 'https://apiculture-haddad.com/product/pollen/' },
      { name: "Miel de Forêt 500g", price: 25.00, img: BASE+'2026/02/Miel-de-Foret-500g-300x300.png', url: 'https://apiculture-haddad.com/product/miel-de-foret-500g/' },
      { name: "Miel d'Eucalyptus 500g", price: 25.00, img: BASE+'2026/02/Miel-dEucalyptus-500g-300x300.png', url: 'https://apiculture-haddad.com/product/miel-deucalyptus-500g/' },
      { name: 'Propolis', price: 30.00, img: BASE+'2026/02/Propolis-300x300.png', url: 'https://apiculture-haddad.com/product/propolis/' },
      { name: "Miel de Forêt 1kg", price: 45.00, img: BASE+'2026/02/Miel-de-Foret-1kg-300x300.png', url: 'https://apiculture-haddad.com/product/miel-de-foret-1kg/' },
      { name: "Miel d'Eucalyptus 1kg", price: 45.00, img: BASE+'2026/02/Miel-Miel-dEucalyptus-1kg-300x300.png', url: 'https://apiculture-haddad.com/product/miel-miel-deucalyptus-1kg/' },
      { name: 'Pollen 1kg', price: 50.00, img: BASE+'2026/02/Pollen-1kg-300x300.png', url: 'https://apiculture-haddad.com/product/pollen-1kg/' },
      { name: 'Propolis 1kg', price: 280.00, img: BASE+'2026/02/Propolis-1kg-300x300.png', url: 'https://apiculture-haddad.com/product/propolis-1kg/' },
      { name: 'Gelée Royale 1kg', price: 300.00, img: BASE+'2026/02/Gele-Royale-1kg-300x300.png', url: 'https://apiculture-haddad.com/product/gele-royale-1kg/' },
    ],
  },
  {
    id: 'divers', label: 'Produits divers', emoji: '📦', color: '#059669',
    products: [
      { name: 'Ceinture', price: 15.00, img: BASE+'2025/12/ceinture-scaled-300x300.png', url: 'https://apiculture-haddad.com/product/ceinture/' },
      { name: 'Housse Imperméable', price: 15.00, img: BASE+'2026/01/Housse-impermeable-300x300.png', url: 'https://apiculture-haddad.com/product/housse-impermeable/' },
      { name: 'Support Cadre', price: 15.00, img: BASE+'2025/12/support-cadre-300x300.png', url: 'https://apiculture-haddad.com/product/support-cadre/' },
      { name: 'Scotch', price: 18.00, img: BASE+'2025/12/scotch-300x300.png', url: 'https://apiculture-haddad.com/product/scotche/' },
      { name: 'Apiculteur', price: 25.00, img: BASE+'2026/01/Apiculture-300x300.png', url: 'https://apiculture-haddad.com/product/apiculteur/' },
      { name: 'Couple de transmission', price: 35.00, img: BASE+'2025/12/couple-de-transmission-300x300.png', url: 'https://apiculture-haddad.com/product/couple-de-transmission/' },
      { name: 'Housse Imperméable Isolation Thermique', price: 35.00, img: BASE+'2026/01/Housse-impermeable-isolation-thermique-300x300.png', url: 'https://apiculture-haddad.com/product/housse-impermeable-isolation-thermique/' },
      { name: 'Pull Apiculteur', price: 42.00, img: BASE+'2026/01/Pull-Apiculteur-1-300x300.png', url: 'https://apiculture-haddad.com/product/pull-apiculteur/' },
      { name: 'Pull Apiculteur (v2)', price: 42.00, img: BASE+'2026/01/Pull-Apiculteur-2-300x300.png', url: 'https://apiculture-haddad.com/product/pull-apiculteur-2/' },
      { name: 'Pull Capuche Apiculteur', price: 42.00, img: BASE+'2026/01/Pull-Capuche-Apiculteur--300x300.png', url: 'https://apiculture-haddad.com/product/pull-capuche-apiculteur/' },
      { name: 'Collecteur de venin', price: 1500.00, img: BASE+'2026/01/Collecteur-300x300.png', url: 'https://apiculture-haddad.com/product/collecteur-de-venin/' },
      { name: 'Insémination Artificielle', price: null, img: BASE+'2026/01/Insemination-artificielle-300x300.png', url: 'https://apiculture-haddad.com/product/insemination-artificielle/' },
    ],
  },
  {
    id: 'promo', label: 'Matériel en promo', emoji: '🏷️', color: '#ea580c',
    products: [
      { name: 'Trappe à pollen bois', price: 29.00, promo: true, originalPrice: 45.00, img: BASE+'2026/01/1000016832-300x300.png', url: 'https://apiculture-haddad.com/product/trappe-a-pollen-bois-2/' },
      { name: 'Réfractomètre', price: 199.00, promo: true, originalPrice: 300.00, img: BASE+'2026/01/Refractometre-1-1-300x300.png', url: 'https://apiculture-haddad.com/product/refractometre-2/' },
    ],
  },
];

export const TOTAL = CATALOGUE.reduce((s, c) => s + c.products.length, 0);

function Modal({ product, category, onClose }) {
  if (!product) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--color-surface)', borderRadius: 18,
        maxWidth: 440, width: '100%', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,.4)',
        border: '1px solid var(--color-border)',
      }}>
        <div style={{ position: 'relative' }}>
          <img src={product.img} alt={product.name}
            onError={e => { e.target.style.display='none'; }}
            style={{ width: '100%', height: 260, objectFit: 'contain', background: '#f8f8f8', display: 'block' }} />
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 32, height: 32,
            borderRadius: '50%', background: 'rgba(0,0,0,.5)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={16}/></button>
          {product.promo && (
            <span style={{
              position: 'absolute', top: 12, left: 12, background: '#ea580c', color: '#fff',
              fontSize: 11, fontWeight: 900, padding: '4px 10px', borderRadius: 99,
            }}>PROMO</span>
          )}
        </div>
        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: category.color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            {category.emoji} {category.label}
          </div>
          <h2 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>
            {product.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
            {product.price !== null && product.price !== undefined ? (
              <>
                <span style={{ fontSize: 28, fontWeight: 900, color: category.color }}>{product.price.toFixed(2)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-3)' }}>DT</span>
                {product.promo && product.originalPrice && (
                  <span style={{ fontSize: 16, color: 'var(--color-text-3)', textDecoration: 'line-through' }}>
                    {product.originalPrice.toFixed(2)} DT
                  </span>
                )}
                {product.promo && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#ea580c' }}>
                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 18, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Prix sur demande</span>
            )}
          </div>
          <a href={product.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: category.color, color: '#fff', borderRadius: 10,
            padding: '12px 20px', textDecoration: 'none', fontWeight: 800, fontSize: 13,
            width: '100%', boxSizing: 'border-box',
          }}>
            <ShoppingBag size={15}/> Voir sur apiculture-haddad.com
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Shared Apiculture-Haddad catalogue / stock view.
 * Rendered both on the standalone /entrepot page and inside the AboutBee
 * "Stock" tab so the two stay identical (single source of truth).
 */
export default function EntrepotCatalogue() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const [qty, setQtyState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('haddad-qty') || '{}'); } catch { return {}; }
  });

  const setQty = useCallback((key, val) => {
    const v = Math.max(0, Number(val) || 0);
    setQtyState(prev => {
      const next = { ...prev, [key]: v };
      localStorage.setItem('haddad-qty', JSON.stringify(next));
      return next;
    });
  }, []);

  const pKey = (catId, i) => `${catId}-${i}`;
  const stockBadge = (q) => q === 0
    ? { label: 'Épuisé',     bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
    : q <= 5
    ? { label: 'Stock faible', bg: '#fffbeb', color: '#d97706', border: '#fde68a' }
    : { label: 'Disponible', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATALOGUE.map(cat => {
      if (activeCategory !== 'all' && cat.id !== activeCategory) return null;
      const products = cat.products.filter(p =>
        !q || p.name.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)
      );
      if (!products.length) return null;
      return { ...cat, products };
    }).filter(Boolean);
  }, [search, activeCategory]);

  return (
    <>
      {selected && <Modal product={selected.product} category={selected.cat} onClose={() => setSelected(null)} />}

      {/* Hero */}
      <div style={{
        borderRadius: 16, marginBottom: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #78350f 0%, #b45309 40%, #d97706 100%)',
        padding: '28px 32px', position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.2)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', marginBottom: 6 }}>
            🐝 Catalogue scrappé depuis
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
            Apiculture Haddad — Grombalia, Tunisie
          </h1>
          <p style={{ margin: '8px 0 16px', color: 'rgba(255,255,255,.75)', fontSize: 13 }}>
            {TOTAL} produits · {CATALOGUE.length} catégories · Tous les prix en Dinars Tunisiens (DT)
          </p>
          <a href="https://apiculture-haddad.com/boutique/" target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.4)',
              borderRadius: 8, padding: '7px 16px', color: '#fff',
              fontSize: 12, fontWeight: 700, textDecoration: 'none',
            }}>
            <ExternalLink size={12}/> Visiter la boutique
          </a>
        </div>
        <div style={{ position: 'absolute', right: 32, top: '50%', transform: 'translateY(-50%)', fontSize: 90, opacity: .12, pointerEvents: 'none' }}>🐝</div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {(() => {
          const allProds = CATALOGUE.flatMap((c) => c.products.map((p, pi) => ({ p, key: pKey(c.id, pi) })));
          const inStock = allProds.filter(x => (qty[x.key] || 0) > 0).length;
          const lowStock = allProds.filter(x => { const q = qty[x.key] || 0; return q > 0 && q <= 5; }).length;
          return [
            { label: 'Produits', value: TOTAL, emoji: '📦' },
            { label: 'Catégories', value: CATALOGUE.length, emoji: '🗂️' },
            { label: 'En stock', value: inStock, emoji: '✅' },
            { label: 'Stock faible', value: lowStock, emoji: '⚠️' },
          ];
        })().map(k => (
          <div key={k.label} style={{
            flex: '1 1 110px', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, padding: '12px 16px',
          }}>
            <div style={{ fontSize: 18 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }}/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un produit..."
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px',
            borderRadius: 10, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none',
          }}/>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setActiveCategory('all')} style={{
          padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          border: activeCategory === 'all' ? '1.5px solid #d97706' : '1.5px solid var(--color-border)',
          background: activeCategory === 'all' ? '#d97706' : 'transparent',
          color: activeCategory === 'all' ? '#fff' : 'var(--color-text-3)',
        }}>Tout ({TOTAL})</button>
        {CATALOGUE.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
            padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            border: activeCategory === cat.id ? `1.5px solid ${cat.color}` : '1.5px solid var(--color-border)',
            background: activeCategory === cat.id ? cat.color : 'transparent',
            color: activeCategory === cat.id ? '#fff' : 'var(--color-text-3)',
          }}>{cat.emoji} {cat.label} ({cat.products.length})</button>
        ))}
      </div>

      {/* Catalogue */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 700 }}>Aucun produit pour « {search} »</div>
        </div>
      ) : filtered.map(cat => (
        <div key={cat.id} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: cat.color+'22',
              border: `1.5px solid ${cat.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
            }}>{cat.emoji}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>{cat.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{cat.products.length} produit{cat.products.length > 1 ? 's' : ''}</div>
            </div>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)', marginLeft: 8 }}/>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: cat.color+'18', color: cat.color, border: `1px solid ${cat.color}30` }}>
              {cat.products.length}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {cat.products.map((p, i) => {
              const key = pKey(cat.id, i);
              const q = qty[key] || 0;
              const badge = stockBadge(q);
              return (
                <div key={i} onClick={() => setSelected({ product: p, cat })}
                  style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    transition: 'box-shadow .15s, transform .15s',
                    borderTop: `3px solid ${cat.color}`,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 20px ${cat.color}25`; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  {/* Image */}
                  <div style={{ height: 130, background: '#f9f9f9', position: 'relative', overflow: 'hidden' }}>
                    <img src={p.img} alt={p.name}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}/>
                    <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#ccc' }}>
                      {cat.emoji}
                    </div>
                    {p.promo && (
                      <span style={{ position: 'absolute', top: 7, left: 7, background: '#ea580c', color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 7px', borderRadius: 99 }}>PROMO</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 6, minHeight: 30 }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                      {p.price !== null && p.price !== undefined ? (
                        <>
                          <span style={{ fontSize: 15, fontWeight: 900, color: cat.color }}>{p.price.toFixed(2)}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)' }}>DT</span>
                          {p.promo && p.originalPrice && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-3)', textDecoration: 'line-through', marginLeft: 2 }}>{p.originalPrice.toFixed(2)}</span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>Sur demande</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity zone */}
                  <div onClick={e => e.stopPropagation()}
                    style={{ margin: '0 10px 10px', padding: '8px 10px', borderRadius: 10, background: badge.bg, border: `1px solid ${badge.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: badge.color }}>{badge.label}</span>
                      <span style={{ fontSize: 9, color: badge.color, fontWeight: 600 }}>Qté disponible</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setQty(key, q - 1)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${badge.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: badge.color, flexShrink: 0 }}>
                        <Minus size={12}/>
                      </button>
                      <input
                        type="number" min="0" value={q}
                        onChange={e => setQty(key, e.target.value)}
                        style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: 14, color: badge.color, background: 'transparent', border: 'none', outline: 'none', width: 0 }}
                      />
                      <button onClick={() => setQty(key, q + 1)}
                        style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${badge.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: badge.color, flexShrink: 0 }}>
                        <Plus size={12}/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: 24, padding: '14px 20px', borderRadius: 10,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Tag size={13} color="var(--color-text-3)"/>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          Source : <a href="https://apiculture-haddad.com" target="_blank" rel="noopener noreferrer"
            style={{ color: '#d97706', fontWeight: 700, textDecoration: 'none' }}>apiculture-haddad.com</a>
          {' '}— Scrappé le 08/06/2026. Prix en DT, susceptibles de varier. Cliquez sur une carte pour voir les détails.
        </span>
      </div>
    </>
  );
}
