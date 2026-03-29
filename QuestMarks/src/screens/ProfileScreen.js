import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LanguageSwitcher from '../components/LanguageSwitcher';
import RankBadge from '../components/RankBadge';
import { ROUTES } from '../constants/defaults';
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

const ProfileScreen = ({ user, navigate }) => {
  const { t } = useAppContext();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const modeInfo = AuthService.getModeInfo();

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [nextStats, nextHistory] = await Promise.all([
        UserService.getUserStats(),
        UserService.getCheckInHistory(5),
      ]);

      if (!mounted) {
        return;
      }

      setStats(nextStats);
      setHistory(nextHistory);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user.uid]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{t('profile.title')}</Text>
        <Text style={styles.heroSubtitle}>{t('profile.subtitle')}</Text>
        <Text style={styles.identity}>{user.displayName || user.email}</Text>
        <Text style={styles.identityMeta}>{user.email}</Text>
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
        <Text style={styles.cardTitle}>{t('profile.language')}</Text>
        <View style={styles.cardSpacer} />
        <LanguageSwitcher />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.accountMode')}</Text>
        <Text style={styles.cardBody}>
          {modeInfo.mode === 'firebase' ? t('mode.firebaseReady') : t('mode.firebaseMissing')}
        </Text>
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

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigate(ROUTES.ABOUT)}>
        <Text style={styles.secondaryButtonText}>{t('profile.projectButton')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={() => AuthService.signOut()}>
        <Text style={styles.signOutText}>{t('common.signOut')}</Text>
      </TouchableOpacity>
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
  identity: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  identityMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#94A3B8',
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
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  metricValue: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: '800',
    color: '#F9FAFB',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  cardBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#CBD5E1',
  },
  cardSpacer: {
    height: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#22304A',
  },
  historyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0F172A',
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDBA74',
  },
  historyTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  historyMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  historyXp: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  secondaryButton: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  signOutButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#7F1D1D',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FEE2E2',
  },
});

export default ProfileScreen;
