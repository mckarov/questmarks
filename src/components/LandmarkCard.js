import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getLandmarkXP, MARKER_COLORS, TYPE_LABELS } from '../constants/game';
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
        <Text style={styles.xpText}>+{getLandmarkXP(landmark)} XP</Text>
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
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
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
    color: '#FFF8EF',
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A7241',
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#4C3926',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#8C755B',
  },
  metaRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 12,
    color: '#6D593F',
  },
  actionButton: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#B08A58',
  },
  visitedButton: {
    backgroundColor: '#E7D8BF',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF8EF',
  },
  visitedText: {
    color: '#5A4630',
  },
});

export default LandmarkCard;
