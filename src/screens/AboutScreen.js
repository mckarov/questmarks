import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';

const LANDMARK_TYPES = ['LOCAL', 'SEMI_LOCAL', 'REGIONAL', 'NATIONAL', 'UNESCO', 'WONDER'];

const AboutScreen = () => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const topContentInset = Math.max(insets.top + 8, 28);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topContentInset }]}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t('about.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('about.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('about.howItWorksTitle')}</Text>
        <Text style={styles.cardBody}>{t('about.howItWorksBody')}</Text>
      </View>

      {LANDMARK_TYPES.map(type => (
        <View key={type} style={styles.card}>
          <Text style={styles.cardTitle}>{t(`about.types.${type}.title`)}</Text>
          <Text style={styles.cardBody}>{t(`about.types.${type}.description`)}</Text>
          <Text style={styles.examplesLabel}>{t('about.examplesLabel')}</Text>
          <View style={styles.bulletsWrap}>
            {t(`about.types.${type}.examples`).map(line => (
              <Text key={line} style={styles.bulletText}>
                - {line}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 32,
    backgroundColor: '#E9DDC7',
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#F4E7CF',
    borderWidth: 1,
    borderColor: '#C9B492',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4C3926',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#7A6750',
  },
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4C3926',
  },
  cardBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#6D593F',
  },
  examplesLabel: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#8C755B',
  },
  bulletsWrap: {
    marginTop: 10,
    gap: 8,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6D593F',
  },
});

export default AboutScreen;
