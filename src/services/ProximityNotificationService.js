import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { CHECK_IN_RADIUS_METERS } from '../constants/defaults';
import { calculateDistanceKm } from '../utils/distance';
import LandmarkService from './LandmarkService';
import NotificationService from './NotificationService';
import UserService from './UserService';

const PROGRESS_REFRESH_MS = 15000;
const LANDMARK_REFRESH_MS = 5 * 60 * 1000;

class ProximityNotificationService {
  constructor() {
    this.watchId = null;
    this.activeUserId = null;
    this.landmarks = [];
    this.landmarksLoadedAt = 0;
    this.progressCache = null;
    this.progressLoadedAt = 0;
    this.insideRadiusIds = new Set();
  }

  async start(userId) {
    if (!userId) {
      this.stop();
      return;
    }

    if (this.watchId !== null && this.activeUserId === userId) {
      return;
    }

    this.stop();
    this.activeUserId = userId;

    const locationGranted = await this.requestLocationPermission();
    if (!locationGranted) {
      return;
    }

    const notificationGranted = await NotificationService.requestPermission();
    if (!notificationGranted) {
      return;
    }

    await NotificationService.ensureChannel();
    await NotificationService.startForegroundMonitoring();
    await this.loadLandmarks(true);
    await this.loadProgress(true);

    this.watchId = Geolocation.watchPosition(
      position => {
        this.handleLocation(position.coords).catch(error => {
          console.log('Proximity check failed:', error.message);
        });
      },
      error => {
        console.log('Proximity location watch failed:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 25,
        interval: 20000,
        fastestInterval: 10000,
        showsBackgroundLocationIndicator: true,
      }
    );
  }

  stop() {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    NotificationService.stopForegroundMonitoring().catch(error => {
      console.log('Foreground monitor stop failed:', error.message);
    });

    this.activeUserId = null;
    this.insideRadiusIds = new Set();
    this.progressCache = null;
    this.progressLoadedAt = 0;
  }

  async refreshUserState() {
    if (this.activeUserId && this.watchId === null) {
      await this.start(this.activeUserId);
      return;
    }

    this.progressLoadedAt = 0;
    await this.loadProgress(true).catch(error => {
      console.log('Proximity progress refresh failed:', error.message);
    });
  }

  async refreshLandmarks() {
    this.landmarksLoadedAt = 0;
    await this.loadLandmarks(true).catch(error => {
      console.log('Proximity landmark refresh failed:', error.message);
    });
  }

  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      const fineResult = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (fineResult !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }

      if (Platform.Version >= 29) {
        const backgroundResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
        return backgroundResult === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    }

    if (typeof Geolocation.requestAuthorization === 'function') {
      const permission = await Geolocation.requestAuthorization('always');
      return permission === 'granted';
    }

    return true;
  }

  async loadLandmarks(force = false) {
    if (
      !force &&
      this.landmarks.length > 0 &&
      Date.now() - this.landmarksLoadedAt < LANDMARK_REFRESH_MS
    ) {
      return this.landmarks;
    }

    this.landmarks = await LandmarkService.getAllLandmarks();
    this.landmarksLoadedAt = Date.now();
    return this.landmarks;
  }

  async loadProgress(force = false) {
    if (
      !force &&
      this.progressCache &&
      Date.now() - this.progressLoadedAt < PROGRESS_REFRESH_MS
    ) {
      return this.progressCache;
    }

    this.progressCache = await UserService.getUserProgress();
    this.progressLoadedAt = Date.now();
    return this.progressCache;
  }

  async handleLocation(coords) {
    if (!this.activeUserId) {
      return;
    }

    const [landmarks, progress] = await Promise.all([
      this.loadLandmarks(),
      this.loadProgress(),
    ]);

    if (!progress) {
      return;
    }

    const allowedTypes = new Set(progress.notificationTypes || []);
    if (allowedTypes.size === 0) {
      this.insideRadiusIds = new Set();
      return;
    }

    const visitedLandmarks = new Set(progress.visitedLandmarks || []);
    const insideNow = new Set();

    for (const landmark of landmarks) {
      if (visitedLandmarks.has(landmark.id)) {
        continue;
      }

      if (!allowedTypes.has(landmark.type)) {
        continue;
      }

      const distanceMeters =
        calculateDistanceKm(
          coords.latitude,
          coords.longitude,
          landmark.lat,
          landmark.lng
        ) * 1000;

      if (distanceMeters > CHECK_IN_RADIUS_METERS) {
        continue;
      }

      const key = String(landmark.id);
      insideNow.add(key);

      if (!this.insideRadiusIds.has(key)) {
        await NotificationService.displayLandmarkNotification(landmark);
      }
    }

    this.insideRadiusIds = insideNow;
  }
}

export default new ProximityNotificationService();
