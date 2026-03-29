/**
 * UserService.js
 * Service for managing user progress, check-ins, and XP
 */

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const XP_VALUES = {
  LOCAL: 10,
  SEMI_LOCAL: 50,
  REGIONAL: 100,
  NATIONAL: 200,
  UNESCO: 500,
  WONDER: 1000,
};

const RANKS = [
  { name: 'Wanderer', minXP: 0, maxXP: 99, icon: '🚶' },
  { name: 'Explorer', minXP: 100, maxXP: 499, icon: '🎒' },
  { name: 'Traveler', minXP: 500, maxXP: 999, icon: '🗺️' },
  { name: 'Adventurer', minXP: 1000, maxXP: 2499, icon: '⛰️' },
  { name: 'Voyager', minXP: 2500, maxXP: 4999, icon: '🧭' },
  { name: 'Discoverer', minXP: 5000, maxXP: 9999, icon: '🔭' },
  { name: 'Pathfinder', minXP: 10000, maxXP: 19999, icon: '🌍' },
  { name: 'Navigator', minXP: 20000, maxXP: 39999, icon: '⚓' },
  { name: 'Pioneer', minXP: 40000, maxXP: 74999, icon: '🚀' },
  { name: 'Globetrotter', minXP: 75000, maxXP: 149999, icon: '✈️' },
  { name: 'World Explorer', minXP: 150000, maxXP: 299999, icon: '🌏' },
  { name: 'Continental Master', minXP: 300000, maxXP: 599999, icon: '🏆' },
  { name: 'Geographic Legend', minXP: 600000, maxXP: 999999, icon: '⭐' },
  { name: 'Immortal Wanderer', minXP: 1000000, maxXP: Infinity, icon: '👑' },
];

class UserService {
  constructor() {
    this.usersCollection = firestore().collection('users');
    this.checkInsCollection = firestore().collection('checkIns');
  }

