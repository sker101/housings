import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from '../locales/en/translation.json';
import swTranslations from '../locales/sw/translation.json';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: enTranslations },
            sw: { translation: swTranslations }
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'sw'],
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage']
        }
    });

export default i18n;
