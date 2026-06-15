import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import locales
import translationEN from './locales/en.json';
import translationFR from './locales/fr.json';
import translationAR from './locales/ar.json';

const resources = {
  en: { translation: translationEN },
  fr: { translation: translationFR },
  ar: { translation: translationAR }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // No hardcoded lng → the detector restores the saved choice (localStorage),
    // falling back to French for first-time users.
    fallbackLng: 'fr',
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false
    }
  });

// Apply document direction on startup and on every language change
const applyDir = (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir  = dir;
  document.documentElement.lang = lng || 'fr';
};
// Apply immediately (init is synchronous when resources are bundled)
applyDir(i18n.language);
// Re-apply on every language switch
i18n.on('languageChanged', applyDir);

export default i18n;
