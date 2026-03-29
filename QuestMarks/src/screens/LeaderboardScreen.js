import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import UserService from '../services/UserService';

const LeaderboardScreen = ({ user }) => {
  const { t } = useAppContext();
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    let mounted = true;

    UserService.getLeaderboard(20).then(items => {
      if (mounted) {
        setLeaders(items);
      }
    });

    return () => {
      mounted = false;
    };
  }, [user.uid]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t('leaderboard.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('leaderboard.subtitle')}</Text>
      </View>

      <View style={styles.listCard}>
        {leaders.length === 0 ? (
          <Text style={styles.emptyText}>{t('leaderboard.empty')}</Text>
        ) : (
          leaders.map(entry => {
            const isCurrentUser = entry.userId === user.uid;

            return (
              <View
                key={entry.userId}
                style={[styles.row, isCurrentUser && styles.currentRow]}
              >
                <Text style={styles.rankNumber}>#{entry.rank}</Text>
                <View style={styles.identityWrap}>
                  <Text style={styles.identityName}>
                    {entry.displayName || entry.email || entry.userId}
                    {isCurrentUser ? ` · ${t('leaderboard.you')}` : ''}
                  </Text>
                  <Text style={styles.identityMeta}>
                    {entry.rankInfo ? entry.rankInfo.name : t('common.unsupported')}
                  </Text>
                </View>
                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreValue}>{entry.xp || 0}</Text>
                  <Text style={styles.scoreLabel}>{t('leaderboard.xp')}</Text>
                </View>
              </View>
            );
          })
        )}
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
  listCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#22304A',
  },
  currentRow: {
    backgroundColor: '#1A2438',
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  rankNumber: {
    width: 48,
    fontSize: 18,
    fontWeight: '800',
    color: '#FDBA74',
  },
  identityWrap: {
    flex: 1,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  identityMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  scoreLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#CBD5E1',
  },
});

export default LeaderboardScreen;
