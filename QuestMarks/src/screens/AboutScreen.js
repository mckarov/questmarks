import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { projectDescription } from '../content/projectDescription';
import { useAppContext } from '../context/AppContext';

const AboutScreen = () => {
  const { language, t } = useAppContext();
  const sections = projectDescription[language] || projectDescription.en;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t('about.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('about.subtitle')}</Text>
      </View>

      {sections.map(section => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <View style={styles.bulletsWrap}>
            {section.bullets.map(line => (
              <Text key={line} style={styles.bulletText}>
                - {line}
              </Text>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('about.criterionBNoteTitle')}</Text>
        <Text style={styles.cardBody}>{t('about.criterionBNoteBody')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('about.buildTitle')}</Text>
        <Text style={styles.cardBody}>{t('about.buildBody')}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 32,
    backgroundColor: '#111827',
  },
  heroCard: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#9CA3AF',
  },
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  bulletsWrap: {
    marginTop: 12,
    gap: 8,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#D1D5DB',
  },
  cardBody: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: '#D1D5DB',
  },
});

export default AboutScreen;

