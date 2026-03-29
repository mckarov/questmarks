import DemoStore from './DemoStore';
import { initializeFirebaseServices } from './firebaseBridge';

const normalizeFirebaseUser = user =>
  user
    ? {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Explorer'),
      }
    : null;

class AuthService {
  getModeInfo() {
    const bridge = initializeFirebaseServices();

    return bridge.enabled
      ? { mode: 'firebase', reason: null }
      : { mode: 'demo', reason: bridge.reason };
  }

  subscribe(listener) {
    const bridge = initializeFirebaseServices();

    if (bridge.enabled) {
      return bridge.auth().onAuthStateChanged(user => {
        listener(normalizeFirebaseUser(user));
      });
    }

    return DemoStore.subscribeAuth(listener);
  }

  getCurrentUser() {
    const bridge = initializeFirebaseServices();

    if (bridge.enabled) {
      return normalizeFirebaseUser(bridge.auth().currentUser);
    }

    return DemoStore.getCurrentUser();
  }

  async signUp({ email, password, displayName }) {
    const bridge = initializeFirebaseServices();

    if (bridge.enabled) {
      const credential = await bridge
        .auth()
        .createUserWithEmailAndPassword(email.trim().toLowerCase(), password);

      if (displayName) {
        await credential.user.updateProfile({ displayName });
      }

      return normalizeFirebaseUser(credential.user);
    }

    return DemoStore.signUp(email, password, displayName);
  }

  async signIn({ email, password }) {
    const bridge = initializeFirebaseServices();

    if (bridge.enabled) {
      const credential = await bridge
        .auth()
        .signInWithEmailAndPassword(email.trim().toLowerCase(), password);

      return normalizeFirebaseUser(credential.user);
    }

    return DemoStore.signIn(email, password);
  }

  async signOut() {
    const bridge = initializeFirebaseServices();

    if (bridge.enabled) {
      await bridge.auth().signOut();
      return;
    }

    DemoStore.signOut();
  }
}

export default new AuthService();

