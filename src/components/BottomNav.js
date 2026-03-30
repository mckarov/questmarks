import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ROUTES } from '../constants/defaults';
import { useAppContext } from '../context/AppContext';

const ROUTE_ICONS = {
  Leaderboard: 'TOP',
  Profile: 'YOU',
  About: 'INF',
  Settings: 'SET',
};

const BottomNav = ({ activeRoute, onSelect, bottomInset = 0 }) => {
  const { t } = useAppContext();
  const leftTabs = [ROUTES.LEADERBOARD, ROUTES.ABOUT];
  const rightTabs = [ROUTES.PROFILE, ROUTES.SETTINGS];

  const renderTab = route => {
    const active = activeRoute === route;
    return (
      <TouchableOpacity
        key={route}
        style={[
          styles.tab,
          route === ROUTES.LEADERBOARD && styles.leaderboardTab,
          active && styles.activeTab,
        ]}
        onPress={() => onSelect(route)}
      >
        <Text style={[styles.icon, active && styles.activeText]}>
          {ROUTE_ICONS[route]}
        </Text>
        <Text style={[styles.label, active && styles.activeText]}>
          {t(`nav.${route}`)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(bottomInset - 4, 4) }]}>
      <View style={styles.sideRail}>
        <View style={styles.tabCluster}>
          {leftTabs.map(renderTab)}
        </View>
        <View style={styles.centerGap} />
        <View style={styles.tabCluster}>
          {rightTabs.map(renderTab)}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.mapButton, activeRoute === ROUTES.MAP && styles.mapButtonActive]}
        onPress={() => onSelect(ROUTES.MAP)}
        accessibilityLabel={t('nav.Map')}
      >
        <View style={styles.mapPin}>
          <View style={styles.mapPinHead} />
          <View style={styles.mapPinTail} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  sideRail: {
    width: '100%',
    flexDirection: 'row',
    minHeight: 78,
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  tabCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-evenly',
    gap: 8,
  },
  centerGap: {
    width: 108,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingVertical: 4,
    borderRadius: 16,
  },
  leaderboardTab: {
    transform: [{ translateY: 0 }],
  },
  activeTab: {
    backgroundColor: '#F8F1E3',
  },
  icon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C755B',
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    color: '#7A6750',
  },
  activeText: {
    color: '#4C3926',
  },
  mapButton: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 18,
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D6B483',
    borderWidth: 2,
    borderColor: '#B6925E',
    shadowColor: '#8A6843',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  mapButtonActive: {
    borderColor: '#7C5C33',
  },
  mapPin: {
    alignItems: 'center',
  },
  mapPinHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F140B',
  },
  mapPinTail: {
    width: 12,
    height: 12,
    marginTop: -2,
    backgroundColor: '#1F140B',
    transform: [{ rotate: '45deg' }],
  },
});

export default BottomNav;
