import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const RankBadge = ({ rank, xp, progress }) => {
  if (!rank) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>{rank.icon}</Text>
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.rankName}>{rank.name}</Text>
          <Text style={styles.rankMeta}>{xp.toLocaleString()} XP</Text>
        </View>
      </View>
      {progress !== undefined ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(progress, 6)}%` }]} />
        </View>
      ) : null}
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1607',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FDBA74',
  },
  textWrap: {
    marginLeft: 12,
    flex: 1,
  },
  rankName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  rankMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
  },
  progressTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F97316',
  },
});

export default RankBadge;

