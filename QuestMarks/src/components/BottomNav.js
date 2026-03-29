import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ROUTE_ORDER } from '../constants/defaults';
import { useAppContext } from '../context/AppContext';

const ROUTE_ICONS = {
  Map: 'MAP',
  Leaderboard: 'TOP',
  Profile: 'ME',
  About: 'DOC',
};

const BottomNav = ({ activeRoute, onSelect }) => {
  const { t } = useAppContext();

  return (
    <View style={styles.container}>
      {ROUTE_ORDER.map(route => {
        const active = route === activeRoute;

        return (
          <TouchableOpacity
            key={route}
            style={[styles.tab, active && styles.activeTab]}
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
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    backgroundColor: '#0B1220',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#172033',
  },
  icon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  activeText: {
    color: '#F97316',
  },
});

export default BottomNav;

