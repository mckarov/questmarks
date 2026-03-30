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
    borderColor: '#CBB596',
    backgroundColor: '#FFF9F0',
  },
  activeButton: {
    borderColor: '#A98C68',
    backgroundColor: '#D8C09B',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D593F',
  },
  activeLabel: {
    color: '#4C3926',
  },
});

export default LanguageSwitcher;
