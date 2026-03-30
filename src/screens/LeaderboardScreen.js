import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarPreset } from '../constants/profile';
import { useAppContext } from '../context/AppContext';
import UserService from '../services/UserService';

const LeaderboardScreen = ({ user }) => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const topContentInset = Math.max(insets.top + 8, 28);
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
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topContentInset }]}>
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
            const avatar = getAvatarPreset(entry.avatarId, entry.countryFlag);

            return (
              <View
                key={entry.userId}
                style={[styles.row, isCurrentUser && styles.currentRow]}
              >
                <Text style={styles.rankNumber}>#{entry.rank}</Text>
                <View style={[styles.avatarBubble, { backgroundColor: avatar.accent }]}>
                  <Text style={styles.avatarText}>{avatar.emoji}</Text>
                </View>
                <View style={styles.identityWrap}>
                  <Text style={styles.identityName}>
                    {entry.displayNameDecorated || entry.displayName || entry.userId}
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
  listCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#D9C5A6',
  },
  currentRow: {
    backgroundColor: '#EFE1C8',
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  rankNumber: {
    width: 48,
    fontSize: 18,
    fontWeight: '800',
    color: '#9A7241',
  },
  identityWrap: {
    flex: 1,
  },
  avatarBubble: {
    width: 42,
    height: 42,
    marginRight: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  identityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4C3926',
  },
  identityMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#8C755B',
  },
  scoreWrap: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4C3926',
  },
  scoreLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#8C755B',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6D593F',
  },
});

export default LeaderboardScreen;
