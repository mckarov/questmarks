import AuthService from './AuthService';
import DemoStore from './DemoStore';
import { getLandmarkXP, LANDMARK_TYPES, RANKS } from '../constants/game';
import { initializeFirebaseServices } from './firebaseBridge';
import {
  buildFlagAvatarId,
  DEFAULT_AVATAR_ID,
  isFlagAvatarId,
} from '../constants/profile';

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183;

const createEmptyStats = () => ({
  LOCAL: 0,
  SEMI_LOCAL: 0,
  REGIONAL: 0,
  NATIONAL: 0,
  UNESCO: 0,
  WONDER: 0,
});

const toDateValue = value => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return new Date(value);
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
};

const decorateDisplayName = (displayName, countryFlag) =>
  `${displayName || 'Explorer'}${countryFlag ? ` ${countryFlag}` : ''}`;

const normalizeNotificationTypes = value => {
  const allowed = new Set(LANDMARK_TYPES);
  if (!Array.isArray(value)) {
    return [...LANDMARK_TYPES];
  }

  return value.filter(type => allowed.has(type));
};

const enrichUserRecord = record => ({
  ...record,
  displayName: record.displayName || 'Explorer',
  displayNameDecorated: decorateDisplayName(record.displayName || 'Explorer', record.countryFlag),
  avatarId: record.avatarId || DEFAULT_AVATAR_ID,
  countryCode: record.countryCode || null,
  countryName: record.countryName || null,
  countryFlag: record.countryFlag || null,
  countryChangedAt: record.countryChangedAt || null,
  countryClaimPending: Boolean(record.countryClaimPending),
  notificationTypes: normalizeNotificationTypes(record.notificationTypes),
});

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
      DemoStore.ensureUserProfile({
        uid: user.uid,
        email: email || user.email,
        displayName: displayName || user.displayName,
      });
      return this.getUserProgress();
    }

    const userRef = bridge.firestore().collection('users').doc(user.uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      await userRef.set({
        displayName: displayName || user.displayName || 'Explorer',
        email: email || user.email || '',
        avatarId: user.avatarId || DEFAULT_AVATAR_ID,
        countryCode: null,
        countryName: null,
        countryFlag: null,
        countryChangedAt: null,
        countryClaimPending: true,
        notificationTypes: [...LANDMARK_TYPES],
        xp: 0,
        visitedLandmarks: [],
        checkInCount: 0,
        createdAt: bridge.firestore.FieldValue.serverTimestamp(),
        lastCheckIn: null,
        stats: createEmptyStats(),
      });
    } else {
      const current = snapshot.data() || {};
      const patch = {};

      if (!current.displayName) {
        patch.displayName = displayName || user.displayName || 'Explorer';
      }
      if (!current.email) {
        patch.email = email || user.email || '';
      }
      if (!current.avatarId) {
        patch.avatarId = user.avatarId || DEFAULT_AVATAR_ID;
      }
      if (current.countryCode === undefined) {
        patch.countryCode = null;
      }
      if (current.countryName === undefined) {
        patch.countryName = null;
      }
      if (current.countryFlag === undefined) {
        patch.countryFlag = null;
      }
      if (current.countryChangedAt === undefined) {
        patch.countryChangedAt = null;
      }
      if (current.countryClaimPending === undefined) {
        patch.countryClaimPending = false;
      }
      if (!Array.isArray(current.notificationTypes)) {
        patch.notificationTypes = [...LANDMARK_TYPES];
      }
      if (!Array.isArray(current.visitedLandmarks)) {
        patch.visitedLandmarks = [];
      }
      if (typeof current.checkInCount !== 'number') {
        patch.checkInCount = 0;
      }
      if (!current.stats) {
        patch.stats = createEmptyStats();
      }

      if (Object.keys(patch).length > 0) {
        await userRef.set(patch, { merge: true });
      }
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

      return enrichUserRecord({
        ...record,
        rank: this.calculateRank(record.xp),
        nextRank: this.getNextRank(record.xp),
        rankProgress: this.calculateRankProgress(record.xp),
      });
    }

    const snapshot = await bridge.firestore().collection('users').doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    return enrichUserRecord({
      ...data,
      rank: this.calculateRank(data.xp || 0),
      nextRank: this.getNextRank(data.xp || 0),
      rankProgress: this.calculateRankProgress(data.xp || 0),
    });
  }

  async getUserStats() {
    const progress = await this.getUserProgress();

    if (!progress) {
      return null;
    }

    return {
      xp: progress.xp || 0,
      displayName: progress.displayName || 'Explorer',
      displayNameDecorated: progress.displayNameDecorated,
      email: progress.email || '',
      avatarId: progress.avatarId || DEFAULT_AVATAR_ID,
      countryCode: progress.countryCode || null,
      countryName: progress.countryName || null,
      countryFlag: progress.countryFlag || null,
      countryChangedAt: progress.countryChangedAt || null,
      countryClaimPending: Boolean(progress.countryClaimPending),
      notificationTypes: normalizeNotificationTypes(progress.notificationTypes),
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

  async checkIn(landmarkId, landmarkType, landmarkMeta = {}) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      return DemoStore.recordCheckIn(userId, landmarkId, landmarkType, landmarkMeta);
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

      const xpGained = getLandmarkXP({
        id: landmarkId,
        type: landmarkType,
        ...landmarkMeta,
      });
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

  getCountryChangeBlockedUntil(countryChangedAt) {
    const changedAt = toDateValue(countryChangedAt);

    if (!changedAt || Number.isNaN(changedAt.getTime())) {
      return null;
    }

    return new Date(changedAt.getTime() + SIX_MONTHS_MS);
  }

  assertCountryChangeAllowed(countryChangedAt) {
    const blockedUntil = this.getCountryChangeBlockedUntil(countryChangedAt);

    if (blockedUntil && blockedUntil.getTime() > Date.now()) {
      throw new Error(
        `You can change your country again on ${blockedUntil.toLocaleDateString()}.`
      );
    }
  }

  async updateProfile(updates) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();
    const progress = await this.getUserProgress();
    const nextUpdates = { ...updates };

    if (isFlagAvatarId(nextUpdates.avatarId)) {
      nextUpdates.avatarId = progress?.countryCode
        ? buildFlagAvatarId(progress.countryCode)
        : DEFAULT_AVATAR_ID;
    }

    if (!bridge.enabled) {
      DemoStore.updateUserRecord(userId, nextUpdates);
      return this.getUserProgress();
    }

    const authUpdates = {};
    if (typeof nextUpdates.displayName === 'string' && nextUpdates.displayName.trim()) {
      authUpdates.displayName = nextUpdates.displayName.trim();
    }
    if (typeof nextUpdates.avatarId === 'string' && nextUpdates.avatarId.trim()) {
      authUpdates.photoURL = nextUpdates.avatarId.trim();
    }

    if (Object.keys(authUpdates).length > 0 && bridge.auth().currentUser) {
      await bridge.auth().currentUser.updateProfile(authUpdates);
    }

    await bridge.firestore().collection('users').doc(userId).update(nextUpdates);
    return this.getUserProgress();
  }

  async claimCountry(country) {
    return this.setCountry(country, { enforceCooldown: false });
  }

  async updateCountry(country) {
    return this.setCountry(country, { enforceCooldown: true });
  }

  async updateNotificationPreferences(notificationTypes) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();
    const nextTypes = normalizeNotificationTypes(notificationTypes);

    if (!bridge.enabled) {
      DemoStore.updateUserRecord(userId, {
        notificationTypes: nextTypes,
      });
      return this.getUserProgress();
    }

    await bridge.firestore().collection('users').doc(userId).set(
      {
        notificationTypes: nextTypes,
      },
      { merge: true }
    );

    return this.getUserProgress();
  }

  async setCountry(country, { enforceCooldown }) {
    const bridge = initializeFirebaseServices();
    const userId = this.getCurrentUserId();

    if (!bridge.enabled) {
      const current = DemoStore.getUserRecord(userId);

      if (!current) {
        throw new Error('Demo user profile not found.');
      }

      if (enforceCooldown) {
        this.assertCountryChangeAllowed(current.countryChangedAt);
      }

      const updates = {
        countryCode: country.code,
        countryName: country.name,
        countryFlag: country.flag,
        countryChangedAt: new Date().toISOString(),
        countryClaimPending: false,
      };

      if (isFlagAvatarId(current.avatarId)) {
        updates.avatarId = buildFlagAvatarId(country.code);
      }

      DemoStore.updateUserRecord(userId, updates);
      return this.getUserProgress();
    }

    const userRef = bridge.firestore().collection('users').doc(userId);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new Error('User profile not found');
    }

    const current = snapshot.data() || {};

    if (enforceCooldown) {
      this.assertCountryChangeAllowed(current.countryChangedAt);
    }

    const updates = {
      countryCode: country.code,
      countryName: country.name,
      countryFlag: country.flag,
      countryChangedAt: bridge.firestore.FieldValue.serverTimestamp(),
      countryClaimPending: false,
    };

    if (isFlagAvatarId(current.avatarId)) {
      updates.avatarId = buildFlagAvatarId(country.code);
    }

    if (updates.avatarId && bridge.auth().currentUser) {
      await bridge.auth().currentUser.updateProfile({ photoURL: updates.avatarId });
    }

    await userRef.set(updates, { merge: true });
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
          displayNameDecorated: decorateDisplayName(record.displayName, record.countryFlag),
          avatarId: record.avatarId || DEFAULT_AVATAR_ID,
          countryFlag: record.countryFlag || null,
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
      displayNameDecorated: decorateDisplayName(
        doc.data().displayName || 'Explorer',
        doc.data().countryFlag || null
      ),
      avatarId: doc.data().avatarId || DEFAULT_AVATAR_ID,
      rankInfo: this.calculateRank(doc.data().xp || 0),
    }));
  }
}

export default new UserService();