  /**
   * Get current user ID
   * @private
   */
  getCurrentUserId() {
    const user = auth().currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  /**
   * Initialize user profile (called on first login)
   */
  async initializeUser(displayName = 'Anonymous Explorer', email = '') {
    try {
      const userId = this.getCurrentUserId();

      const userDoc = await this.usersCollection.doc(userId).get();

      if (!userDoc.exists) {
        await this.usersCollection.doc(userId).set({
          displayName,
          email,
          xp: 0,
          visitedLandmarks: [],
          checkInCount: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
          lastCheckIn: null,
          stats: {
            LOCAL: 0,
            SEMI_LOCAL: 0,
            REGIONAL: 0,
            NATIONAL: 0,
            UNESCO: 0,
            WONDER: 0,
          },
        });

        console.log('User profile initialized');
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      throw error;
    }
  }

  /**
   * Check in at a landmark
   * @param {number} landmarkId - Landmark ID
   * @param {string} landmarkType - Landmark type
   * @returns {Promise<Object>} Check-in result with XP gained
   */
  async checkIn(landmarkId, landmarkType) {
    try {
      const userId = this.getCurrentUserId();
      const userRef = this.usersCollection.doc(userId);

      return await firestore().runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User profile not found');
        }

        const userData = userDoc.data();
        const visitedLandmarks = userData.visitedLandmarks || [];

        // Check if already visited
        if (visitedLandmarks.includes(landmarkId)) {
          throw new Error('Already visited this landmark');
        }

        // Calculate XP to award
        const xpGained = XP_VALUES[landmarkType] || 10;
        const newTotalXP = (userData.xp || 0) + xpGained;

        // Update user stats
        const stats = userData.stats || {};
        stats[landmarkType] = (stats[landmarkType] || 0) + 1;

        // Update user document
        transaction.update(userRef, {
          xp: newTotalXP,
          visitedLandmarks: firestore.FieldValue.arrayUnion(landmarkId),
          checkInCount: firestore.FieldValue.increment(1),
          lastCheckIn: firestore.FieldValue.serverTimestamp(),
          stats,
        });

        // Create check-in record
        const checkInRef = this.checkInsCollection.doc();
        transaction.set(checkInRef, {
          userId,
          landmarkId,
          landmarkType,
          xpGained,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

        console.log(
          `Check-in successful: ${landmarkId} (+${xpGained} XP). Total: ${newTotalXP}`
        );

        return {
          xpGained,
          totalXP: newTotalXP,
          checkInCount: userData.checkInCount + 1,
        };
      });
    } catch (error) {
      console.error('Error in checkIn:', error);
      throw error;
    }
  }

  /**
   * Get user progress/profile
   * @returns {Promise<Object>} User data
   */
  async getUserProgress() {
    try {
      const userId = this.getCurrentUserId();
      const doc = await this.usersCollection.doc(userId).get();

      if (doc.exists) {
        const data = doc.data();
        return {
          ...data,
          rank: this.calculateRank(data.xp || 0),
          nextRank: this.getNextRank(data.xp || 0),
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getUserProgress:', error);
      throw error;
    }
  }

  /**
   * Get user's check-in history
   * @param {number} limit - Number of records to fetch
   * @returns {Promise<Array>} Array of check-ins
   */
  async getCheckInHistory(limit = 50) {
    try {
      const userId = this.getCurrentUserId();

      const snapshot = await this.checkInsCollection
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error in getCheckInHistory:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard (top users by XP)
   * @param {number} limit - Number of users to fetch
   * @returns {Promise<Array>} Array of top users
   */
  async getLeaderboard(limit = 100) {
    try {
      const snapshot = await this.usersCollection
        .orderBy('xp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        userId: doc.id,
        ...doc.data(),
        rankInfo: this.calculateRank(doc.data().xp || 0),
      }));
    } catch (error) {
      console.error('Error in getLeaderboard:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Fields to update
   */
  async updateProfile(updates) {
    try {
      const userId = this.getCurrentUserId();
      await this.usersCollection.doc(userId).update(updates);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      throw error;
    }
  }

  /**
   * Calculate user rank based on XP
   * @param {number} xp - User's XP
   * @returns {Object} Rank information
   */
  calculateRank(xp) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
      if (xp >= RANKS[i].minXP) {
        return RANKS[i];
      }
    }
    return RANKS[0];
  }

  /**
   * Get next rank information
   * @param {number} xp - User's XP
   * @returns {Object|null} Next rank or null if at max rank
   */
  getNextRank(xp) {
    const currentRank = this.calculateRank(xp);
    const currentIndex = RANKS.findIndex(
      (r) => r.name === currentRank.name
    );

    if (currentIndex < RANKS.length - 1) {
      return RANKS[currentIndex + 1];
    }

    return null; // Max rank reached
  }

  /**
   * Calculate progress to next rank
   * @param {number} xp - User's XP
   * @returns {number} Progress percentage (0-100)
   */
  calculateRankProgress(xp) {
    const currentRank = this.calculateRank(xp);
    const nextRank = this.getNextRank(xp);

    if (!nextRank) {
      return 100; // Max rank
    }

    const currentRankXP = currentRank.minXP;
    const nextRankXP = nextRank.minXP;
    const progress =
      ((xp - currentRankXP) / (nextRankXP - currentRankXP)) * 100;

    return Math.min(100, Math.max(0, progress));
  }

  /**
   * Get all ranks (for display in profile)
   * @returns {Array} Array of all ranks
   */
  getAllRanks() {
    return RANKS;
  }

  /**
   * Check if user has visited a specific landmark
   * @param {number} landmarkId - Landmark ID
   * @returns {Promise<boolean>} True if visited
   */
  async hasVisitedLandmark(landmarkId) {
    try {
      const userId = this.getCurrentUserId();
      const doc = await this.usersCollection.doc(userId).get();

      if (doc.exists) {
        const visitedLandmarks = doc.data().visitedLandmarks || [];
        return visitedLandmarks.includes(landmarkId);
      }

      return false;
    } catch (error) {
      console.error('Error in hasVisitedLandmark:', error);
      return false;
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      const userId = this.getCurrentUserId();
      const doc = await this.usersCollection.doc(userId).get();

      if (doc.exists) {
        const data = doc.data();
        const rank = this.calculateRank(data.xp || 0);
        const nextRank = this.getNextRank(data.xp || 0);
        const progress = this.calculateRankProgress(data.xp || 0);

        return {
          xp: data.xp || 0,
          checkInCount: data.checkInCount || 0,
          visitedCount: (data.visitedLandmarks || []).length,
          rank,
          nextRank,
          rankProgress: progress,
          stats: data.stats || {},
          lastCheckIn: data.lastCheckIn,
          createdAt: data.createdAt,
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getUserStats:', error);
      throw error;
    }
  }

  /**
   * Delete user account and all data
   * WARNING: This is irreversible!
   */
  async deleteAccount() {
    try {
      const userId = this.getCurrentUserId();

      // Delete user document
      await this.usersCollection.doc(userId).delete();

      // Delete all check-ins
      const checkIns = await this.checkInsCollection
        .where('userId', '==', userId)
        .get();

      const batch = firestore().batch();
      checkIns.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete Firebase Auth user
      await auth().currentUser.delete();

      console.log('User account deleted');
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      throw error;
    }
  }
}

export default new UserService();