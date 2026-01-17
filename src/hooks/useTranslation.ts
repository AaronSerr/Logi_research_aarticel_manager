import { useSettingsStore } from '../store/settings';
import { translations, Language } from '../i18n/translations';

export function useTranslation() {
  const { language } = useSettingsStore();
  const lang = (language as Language) || 'en';

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang]?.[key] || translations['en'][key] || key;

    // Replace placeholders like {count}, {imported}, etc.
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value));
      });
    }

    return text;
  };

  return { t, language: lang };
}
