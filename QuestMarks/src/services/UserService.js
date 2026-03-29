import AuthService from './AuthService';
import DemoStore from './DemoStore';
import { RANKS, XP_VALUES } from '../constants/game';
import { initializeFirebaseServices } from './firebaseBridge';

class UserService {
  getCurrentUserId() {
    const user = AuthService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return user.uid;
  }

  async initializeUser(displayName = 'Explorer', email = '') {
    const bridge = initializeFirebaseServices();
    const user = AuthService.getCurrentUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!bridge.enabled) {
      return DemoStore.ensureUserProfile({
        uid: user.uid,
        email: email || user.email,
        displayName: displayName || user.displayName,
      });
    }

    const userRef = bridge.firestore().collection('users').doc(user.uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      await userRef.set({
        displayName: displayName || user.displayName || 'Explorer',
        email: email || user.email || '',
        xp: 0,
        visitedLandmarks: [],
        checkInCount: 0,
        createdAt: bridge.firestore.FieldValue.serverTimestamp(),
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
    }

    return this.getUserProgress();
  }

  calculateRank(xp) {
    for (let index = RANKS.length - 1; index >= 0; index -= 1) {
      if (xp >= RANKS[index].minXP) {
        return RANKS[index];
      }
    }

    return RANKS[0];
  }

  getNextRank(xp) {
    const currentRank = this.calculateRank(xp);
    const rankIndex = RANKS.findIndex(rank => rank.name === currentRank.name);
    return rankIndex >= 0 && rankIndex < RANKS.length - 1 ? RANKS[rankIndex + 1] : null;
  }

  calculateRankProgress(xp) {
    const currentRank = this.calculateRank(xp);
    const nextRank = this.getNextRank(xp);

    if (!nextRank) {
      return 100;
    }

    return Math.max(
      0,
      Math.min(
        100,
        ((xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100
      )
    );
  }

  async getUserProgress() {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      const record = DemoStore.getUserRecord(userId);
      if (!record) {
        return null;
      }

      return {
        ...record,
        rank: this.calculateRank(record.xp),
        nextRank: this.getNextRank(record.xp),
        rankProgress: this.calculateRankProgress(record.xp),
      };
    }

    const snapshot = await bridge.firestore().collection('users').doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    return {
      ...data,
      rank: this.calculateRank(data.xp || 0),
      nextRank: this.getNextRank(data.xp || 0),
      rankProgress: this.calculateRankProgress(data.xp || 0),
    };
  }

  async getUserStats() {
    const progress = await this.getUserProgress();

    if (!progress) {
      return null;
    }

    return {
      xp: progress.xp || 0,
      checkInCount: progress.checkInCount || 0,
      visitedCount: (progress.visitedLandmarks || []).length,
      rank: progress.rank,
      nextRank: progress.nextRank,
      rankProgress: progress.rankProgress ?? this.calculateRankProgress(progress.xp || 0),
      stats: progress.stats || {},
      lastCheckIn: progress.lastCheckIn || null,
      createdAt: progress.createdAt || null,
    };
  }

  async getCheckInHistory(limit = 10) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      return DemoStore.getCheckIns(userId).slice(0, limit);
    }

    const snapshot = await bridge
      .firestore()
      .collection('checkIns')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  async checkIn(landmarkId, landmarkType) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      return DemoStore.recordCheckIn(userId, landmarkId, landmarkType);
    }

    const userRef = bridge.firestore().collection('users').doc(userId);

    return bridge.firestore().runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      const visitedLandmarks = userData.visitedLandmarks || [];

      if (visitedLandmarks.includes(landmarkId)) {
        throw new Error('Already visited this landmark');
      }

      const xpGained = XP_VALUES[landmarkType] || XP_VALUES.LOCAL;
      const totalXP = (userData.xp || 0) + xpGained;
      const updatedStats = {
        ...(userData.stats || {}),
        [landmarkType]: ((userData.stats || {})[landmarkType] || 0) + 1,
      };

      transaction.update(userRef, {
        xp: totalXP,
        visitedLandmarks: bridge.firestore.FieldValue.arrayUnion(landmarkId),
        checkInCount: bridge.firestore.FieldValue.increment(1),
        lastCheckIn: bridge.firestore.FieldValue.serverTimestamp(),
        stats: updatedStats,
      });

      const checkInRef = bridge.firestore().collection('checkIns').doc();
      transaction.set(checkInRef, {
        userId,
        landmarkId,
        landmarkType,
        xpGained,
        timestamp: bridge.firestore.FieldValue.serverTimestamp(),
      });

      return {
        xpGained,
        totalXP,
        checkInCount: (userData.checkInCount || 0) + 1,
      };
    });
  }

  async updateProfile(updates) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      return DemoStore.updateUserRecord(userId, updates);
    }

    await bridge.firestore().collection('users').doc(userId).update(updates);
    return this.getUserProgress();
  }

  async getLeaderboard(limit = 20) {
    const bridge = initializeFirebaseServices();

    if (!bridge.enabled) {
      return DemoStore.getLeaderboard()
        .slice(0, limit)
        .map((record, index) => ({
          rank: index + 1,
          userId: record.uid,
          displayName: record.displayName,
          xp: record.xp,
          checkInCount: record.checkInCount,
          visitedLandmarks: record.visitedLandmarks,
          rankInfo: this.calculateRank(record.xp),
        }));
    }

    const snapshot = await bridge
      .firestore()
      .collection('users')
      .orderBy('xp', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      userId: doc.id,
      ...doc.data(),
      rankInfo: this.calculateRank(doc.data().xp || 0),
    }));
  }
}

export default new UserService();
