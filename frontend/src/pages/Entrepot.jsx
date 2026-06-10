import React from 'react';
import Navbar from '../components/Navbar';
import EntrepotCatalogue, { CATALOGUE, TOTAL } from '../components/EntrepotCatalogue';

export default function Entrepot() {
  return (
    <>
      <Navbar title="Catalogue Apiculture Haddad" subtitle={`${TOTAL} produits · ${CATALOGUE.length} catégories`} />
      <div className="page-content">
        <EntrepotCatalogue />
      </div>
    </>
  );
}
