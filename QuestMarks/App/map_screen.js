/**
 * MapScreen.js
 * Main map view showing user location and nearby landmarks
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import LandmarkService from '../services/LandmarkService';
import UserService from '../services/UserService';

const { width, height } = Dimensions.get('window');

// XP values for each landmark type
const XP_VALUES = {
  LOCAL: 10,
  SEMI_LOCAL: 50,
  REGIONAL: 100,
  NATIONAL: 200,
  UNESCO: 500,
  WONDER: 1000,
};

// Marker colors for each type
const MARKER_COLORS = {
  LOCAL: '#6B7280',
  SEMI_LOCAL: '#3B82F6',
  REGIONAL: '#10B981',
  NATIONAL: '#8B5CF6',
  UNESCO: '#F59E0B',
  WONDER: '#EF4444',
};

// Icons for each type
const TYPE_ICONS = {
  LOCAL: '📍',
  SEMI_LOCAL: '🏛️',
  REGIONAL: '🌲',
  NATIONAL: '🏰',
  UNESCO: '⭐',
  WONDER: '👑',
};

const MapScreen = ({ navigation }) => {
  const mapRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [landmarks, setLandmarks] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userXP, setUserXP] = useState(0);
  const [visitedLandmarks, setVisitedLandmarks] = useState([]);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    requestLocationPermission();
    loadUserProgress();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const result = await request(
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );

      if (result === RESULTS.GRANTED) {
        startLocationTracking();
      } else {
        Alert.alert(
          'Location Permission',
          'Questmarks needs location access to show nearby landmarks'
        );
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const startLocationTracking = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = {
          latitude,
          longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setUserLocation(location);
        setLoading(false);
        loadNearbyLandmarks(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        setLoading(false);
        Alert.alert('Error', 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Watch position for real-time updates
    const watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
      },
      (error) => console.error('Watch error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => Geolocation.clearWatch(watchId);
  };

  const loadUserProgress = async () => {
    try {
      const progress = await UserService.getUserProgress();
      if (progress) {
        setUserXP(progress.xp || 0);
        setVisitedLandmarks(progress.visitedLandmarks || []);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  };

  const loadNearbyLandmarks = async (lat, lng) => {
    try {
      console.log('Loading landmarks near:', lat, lng);
      
      // Fetch landmarks within 50km radius
      const nearby = await LandmarkService.getNearbyLandmarks(lat, lng, 50);
      
      console.log(`Found ${nearby.length} landmarks`);
      setLandmarks(nearby);
      
      // Animate map to show landmarks
      if (nearby.length > 0 && mapRef.current) {
        const coordinates = nearby.map((lm) => ({
          latitude: lm.lat,
          longitude: lm.lng,
        }));
        
        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error loading landmarks:', error);
      Alert.alert('Error', 'Failed to load landmarks');
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCheckIn = async () => {
    if (!selectedLandmark || !userLocation) return;

    setCheckingIn(true);

    try {
      // Calculate distance
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        selectedLandmark.lat,
        selectedLandmark.lng
      );

      console.log(`Distance to landmark: ${distance.toFixed(2)} km`);

      // Must be within 100m (0.1 km)
      if (distance > 0.1) {
        Alert.alert(
          'Too Far Away',
          `You need to be within 100m of the landmark. You are ${(distance * 1000).toFixed(0)}m away.`,
          [{ text: 'OK' }]
        );
        setCheckingIn(false);
        return;
      }

      // Check in
      const result = await UserService.checkIn(
        selectedLandmark.id,
        selectedLandmark.type
      );

      // Update local state
      setUserXP(result.totalXP);
      setVisitedLandmarks((prev) => [...prev, selectedLandmark.id]);

      // Show success
      Alert.alert(
        '🎉 Check-in Successful!',
        `You visited ${selectedLandmark.name}!\n\n+${result.xpGained} XP\nTotal XP: ${result.totalXP}`,
        [{ text: 'Awesome!', onPress: () => setSelectedLandmark(null) }]
      );
    } catch (error) {
      console.error('Check-in error:', error);
      
      if (error.message === 'Already visited this landmark') {
        Alert.alert('Already Visited', 'You have already checked in at this landmark.');
      } else {
        Alert.alert('Error', 'Failed to check in. Please try again.');
      }
    } finally {
      setCheckingIn(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(userLocation, 1000);
    }
  };

  const isLandmarkVisited = (landmarkId) => {
    return visitedLandmarks.includes(landmarkId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={userLocation}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        loadingEnabled={true}
      >
        {/* User location circle */}
        {userLocation && (
          <Circle
            center={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            radius={100} // 100m check-in radius
            strokeColor="rgba(139, 92, 246, 0.5)"
            fillColor="rgba(139, 92, 246, 0.1)"
          />
        )}

        {/* Landmark markers */}
        {landmarks.map((landmark) => {
          const visited = isLandmarkVisited(landmark.id);
          
          return (
            <Marker
              key={landmark.id}
              coordinate={{
                latitude: landmark.lat,
                longitude: landmark.lng,
              }}
              pinColor={visited ? '#10B981' : MARKER_COLORS[landmark.type]}
              onPress={() => setSelectedLandmark(landmark)}
              title={landmark.name}
              description={`${TYPE_ICONS[landmark.type]} +${XP_VALUES[landmark.type]} XP`}
            >
              <View style={[
                styles.customMarker,
                { backgroundColor: visited ? '#10B981' : MARKER_COLORS[landmark.type] }
              ]}>
                <Text style={styles.markerIcon}>{TYPE_ICONS[landmark.type]}</Text>
                {visited && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* XP Display */}
      <View style={styles.xpContainer}>
        <Text style={styles.xpLabel}>Total XP</Text>
        <Text style={styles.xpValue}>{userXP.toLocaleString()}</Text>
      </View>

      {/* Center on User Button */}
      <TouchableOpacity style={styles.centerButton} onPress={centerOnUser}>
        <Text style={styles.centerButtonText}>📍</Text>
      </TouchableOpacity>

      {/* Profile Button */}
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Text style={styles.profileButtonText}>👤</Text>
      </TouchableOpacity>

      {/* Landmark Detail Modal */}
      {selectedLandmark && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedLandmark(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>
                    {TYPE_ICONS[selectedLandmark.type]}
                  </Text>
                  <View style={styles.modalHeaderText}>
                    <Text style={styles.modalTitle}>{selectedLandmark.name}</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedLandmark.country}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedLandmark(null)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: MARKER_COLORS[selectedLandmark.type] },
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {selectedLandmark.type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>XP Reward</Text>
                    <Text style={styles.detailValue}>
                      +{XP_VALUES[selectedLandmark.type]} XP
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>
                      {userLocation
                        ? `${calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            selectedLandmark.lat,
                            selectedLandmark.lng
                          ).toFixed(2)} km`
                        : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Coordinates</Text>
                    <Text style={styles.detailValue}>
                      {selectedLandmark.lat.toFixed(4)}, {selectedLandmark.lng.toFixed(4)}
                    </Text>
                  </View>
                </View>

                {/* Check-in Button */}
                {isLandmarkVisited(selectedLandmark.id) ? (
                  <View style={styles.visitedButton}>
                    <Text style={styles.visitedButtonText}>✓ Already Visited</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.checkInButton}
                    onPress={handleCheckIn}
                    disabled={checkingIn}
                  >
                    <Text style={styles.checkInButtonText}>
                      {checkingIn ? 'Checking in...' : 'Check In'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Landmark Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {landmarks.length} landmarks nearby
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  markerIcon: {
    fontSize: 20,
  },
  checkMark: {
    position: 'absolute',
    top: -5,
    right: -5,
    fontSize: 16,
    color: 'white',
    backgroundColor: '#10B981',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  xpContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  xpLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  xpValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  centerButtonText: {
    fontSize: 24,
  },
  profileButton: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    backgroundColor: '#8B5CF6',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileButtonText: {
    fontSize: 24,
  },
  counterContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6B7280',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  checkInButton: {
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  visitedButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  visitedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MapScreen;