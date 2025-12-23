import { useState, useEffect } from 'react';
import esTranslations from '@/locales/es.json';
import enTranslations from '@/locales/en.json';

const translations: Record<string, any> = {
    es: esTranslations,
    en: enTranslations,
};

export function useTranslation(namespace?: string) {
    const [locale, setLocale] = useState<string>('es');

    useEffect(() => {
        // Get locale from localStorage or browser
        const savedLocale = localStorage.getItem('locale') || navigator.language.split('-')[0];
        if (translations[savedLocale]) {
            setLocale(savedLocale);
        }
    }, []);

    const t = (key: string): string => {
        const keys = key.split('.');
        let value: any = translations[locale];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key; // Return key if not found
            }
        }

        return typeof value === 'string' ? value : key;
    };

    const changeLocale = (newLocale: string) => {
        if (translations[newLocale]) {
            setLocale(newLocale);
            localStorage.setItem('locale', newLocale);
        }
    };

    return { t, locale, changeLocale };
}
