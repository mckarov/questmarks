import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MARKER_COLORS, TYPE_ICONS } from '../constants/game';
import { useAppContext } from '../context/AppContext';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const LandmarkMap = ({
  userLocation,
  landmarks,
  radiusKm,
  selectedLandmark,
  visitedLandmarks,
  onSelect,
}) => {
  const { t } = useAppContext();
  const mapSize = 260;
  const half = mapSize / 2;
  const maxUsableRadius = half - 20;
  const kmPerLat = 111;
  const kmPerLng = 111 * Math.cos((userLocation.latitude * Math.PI) / 180);

  return (
    <View style={styles.card}>
      <View style={styles.canvas}>
        {[0.35, 0.65, 0.95].map(scale => (
          <View
            key={scale}
            style={[
              styles.ring,
              {
                width: mapSize * scale,
                height: mapSize * scale,
                borderRadius: (mapSize * scale) / 2,
              },
            ]}
          />
        ))}

        <View style={styles.crosshairVertical} />
        <View style={styles.crosshairHorizontal} />

        <View style={styles.userMarker}>
          <Text style={styles.userMarkerText}>YOU</Text>
        </View>

        {landmarks.map(landmark => {
          const northSouthKm = (landmark.lat - userLocation.latitude) * kmPerLat;
          const eastWestKm = (landmark.lng - userLocation.longitude) * kmPerLng;
          const x = clamp(half + (eastWestKm / radiusKm) * maxUsableRadius, 12, mapSize - 12);
          const y = clamp(half - (northSouthKm / radiusKm) * maxUsableRadius, 12, mapSize - 12);
          const selected = selectedLandmark && String(selectedLandmark.id) === String(landmark.id);
          const visited = visitedLandmarks.includes(landmark.id);

          return (
            <TouchableOpacity
              key={landmark.id}
              style={[
                styles.landmarkMarker,
                {
                  left: x - 14,
                  top: y - 14,
                  backgroundColor: visited ? '#059669' : MARKER_COLORS[landmark.type],
                  borderColor: selected ? '#FDE68A' : '#0F172A',
                  transform: [{ scale: selected ? 1.15 : 1 }],
                },
              ]}
              onPress={() => onSelect(landmark)}
            >
              <Text style={styles.landmarkMarkerText}>{TYPE_ICONS[landmark.type]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.caption}>
        {t('map.radarCaption')} {radiusKm} km.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  canvas: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#0B1220',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: 260,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  crosshairHorizontal: {
    position: 'absolute',
    height: 1,
    width: 260,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  userMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderWidth: 3,
    borderColor: '#111827',
  },
  userMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  landmarkMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  landmarkMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  caption: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#94A3B8',
  },
});

export default LandmarkMap;
