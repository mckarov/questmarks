import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WORLD_REGION } from '../constants/defaults';
import { isLetovoLandmark, MARKER_COLORS, TYPE_ICONS } from '../constants/game';
import { useAppContext } from '../context/AppContext';

const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#E8DCC5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6D593F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F8F1E3' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#BFA784' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#D8CDB3' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#DCC6A0' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#F5EAD6' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#D6C5A8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFBC93' }] },
];

const MARKER_RADIUS = 14;
const USER_FOCUS_DELTA = 0.009;

const markerDescription = landmark =>
  [landmark.country, landmark.distance ? `${landmark.distance.toFixed(1)} km` : null]
    .filter(Boolean)
    .join(' · ');

const LandmarkMap = ({
  userLocation,
  landmarks,
  selectedLandmark,
  visitedLandmarks,
  onSelect,
  isExpanded = false,
  onToggleExpand,
}) => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const expandedTopOffset = Math.max(insets.top + 14, 38);
  const [mapRegion, setMapRegion] = useState(WORLD_REGION);

  const handleRegionChangeComplete = useCallback(region => {
    setMapRegion({
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    });
  }, []);

  const focusWorld = () => {
    setMapRegion(WORLD_REGION);
    mapRef.current?.animateToRegion(WORLD_REGION, 400);
  };

  const focusUser = () => {
    if (!userLocation) {
      return;
    }

    const nextRegion = {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: USER_FOCUS_DELTA,
      longitudeDelta: USER_FOCUS_DELTA,
    };

    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(
      nextRegion,
      400
    );
  };

  const renderMarkers = () =>
    landmarks.map(landmark => {
      const selected = selectedLandmark && String(selectedLandmark.id) === String(landmark.id);
      const visited = visitedLandmarks.includes(landmark.id);
      const isLetovo = isLetovoLandmark(landmark);
      const markerIcon = isLetovo ? 'L' : TYPE_ICONS[landmark.type];
      const markerBackground = isLetovo
        ? '#356CB0'
        : visited
          ? '#7E6240'
          : MARKER_COLORS[landmark.type];
      const markerBorder = isLetovo
        ? '#F0CF58'
        : selected
          ? '#FFF7ED'
          : 'rgba(76, 57, 38, 0.2)';

      return (
        <Marker
          key={landmark.id}
          coordinate={{ latitude: landmark.lat, longitude: landmark.lng }}
          title={landmark.name}
          description={markerDescription(landmark)}
          onPress={() => onSelect(landmark)}
        >
          <View
            style={[
              styles.markerOuter,
              {
                backgroundColor: markerBackground,
                borderColor: markerBorder,
              },
            ]}
          >
            <Text style={styles.markerText}>{markerIcon}</Text>
          </View>
        </Marker>
      );
    });

  if (isExpanded) {
    return (
      <View style={styles.fullscreenShell}>
        <MapView
          ref={mapRef}
          style={styles.fullscreenMap}
          initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={MAP_STYLE}
          showsUserLocation={Boolean(userLocation)}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {renderMarkers()}
        </MapView>

        <View style={[styles.expandedControls, { top: expandedTopOffset }]}>
          <TouchableOpacity style={styles.controlButton} onPress={focusWorld}>
            <Text style={styles.controlButtonText}>{t('map.worldView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, !userLocation && styles.controlDisabled]}
            onPress={focusUser}
            disabled={!userLocation}
          >
            <Text style={styles.controlButtonText}>{t('map.centerOnMe')}</Text>
          </TouchableOpacity>
        </View>

        {onToggleExpand ? (
          <TouchableOpacity
            style={[styles.expandButton, styles.expandButtonFloating, { top: expandedTopOffset }]}
            onPress={onToggleExpand}
            accessibilityLabel={t('map.collapseMap')}
          >
            <Text style={styles.expandButtonIcon}>⇲</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.mapHeader}>
        <Text style={styles.title}>{t('map.worldMapTitle')}</Text>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={focusWorld}>
            <Text style={styles.controlButtonText}>{t('map.worldView')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, !userLocation && styles.controlDisabled]}
            onPress={focusUser}
            disabled={!userLocation}
          >
            <Text style={styles.controlButtonText}>{t('map.centerOnMe')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrap}>
        {onToggleExpand ? (
          <TouchableOpacity
            style={[styles.expandButton, styles.expandButtonCorner]}
            onPress={onToggleExpand}
            accessibilityLabel={t('map.expandMap')}
          >
            <Text style={styles.expandButtonIcon}>⇱</Text>
          </TouchableOpacity>
        ) : null}

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={MAP_STYLE}
          showsUserLocation={Boolean(userLocation)}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {renderMarkers()}
        </MapView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 18,
    borderRadius: 28,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
    shadowColor: '#8A6843',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  fullscreenShell: {
    flex: 1,
    backgroundColor: '#E9DDC7',
  },
  mapHeader: {
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4C3926',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  expandedControls: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF8EE',
    borderWidth: 1,
    borderColor: '#CCB795',
  },
  controlDisabled: {
    opacity: 0.55,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A4630',
  },
  mapWrap: {
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CCB795',
  },
  map: {
    width: '100%',
    height: 380,
  },
  fullscreenMap: {
    ...StyleSheet.absoluteFillObject,
  },
  expandButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 241, 227, 0.96)',
    borderWidth: 1,
    borderColor: '#CCB795',
    shadowColor: '#8A6843',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  expandButtonCorner: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
  },
  expandButtonFloating: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  expandButtonIcon: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5A4630',
  },
  markerOuter: {
    width: MARKER_RADIUS * 2,
    height: MARKER_RADIUS * 2,
    borderRadius: MARKER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    shadowColor: '#5A4630',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  markerText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF8EF',
  },
});

export default LandmarkMap;
