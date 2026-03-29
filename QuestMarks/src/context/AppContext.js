import React, { createContext, startTransition, useContext, useMemo, useState } from 'react';
import { translations } from '../i18n/translations';

const AppContext = createContext(null);

const getNestedValue = (source, key) =>
  key.split('.').reduce((value, part) => (value && value[part] !== undefined ? value[part] : undefined), source);

const interpolate = (template, values) =>
  Object.keys(values).reduce(
    (result, key) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(values[key])),
    template
  );

export const AppProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');

  const setLanguage = nextLanguage => {
    startTransition(() => setLanguageState(nextLanguage));
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key, values = {}) => {
        const template =
          getNestedValue(translations[language], key) ??
          getNestedValue(translations.en, key) ??
          key;

        if (typeof template !== 'string') {
          return template;
        }

        return interpolate(template, values);
      },
    }),
    [language]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside AppProvider');
  }

  return context;
};

