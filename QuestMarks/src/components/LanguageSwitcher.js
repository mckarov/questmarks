import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

const languages = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'de', label: 'DE' },
];

const LanguageSwitcher = () => {
  const { language, setLanguage } = useAppContext();

  return (
    <View style={styles.container}>
      {languages.map(item => {
        const active = item.code === language;

        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.button, active && styles.activeButton]}
            onPress={() => setLanguage(item.code)}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#111827',
  },
  activeButton: {
    borderColor: '#F97316',
    backgroundColor: '#2A1607',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  activeLabel: {
    color: '#FDBA74',
  },
});

export default LanguageSwitcher;

