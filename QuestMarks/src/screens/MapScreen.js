import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import LandmarkCard from '../components/LandmarkCard';
import LandmarkMap from '../components/LandmarkMap';
import { CHECK_IN_RADIUS_METERS, DEFAULT_LOCATION, ROUTES, SEARCH_RADIUS_KM } from '../constants/defaults';
import { TYPE_LABELS, XP_VALUES } from '../constants/game';
import { useAppContext } from '../context/AppContext';
import LandmarkService from '../services/LandmarkService';
import UserService from '../services/UserService';
import { formatDistance } from '../utils/distance';

const toRegion = location => ({
  latitude: location.latitude,
  longitude: location.longitude,
  latitudeDelta: location.latitudeDelta || DEFAULT_LOCATION.latitudeDelta,
  longitudeDelta: location.longitudeDelta || DEFAULT_LOCATION.longitudeDelta,
  label: location.label || DEFAULT_LOCATION.label,
});

const MapScreen = ({ user, navigate }) => {
  const { t } = useAppContext();
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [landmarks, setLandmarks] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [visitedLandmarks, setVisitedLandmarks] = useState([]);
  const [userXP, setUserXP] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

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
  }, []);

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

  const applyLocation = async (nextLocation, message) => {
    if (!isMountedRef.current) {
      return;
    }

    const region = toRegion(nextLocation);
    setUserLocation(region);
    setStatusMessage(message);

    try {
      const nearby = await LandmarkService.getNearbyLandmarks(
        region.latitude,
        region.longitude,
        SEARCH_RADIUS_KM
      );

      if (!isMountedRef.current) {
        return;
      }

      setLandmarks(nearby);
      if (!selectedLandmark && nearby.length > 0) {
        setSelectedLandmark(nearby[0]);
      }
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const useDemoLocation = async reason => {
    await applyLocation(
      {
        ...DEFAULT_LOCATION,
      },
      reason
    );
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
        await useDemoLocation(t('map.locationDenied'));
        return;
      }
    } else if (typeof Geolocation.requestAuthorization === 'function') {
      const permission = await Geolocation.requestAuthorization('whenInUse');
      if (permission !== 'granted') {
        await useDemoLocation(t('map.locationDenied'));
        return;
      }
    }

    Geolocation.getCurrentPosition(
      async position => {
        await applyLocation(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: t('map.deviceLocationLabel'),
          },
          t('map.usingLocation', {
            label: t('map.deviceLocationLabel'),
          })
        );
      },
      async error => {
        console.log('Location read failed:', error.message);
        await useDemoLocation(t('map.locationError'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    watchIdRef.current = Geolocation.watchPosition(
      position => {
        setUserLocation(current => ({
          ...(current || DEFAULT_LOCATION),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
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
    if (userLocation) {
      await applyLocation(userLocation, statusMessage || t('map.demoHint'));
    } else {
      await requestLocation();
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
      const result = await UserService.checkIn(landmark.id, landmark.type);
      setUserXP(result.totalXP);
      setVisitedLandmarks(previous => [...previous, landmark.id]);
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

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.heroTitle}>{t('map.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('map.subtitle', { radius: SEARCH_RADIUS_KM })}
          </Text>
        </View>
        <View style={styles.heroMetric}>
          <Text style={styles.heroMetricLabel}>{t('map.xpTotal')}</Text>
          <Text style={styles.heroMetricValue}>{userXP.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <Text style={styles.statusSubtext}>
          {t('map.nearbyCount', { count: landmarks.length })}
        </Text>
        <View style={styles.statusActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRefresh}>
            <Text style={styles.secondaryButtonText}>{t('common.refresh')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => useDemoLocation(t('map.demoHint'))}
          >
            <Text style={styles.secondaryButtonText}>{t('map.useDemoLocation')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigate(ROUTES.PROFILE)}
          >
            <Text style={styles.secondaryButtonText}>{t('nav.Profile')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {userLocation ? (
        <LandmarkMap
          userLocation={userLocation}
          landmarks={landmarks}
          radiusKm={SEARCH_RADIUS_KM}
          selectedLandmark={selectedLandmark}
          visitedLandmarks={visitedLandmarks}
          onSelect={setSelectedLandmark}
        />
      ) : null}

      {selectedLandmark ? (
        <View style={styles.selectionCard}>
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
              +{XP_VALUES[selectedLandmark.type]} XP
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              visitedLandmarks.includes(selectedLandmark.id) && styles.disabledButton,
            ]}
            onPress={() => handleCheckIn(selectedLandmark)}
            disabled={checkingIn || visitedLandmarks.includes(selectedLandmark.id)}
          >
            <Text style={styles.primaryButtonText}>
              {visitedLandmarks.includes(selectedLandmark.id)
                ? t('map.alreadyVisited')
                : checkingIn
                  ? t('common.loading')
                  : t('map.checkIn')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {landmarks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{t('map.empty')}</Text>
        </View>
      ) : null}

      <View style={styles.listWrap}>
        {landmarks.map(landmark => (
          <View key={landmark.id} style={styles.cardSpacer}>
            <LandmarkCard
              landmark={landmark}
              visited={visitedLandmarks.includes(landmark.id)}
              onSelect={setSelectedLandmark}
              actionLabel={t('map.checkIn')}
              onAction={handleCheckIn}
            />
          </View>
        ))}
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 12,
    color: '#D1D5DB',
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  heroMetric: {
    minWidth: 92,
    padding: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A1607',
  },
  heroMetricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDBA74',
  },
  heroMetricValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  statusCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  statusText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#F9FAFB',
  },
  statusSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: '#A5B4FC',
  },
  statusActions: {
    marginTop: 16,
    gap: 10,
  },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  selectionCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#94A3B8',
  },
  selectionTitle: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  selectionSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#CBD5E1',
  },
  selectionMeta: {
    marginTop: 14,
    gap: 8,
  },
  selectionMetaText: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  primaryButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F97316',
  },
  disabledButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#172033',
  },
  emptyText: {
    color: '#CBD5E1',
    lineHeight: 22,
  },
  listWrap: {
    marginTop: 16,
    gap: 12,
  },
  cardSpacer: {
    marginBottom: 12,
  },
});

export default MapScreen;
