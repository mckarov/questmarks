import DemoStore from './DemoStore';
import { initializeFirebaseServices } from './firebaseBridge';
import { calculateDistanceKm } from '../utils/distance';

const normalizeLandmark = source => ({
  id: source.id,
  name: source.name,
  lat: Number(source.lat),
  lng: Number(source.lng),
  type: source.type,
  country: source.country || 'Unknown',
  geohash: source.geohash || null,
});

class LandmarkService {
  async getAllLandmarks() {
    const bridge = initializeFirebaseServices();

    if (!bridge.enabled) {
      return DemoStore.getLandmarks().map(normalizeLandmark);
    }

    try {
      const collected = [];
      let lastId = null;

      while (true) {
        let query = bridge
          .firestore()
          .collection('landmarks')
          .orderBy('id')
          .limit(500);

        if (lastId !== null) {
          query = query.startAfter(lastId);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          break;
        }

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          collected.push(
            normalizeLandmark({
              ...data,
              id: data.id ?? doc.id,
            })
          );
        });

        lastId = snapshot.docs[snapshot.docs.length - 1].data().id;

        if (snapshot.docs.length < 500) {
          break;
        }
      }

      if (collected.length === 0) {
        return DemoStore.getLandmarks().map(normalizeLandmark);
      }

      return collected;
    } catch (error) {
      console.log('Landmark fallback to demo data:', error.message);
      return DemoStore.getLandmarks().map(normalizeLandmark);
    }
  }

  async getNearbyLandmarks(lat, lng, radiusKm = 50) {
    const allLandmarks = await this.getAllLandmarks();

    return allLandmarks
      .map(landmark => ({
        ...landmark,
        distance: calculateDistanceKm(lat, lng, landmark.lat, landmark.lng),
      }))
      .filter(landmark => landmark.distance <= radiusKm)
      .sort((left, right) => left.distance - right.distance);
  }

  async getLandmarkById(landmarkId) {
    const landmarks = await this.getAllLandmarks();
    return landmarks.find(item => String(item.id) === String(landmarkId)) || null;
  }

  async getLandmarksByType(type) {
    const landmarks = await this.getAllLandmarks();
    return landmarks.filter(item => item.type === type);
  }

  async getLandmarksByCountry(country) {
    const landmarks = await this.getAllLandmarks();
    return landmarks.filter(item => item.country === country);
  }

  async getStatistics() {
    const landmarks = await this.getAllLandmarks();

    return landmarks.reduce(
      (stats, landmark) => {
        stats.total += 1;
        stats.byType[landmark.type] = (stats.byType[landmark.type] || 0) + 1;
        stats.byCountry[landmark.country] = (stats.byCountry[landmark.country] || 0) + 1;
        return stats;
      },
      {
        total: 0,
        byType: {},
        byCountry: {},
      }
    );
  }
}

export default new LandmarkService();
