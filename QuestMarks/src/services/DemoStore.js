import sampleLandmarks from '../../sample_landmarks.json';
import { XP_VALUES } from '../constants/game';

let authSubscribers = new Set();
let currentUserId = null;

const usersById = {};
const usersByEmail = {};
const checkIns = [];

const clone = value => JSON.parse(JSON.stringify(value));

const createStats = () => ({
  LOCAL: 0,
  SEMI_LOCAL: 0,
  REGIONAL: 0,
  NATIONAL: 0,
  UNESCO: 0,
  WONDER: 0,
});

const normalizeUser = record =>
  record
    ? {
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
      }
    : null;

const emitAuthChange = () => {
  const user = normalizeUser(usersById[currentUserId] || null);
  authSubscribers.forEach(listener => listener(user));
};

const buildUserRecord = ({ email, password, displayName }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const uid = `demo-${normalizedEmail.replace(/[^a-z0-9]/gi, '-')}`;
  const timestamp = new Date().toISOString();

  return {
    uid,
    email: normalizedEmail,
    password,
    displayName: displayName || normalizedEmail.split('@')[0],
    xp: 0,
    visitedLandmarks: [],
    checkInCount: 0,
    createdAt: timestamp,
    lastCheckIn: null,
    stats: createStats(),
  };
};

class DemoStore {
  subscribeAuth(listener) {
    authSubscribers.add(listener);
    listener(this.getCurrentUser());

    return () => {
      authSubscribers.delete(listener);
    };
  }

  getCurrentUser() {
    return normalizeUser(usersById[currentUserId] || null);
  }

  signUp(email, password, displayName) {
    const normalizedEmail = email.trim().toLowerCase();

    if (usersByEmail[normalizedEmail]) {
      throw new Error('An account with this email already exists.');
    }

    const record = buildUserRecord({
      email: normalizedEmail,
      password,
      displayName,
    });

    usersById[record.uid] = record;
    usersByEmail[normalizedEmail] = record.uid;
    currentUserId = record.uid;
    emitAuthChange();

    return normalizeUser(record);
  }

  signIn(email, password) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingId = usersByEmail[normalizedEmail];

    if (!existingId) {
      throw new Error('No demo account found for this email. Create one first.');
    }

    const record = usersById[existingId];

    if (record.password !== password) {
      throw new Error('Incorrect password.');
    }

    currentUserId = record.uid;
    emitAuthChange();
    return normalizeUser(record);
  }

  signOut() {
    currentUserId = null;
    emitAuthChange();
  }

  getUserRecord(userId = currentUserId) {
    return userId ? usersById[userId] || null : null;
  }

  updateUserRecord(userId, updates) {
    const currentRecord = this.getUserRecord(userId);

    if (!currentRecord) {
      throw new Error('Demo user profile not found.');
    }

    usersById[userId] = {
      ...currentRecord,
      ...updates,
    };

    if (updates.email && updates.email !== currentRecord.email) {
      delete usersByEmail[currentRecord.email];
      usersByEmail[updates.email] = userId;
    }

    if (currentUserId === userId) {
      emitAuthChange();
    }

    return clone(usersById[userId]);
  }

  ensureUserProfile(user) {
    const existing = this.getUserRecord(user.uid);

    if (existing) {
      return clone(existing);
    }

    const record = buildUserRecord({
      email: user.email || `${user.uid}@demo.local`,
      password: 'demo-password',
      displayName: user.displayName || 'Explorer',
    });

    usersById[record.uid] = record;
    usersByEmail[record.email] = record.uid;
    return clone(record);
  }

  getLeaderboard() {
    return Object.values(usersById)
      .map(record => clone(record))
      .sort((left, right) => {
        if (right.xp !== left.xp) {
          return right.xp - left.xp;
        }

        return right.checkInCount - left.checkInCount;
      });
  }

  getCheckIns(userId = currentUserId) {
    return checkIns
      .filter(item => item.userId === userId)
      .map(item => clone(item))
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  }

  recordCheckIn(userId, landmarkId, landmarkType) {
    const record = this.getUserRecord(userId);

    if (!record) {
      throw new Error('Demo user profile not found.');
    }

    if (record.visitedLandmarks.includes(landmarkId)) {
      throw new Error('Already visited this landmark');
    }

    const xpGained = XP_VALUES[landmarkType] || XP_VALUES.LOCAL;
    const timestamp = new Date().toISOString();

    const updatedStats = {
      ...record.stats,
      [landmarkType]: (record.stats[landmarkType] || 0) + 1,
    };

    usersById[userId] = {
      ...record,
      xp: record.xp + xpGained,
      visitedLandmarks: [...record.visitedLandmarks, landmarkId],
      checkInCount: record.checkInCount + 1,
      lastCheckIn: timestamp,
      stats: updatedStats,
    };

    checkIns.push({
      id: `demo-checkin-${checkIns.length + 1}`,
      userId,
      landmarkId,
      landmarkType,
      xpGained,
      timestamp,
    });

    return {
      xpGained,
      totalXP: usersById[userId].xp,
      checkInCount: usersById[userId].checkInCount,
    };
  }

  getLandmarks() {
    return sampleLandmarks.map(item => ({
      ...item,
    }));
  }
}

export default new DemoStore();

