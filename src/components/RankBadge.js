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
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
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
    backgroundColor: '#D8C09B',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5A4630',
  },
  textWrap: {
    marginLeft: 12,
    flex: 1,
  },
  rankName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4C3926',
  },
  rankMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#8C755B',
  },
  progressTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E2D2BB',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#B08A58',
  },
});

export default RankBadge;
