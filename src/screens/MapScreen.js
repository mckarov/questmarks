import React, { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LandmarkMap from '../components/LandmarkMap';
import {
  CHECK_IN_RADIUS_METERS,
  DEFAULT_LOCATION,
  SEARCH_RADIUS_KM,
} from '../constants/defaults';
import { getLandmarkXP, TYPE_LABELS } from '../constants/game';
import { useAppContext } from '../context/AppContext';
import LandmarkService from '../services/LandmarkService';
import ProximityNotificationService from '../services/ProximityNotificationService';
import UserService from '../services/UserService';
import { calculateDistanceKm, formatDistance } from '../utils/distance';

const TYPE_FILTERS = ['ALL', ...Object.keys(TYPE_LABELS)];
const STATUS_FILTERS = ['ANY', 'OPEN', 'VISITED'];
const SCOPE_FILTERS = ['ALL', 'NEARBY'];

const toRegion = location => ({
  latitude: location.latitude,
  longitude: location.longitude,
  latitudeDelta: location.latitudeDelta || DEFAULT_LOCATION.latitudeDelta,
  longitudeDelta: location.longitudeDelta || DEFAULT_LOCATION.longitudeDelta,
  label: location.label || DEFAULT_LOCATION.label,
});

const enrichLandmarks = (landmarks, location) =>
  landmarks
    .map(landmark => ({
      ...landmark,
      distance: location
        ? calculateDistanceKm(location.latitude, location.longitude, landmark.lat, landmark.lng)
        : null,
    }))
    .sort((left, right) => {
      const leftDistance = left.distance ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distance ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.name.localeCompare(right.name);
    });

const MapScreen = ({ onFullscreenChange }) => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const topContentInset = Math.max(insets.top + 8, 28);
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [allLandmarks, setAllLandmarks] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [visitedLandmarks, setVisitedLandmarks] = useState([]);
  const [userXP, setUserXP] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [typeFilter, setTypeFilter] = useState('REGIONAL');
  const [statusFilter, setStatusFilter] = useState('ANY');
  const [scopeFilter, setScopeFilter] = useState('NEARBY');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const boot = async () => {
      await loadUserProgress();
      await requestLocation();
    };

    boot();

    return () => {
      isMountedRef.current = false;
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onFullscreenChange?.(mapExpanded);

    return () => {
      onFullscreenChange?.(false);
    };
  }, [mapExpanded, onFullscreenChange]);

  const loadUserProgress = async () => {
    try {
      const progress = await UserService.getUserProgress();

      if (!isMountedRef.current || !progress) {
        return;
      }

      setUserXP(progress.xp || 0);
      setVisitedLandmarks(progress.visitedLandmarks || []);
    } catch (error) {
      console.log('Progress load failed:', error.message);
    }
  };

  const loadLandmarks = async location => {
    const landmarks = await LandmarkService.getAllLandmarks();

    if (!isMountedRef.current) {
      return;
    }

    setAllLandmarks(enrichLandmarks(landmarks, location));
  };

  const applyLocation = async nextLocation => {
    if (!isMountedRef.current) {
      return;
    }

    const region = toRegion(nextLocation);
    setUserLocation(region);

    try {
      await loadLandmarks(region);
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const applyDemoLocation = async () => {
    await applyLocation({
      ...DEFAULT_LOCATION,
    });
  };

  const requestLocation = async () => {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'QuestMarks location access',
          message: t('map.permissionNeeded'),
          buttonPositive: 'OK',
        }
      );

      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        await applyDemoLocation();
        return;
      }
    } else if (typeof Geolocation.requestAuthorization === 'function') {
      const permission = await Geolocation.requestAuthorization('whenInUse');
      if (permission !== 'granted') {
        await applyDemoLocation();
        return;
      }
    }

    Geolocation.getCurrentPosition(
      async position => {
        await applyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: t('map.deviceLocationLabel'),
        });
      },
      async error => {
        console.log('Location read failed:', error.message);
        await applyDemoLocation();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    watchIdRef.current = Geolocation.watchPosition(
      position => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: t('map.deviceLocationLabel'),
        };

        setUserLocation(current => ({
          ...(current || DEFAULT_LOCATION),
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
          label: nextLocation.label,
        }));
        setAllLandmarks(current => enrichLandmarks(current, nextLocation));
      },
      error => {
        console.log('Location watch failed:', error.message);
      },
      { enableHighAccuracy: true, distanceFilter: 25 }
    );
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadUserProgress();

    try {
      if (userLocation) {
        await loadLandmarks(userLocation);
      } else {
        await requestLocation();
        return;
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleCheckIn = async landmark => {
    if (!userLocation || !landmark) {
      return;
    }

    const distanceMeters = (landmark.distance || 0) * 1000;

    if (distanceMeters > CHECK_IN_RADIUS_METERS) {
      Alert.alert('QuestMarks', t('map.tooFar'));
      return;
    }

    setCheckingIn(true);

    try {
      const result = await UserService.checkIn(landmark.id, landmark.type, {
        name: landmark.name,
      });
      setUserXP(result.totalXP);
      setVisitedLandmarks(previous => [...previous, landmark.id]);
      ProximityNotificationService.refreshUserState();
      Alert.alert(
        t('map.success'),
        t('map.successMessage', {
          xp: result.xpGained,
          name: landmark.name,
        })
      );
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();

  const visibleLandmarks = allLandmarks.filter(landmark => {
    const matchesType = typeFilter === 'ALL' || landmark.type === typeFilter;
    const visited = visitedLandmarks.includes(landmark.id);
    const matchesStatus =
      statusFilter === 'ANY' ||
      (statusFilter === 'VISITED' && visited) ||
      (statusFilter === 'OPEN' && !visited);
    const matchesScope =
      scopeFilter === 'ALL' ||
      ((landmark.distance || Number.POSITIVE_INFINITY) <= SEARCH_RADIUS_KM);
    const matchesSearch =
      normalizedQuery.length === 0 ||
      landmark.name.toLowerCase().includes(normalizedQuery) ||
      landmark.country.toLowerCase().includes(normalizedQuery);

    return matchesType && matchesStatus && matchesScope && matchesSearch;
  });

  useEffect(() => {
    if (visibleLandmarks.length === 0) {
      setSelectedLandmark(null);
      return;
    }

    if (
      !selectedLandmark ||
      !visibleLandmarks.some(item => String(item.id) === String(selectedLandmark.id))
    ) {
      setSelectedLandmark(visibleLandmarks[0]);
    }
  }, [visibleLandmarks, selectedLandmark]);

  const renderChip = (label, value, currentValue, onPress) => {
    const active = value === currentValue;

    return (
      <TouchableOpacity
        key={value}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => onPress(value)}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSelectionCard = extraStyles => {
    if (!selectedLandmark) {
      return (
        <View style={[styles.emptyCard, extraStyles]}>
          <Text style={styles.emptyText}>{t('map.empty')}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.selectionCard, extraStyles]}>
        <Text style={styles.selectionLabel}>{t('map.selected')}</Text>
        <Text style={styles.selectionTitle}>{selectedLandmark.name}</Text>
        <Text style={styles.selectionSubtitle}>
          {selectedLandmark.country} · {TYPE_LABELS[selectedLandmark.type]}
        </Text>
        <View style={styles.selectionMeta}>
          <Text style={styles.selectionMetaText}>
            {t('map.distanceLabel')}: {formatDistance(selectedLandmark.distance || 0)}
          </Text>
          <Text style={styles.selectionMetaText}>
            {t('map.checkInRadius', { radius: CHECK_IN_RADIUS_METERS })}
          </Text>
          <Text style={styles.selectionMetaText}>+{getLandmarkXP(selectedLandmark)} XP</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            visitedLandmarks.includes(selectedLandmark.id) && styles.disabledButton,
          ]}
          onPress={() => handleCheckIn(selectedLandmark)}
          disabled={checkingIn || visitedLandmarks.includes(selectedLandmark.id)}
        >
          <Text
            style={[
              styles.primaryButtonText,
              visitedLandmarks.includes(selectedLandmark.id) && styles.disabledButtonText,
            ]}
          >
            {visitedLandmarks.includes(selectedLandmark.id)
              ? t('map.alreadyVisited')
              : checkingIn
                ? t('common.loading')
                : t('map.checkIn')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#A67F4F" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (mapExpanded) {
    return (
      <View style={styles.expandedShell}>
        <LandmarkMap
          userLocation={userLocation}
          landmarks={visibleLandmarks}
          selectedLandmark={selectedLandmark}
          visitedLandmarks={visitedLandmarks}
          onSelect={setSelectedLandmark}
          isExpanded
          onToggleExpand={() => setMapExpanded(false)}
        />
        {selectedLandmark
          ? renderSelectionCard([
              styles.expandedSelectionCard,
              { bottom: 18 + Math.max(insets.bottom, 6) },
            ])
          : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topContentInset }]}>
      <View style={styles.heroCard}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>{t('map.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('map.subtitleFull')}</Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricLabel}>{t('map.xpTotal')}</Text>
            <Text style={styles.heroMetricValue}>{userXP.toLocaleString()}</Text>
          </View>
          <View style={styles.heroMetric}>
            <Text style={styles.heroMetricLabel}>{t('profile.visits')}</Text>
            <Text style={styles.heroMetricValue}>{visitedLandmarks.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>{t('map.searchTitle')}</Text>
        <View style={styles.utilityRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleRefresh}
            accessibilityLabel={t('common.refresh')}
          >
            <Text style={styles.iconButtonText}>↻</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('map.searchPlaceholder')}
          placeholderTextColor="#8C755B"
        />

        <Text style={styles.filterLabel}>{t('map.scopeTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SCOPE_FILTERS.map(value =>
            renderChip(t(`map.scope.${value}`), value, scopeFilter, setScopeFilter)
          )}
        </ScrollView>

        <Text style={styles.filterLabel}>{t('map.typeTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPE_FILTERS.map(value =>
            renderChip(
              value === 'ALL' ? t('map.type.ALL') : TYPE_LABELS[value],
              value,
              typeFilter,
              setTypeFilter
            )
          )}
        </ScrollView>

        <Text style={styles.filterLabel}>{t('map.statusTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map(value =>
            renderChip(t(`map.status.${value}`), value, statusFilter, setStatusFilter)
          )}
        </ScrollView>
      </View>

      <LandmarkMap
        userLocation={userLocation}
        landmarks={visibleLandmarks}
        selectedLandmark={selectedLandmark}
        visitedLandmarks={visitedLandmarks}
        onSelect={setSelectedLandmark}
        onToggleExpand={() => setMapExpanded(true)}
      />

      {renderSelectionCard()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#E9DDC7',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9DDC7',
  },
  loadingText: {
    marginTop: 12,
    color: '#5A4630',
  },
  expandedShell: {
    flex: 1,
    backgroundColor: '#E9DDC7',
  },
  heroCard: {
    padding: 22,
    borderRadius: 30,
    backgroundColor: '#F4E7CF',
    borderWidth: 1,
    borderColor: '#C9B492',
  },
  heroTextWrap: {
    maxWidth: 420,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4C3926',
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: '#7A6750',
  },
  heroStats: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  heroMetric: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#D1B89A',
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C755B',
  },
  heroMetricValue: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#4C3926',
  },
  filterCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4C3926',
  },
  utilityRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#CCB795',
  },
  iconButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5A4630',
  },
  searchInput: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF9F0',
    color: '#4C3926',
    borderWidth: 1,
    borderColor: '#D1B89A',
  },
  filterLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#8C755B',
  },
  chipRow: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EFE2CA',
    borderWidth: 1,
    borderColor: '#CCB795',
  },
  filterChipActive: {
    backgroundColor: '#B08A58',
    borderColor: '#B08A58',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A4630',
  },
  filterChipTextActive: {
    color: '#FFF8EF',
  },
  selectionCard: {
    marginTop: 16,
    padding: 20,
    borderRadius: 26,
    backgroundColor: '#F4E7CF',
    borderWidth: 1,
    borderColor: '#C9B492',
  },
  expandedSelectionCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    marginTop: 0,
    backgroundColor: 'rgba(244, 231, 207, 0.96)',
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#9A7241',
  },
  selectionTitle: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
    color: '#4C3926',
  },
  selectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#7A6750',
  },
  selectionMeta: {
    marginTop: 16,
    gap: 8,
  },
  selectionMetaText: {
    fontSize: 13,
    color: '#6D593F',
  },
  primaryButton: {
    marginTop: 18,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#B08A58',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF8EF',
  },
  disabledButton: {
    backgroundColor: '#D6C5AB',
    borderWidth: 1,
    borderColor: '#BFA784',
  },
  disabledButtonText: {
    color: '#7A6750',
  },
  emptyCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  emptyText: {
    color: '#6D593F',
    lineHeight: 22,
  },
});

export default MapScreen;
