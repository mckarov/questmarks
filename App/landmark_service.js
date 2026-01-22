/**
 * LandmarkService.js
 * Service for fetching landmarks from Firebase with geolocation
 */

import firestore from '@react-native-firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';

class LandmarkService {
  constructor() {
    this.landmarksCollection = firestore().collection('landmarks');
  }

  /**
   * Get nearby landmarks within radius using geohash queries
   * @param {number} lat - User latitude
   * @param {number} lng - User longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Promise<Array>} Array of landmarks with distance
   */
  async getNearbyLandmarks(lat, lng, radiusKm = 50) {
    try {
      const center = [lat, lng];
      const radiusInM = radiusKm * 1000;

      // Calculate geohash query bounds
      const bounds = geohashQueryBounds(center, radiusInM);
      
      console.log(`Searching within ${radiusKm}km of [${lat}, ${lng}]`);
      console.log(`Geohash bounds:`, bounds);

      // Create promises for each geohash range query
      const promises = [];
      
      for (const b of bounds) {
        const query = this.landmarksCollection
          .orderBy('geohash')
          .startAt(b[0])
          .endAt(b[1]);
        
        promises.push(query.get());
      }

      // Execute all queries in parallel
      const snapshots = await Promise.all(promises);

      const matchingLandmarks = [];

      // Process results and filter by actual distance
      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const landmark = doc.data();

          // Calculate actual distance
          const distanceInKm = distanceBetween(
            [lat, lng],
            [landmark.lat, landmark.lng]
          );

          // Only include if within actual radius
          if (distanceInKm <= radiusKm) {
            matchingLandmarks.push({
              ...landmark,
              distance: distanceInKm,
            });
          }
        }
      }

      // Remove duplicates (in case of overlapping geohash queries)
      const uniqueLandmarks = this.removeDuplicates(matchingLandmarks);

      // Sort by distance (closest first)
      uniqueLandmarks.sort((a, b) => a.distance - b.distance);

      console.log(`Found ${uniqueLandmarks.length} unique landmarks`);

      return uniqueLandmarks;
    } catch (error) {
      console.error('Error in getNearbyLandmarks:', error);
      throw error;
    }
  }

  /**
   * Get landmarks by type
   * @param {string} type - Landmark type (WONDER, UNESCO, NATIONAL, etc.)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of landmarks
   */
  async getLandmarksByType(type, limit = 100) {
    try {
      const snapshot = await this.landmarksCollection
        .where('type', '==', type)
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error('Error in getLandmarksByType:', error);
      throw error;
    }
  }

  /**
   * Get landmarks by country
   * @param {string} country - Country name
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of landmarks
   */
  async getLandmarksByCountry(country, limit = 100) {
    try {
      const snapshot = await this.landmarksCollection
        .where('country', '==', country)
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error('Error in getLandmarksByCountry:', error);
      throw error;
    }
  }

  /**
   * Get single landmark by ID
   * @param {number} id - Landmark ID
   * @returns {Promise<Object|null>} Landmark data or null
   */
  async getLandmarkById(id) {
    try {
      const doc = await this.landmarksCollection.doc(String(id)).get();

      if (doc.exists) {
        return doc.data();
      }

      return null;
    } catch (error) {
      console.error('Error in getLandmarkById:', error);
      throw error;
    }
  }

  /**
   * Search landmarks by name (prefix search)
   * @param {string} searchTerm - Search query
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of matching landmarks
   */
  async searchLandmarks(searchTerm, limit = 50) {
    try {
      // Firestore prefix search using >= and <=
      const searchEnd = searchTerm.replace(/.$/, (c) =>
        String.fromCharCode(c.charCodeAt(0) + 1)
      );

      const snapshot = await this.landmarksCollection
        .where('name', '>=', searchTerm)
        .where('name', '<', searchEnd)
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error('Error in searchLandmarks:', error);
      throw error;
    }
  }

  /**
   * Get random landmarks (for discovery/exploration)
   * @param {number} count - Number of random landmarks to fetch
   * @returns {Promise<Array>} Array of random landmarks
   */
  async getRandomLandmarks(count = 10) {
    try {
      // Get total count first
      const countSnapshot = await this.landmarksCollection.count().get();
      const totalLandmarks = countSnapshot.data().count;

      if (totalLandmarks === 0) {
        return [];
      }

      // Generate random IDs
      const randomIds = [];
      for (let i = 0; i < count; i++) {
        const randomId = Math.floor(Math.random() * totalLandmarks) + 1;
        randomIds.push(randomId);
      }

      // Fetch landmarks
      const promises = randomIds.map((id) => this.getLandmarkById(id));
      const results = await Promise.all(promises);

      // Filter out nulls
      return results.filter((landmark) => landmark !== null);
    } catch (error) {
      console.error('Error in getRandomLandmarks:', error);
      throw error;
    }
  }

  /**
   * Get all World Wonders
   * @returns {Promise<Array>} Array of World Wonders
   */
  async getWorldWonders() {
    return this.getLandmarksByType('WONDER');
  }

  /**
   * Get all UNESCO sites
   * @returns {Promise<Array>} Array of UNESCO sites
   */
  async getUNESCOSites() {
    return this.getLandmarksByType('UNESCO');
  }

  /**
   * Get landmarks with pagination
   * @param {Object} lastDoc - Last document from previous query
   * @param {number} limit - Page size
   * @returns {Promise<Object>} Object with landmarks and lastDoc
   */
  async getLandmarksPaginated(lastDoc = null, limit = 50) {
    try {
      let query = this.landmarksCollection
        .orderBy('name')
        .limit(limit);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      return {
        landmarks: snapshot.docs.map((doc) => doc.data()),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === limit,
      };
    } catch (error) {
      console.error('Error in getLandmarksPaginated:', error);
      throw error;
    }
  }

  /**
   * Get statistics about landmarks
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    try {
      const snapshot = await this.landmarksCollection.get();
      const landmarks = snapshot.docs.map((doc) => doc.data());

      const stats = {
        total: landmarks.length,
        byType: {},
        byCountry: {},
      };

      landmarks.forEach((landmark) => {
        // Count by type
        stats.byType[landmark.type] = (stats.byType[landmark.type] || 0) + 1;

        // Count by country
        stats.byCountry[landmark.country] =
          (stats.byCountry[landmark.country] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error in getStatistics:', error);
      throw error;
    }
  }

  /**
   * Remove duplicate landmarks from array
   * @private
   */
  removeDuplicates(landmarks) {
    const seen = new Set();
    return landmarks.filter((landmark) => {
      const key = `${landmark.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate distance between two points (Haversine formula)
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
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
  }
}

export default new LandmarkService();