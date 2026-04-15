import React from 'react'
import ReactDOM from 'react-dom/client'

// Suppress known benign warnings for a clean production console
import App from './App.jsx'
import './index.css'
import './i18n' // Import i18n config

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
