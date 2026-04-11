import React from 'react'
import ReactDOM from 'react-dom/client'

// Suppress known benign warnings for a clean production console
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('React Router Future Flag Warning')) return;
    if (args[0].includes('THREE.Clock: This module has been deprecated')) return;
    if (args[0].includes('PCFSoftShadowMap has been deprecated')) return;
    if (args[0].includes('KHR_materials_pbrSpecularGlossiness')) return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  if (typeof args[0] === 'string') {
    if (args[0].includes('WebGLRenderer: Context Lost')) return;
    if (args[0].includes('KHR_materials_pbrSpecularGlossiness')) return;
  }
  originalError(...args);
};

import App from './App.jsx'
import './index.css'
import './i18n' // Import i18n config

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
