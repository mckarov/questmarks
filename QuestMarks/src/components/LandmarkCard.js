import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MARKER_COLORS, TYPE_LABELS, XP_VALUES } from '../constants/game';
import { useAppContext } from '../context/AppContext';
import { formatDistance } from '../utils/distance';

const LandmarkCard = ({ landmark, visited, onSelect, actionLabel, onAction }) => {
  const { t } = useAppContext();

  return (
    <TouchableOpacity style={styles.card} onPress={() => onSelect(landmark)}>
      <View style={styles.headerRow}>
        <View style={[styles.typePill, { backgroundColor: MARKER_COLORS[landmark.type] }]}>
          <Text style={styles.typeText}>{TYPE_LABELS[landmark.type]}</Text>
        </View>
        <Text style={styles.xpText}>+{XP_VALUES[landmark.type]} XP</Text>
      </View>
      <Text style={styles.title}>{landmark.name}</Text>
      <Text style={styles.subtitle}>{landmark.country}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{formatDistance(landmark.distance || 0)}</Text>
        <Text style={styles.metaText}>
          {visited ? t('map.visitedStatusVisited') : t('map.visitedStatusOpen')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, visited && styles.visitedButton]}
        onPress={() => onAction(landmark)}
      >
        <Text style={[styles.actionText, visited && styles.visitedText]}>
          {visited ? t('map.visitedStatusVisited') : actionLabel}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDBA74',
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#9CA3AF',
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  actionButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F97316',
  },
  visitedButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  visitedText: {
    color: '#A7F3D0',
  },
});

export default LandmarkCard;
