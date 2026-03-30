import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RankBadge from '../components/RankBadge';
import { getAvatarPreset } from '../constants/profile';
import { useAppContext } from '../context/AppContext';
import AuthService from '../services/AuthService';
import UserService from '../services/UserService';

const formatTimestamp = (value, fallbackLabel) => {
  if (!value) {
    return fallbackLabel;
  }

  if (typeof value === 'string') {
    return new Date(value).toLocaleString();
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }

  return String(value);
};

const ProfileScreen = () => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const topContentInset = Math.max(insets.top + 8, 28);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  const load = async () => {
    const [nextStats, nextHistory] = await Promise.all([
      UserService.getUserStats(),
      UserService.getCheckInHistory(5),
    ]);

    setStats(nextStats);
    setHistory(nextHistory);
  };

  useEffect(() => {
    load();
  }, []);

  const selectedAvatar = getAvatarPreset(stats?.avatarId, stats?.countryFlag);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topContentInset }]}>
      <View style={styles.heroCard}>
        <View style={[styles.avatarHero, { backgroundColor: selectedAvatar.accent }]}>
          <Text style={styles.avatarHeroEmoji}>{selectedAvatar.emoji}</Text>
        </View>
        <Text style={styles.heroTitle}>{t('profile.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('profile.subtitle')}</Text>
        <Text style={styles.identity}>{stats?.displayNameDecorated || 'Explorer'}</Text>
        <Text style={styles.identityMeta}>{stats?.email || t('common.unsupported')}</Text>
      </View>

      {stats ? (
        <View style={styles.section}>
          <RankBadge rank={stats.rank} xp={stats.xp} progress={stats.rankProgress} />
        </View>
      ) : null}

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('profile.totalXp')}</Text>
          <Text style={styles.metricValue}>{stats ? stats.xp.toLocaleString() : '0'}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('profile.visits')}</Text>
          <Text style={styles.metricValue}>{stats ? stats.visitedCount : 0}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.friendsTitle')}</Text>
        <Text style={styles.cardBody}>{t('profile.friendsBody')}</Text>
        <View style={styles.friendPreviewRow}>
          {['🌍', '🧭', '✨'].map(item => (
            <View key={item} style={styles.friendBubble}>
              <Text style={styles.friendBubbleEmoji}>{item}</Text>
            </View>
          ))}
        </View>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>{t('profile.comingSoon')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.history')}</Text>
        <View style={styles.cardSpacer} />
        {history.length === 0 ? (
          <Text style={styles.cardBody}>{t('profile.emptyHistory')}</Text>
        ) : (
          history.map(item => (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{item.landmarkType}</Text>
              </View>
              <View style={styles.historyTextWrap}>
                <Text style={styles.historyTitle}>#{item.landmarkId}</Text>
                <Text style={styles.historyMeta}>
                  {formatTimestamp(item.timestamp, t('common.unsupported'))}
                </Text>
              </View>
              <Text style={styles.historyXp}>+{item.xpGained}</Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => AuthService.signOut()}>
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#E9DDC7',
  },
  heroCard: {
    padding: 22,
    borderRadius: 30,
    backgroundColor: '#F4E7CF',
    borderWidth: 1,
    borderColor: '#C9B492',
  },
  avatarHero: {
    width: 82,
    height: 82,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHeroEmoji: {
    fontSize: 36,
  },
  heroTitle: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '800',
    color: '#4C3926',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#7A6750',
  },
  identity: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '800',
    color: '#4C3926',
  },
  identityMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#8C755B',
  },
  section: {
    marginTop: 16,
  },
  metricsGrid: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C755B',
  },
  metricValue: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '800',
    color: '#4C3926',
  },
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  cardHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4C3926',
  },
  cardHeaderAction: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8C755B',
  },
  cardBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#6D593F',
  },
  cardSpacer: {
    height: 10,
  },
  friendPreviewRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  friendBubble: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#D8C09B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBubbleEmoji: {
    fontSize: 24,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#D8C09B',
  },
  comingSoonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5A4630',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D9C5A6',
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#D8C09B',
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4C3926',
  },
  historyTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4C3926',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#8C755B',
  },
  historyXp: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A7241',
  },
  signOutButton: {
    marginTop: 18,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: '#8D6841',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF8EF',
  },
});

export default ProfileScreen;
