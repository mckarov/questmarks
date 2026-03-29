import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

let firestoreConfigured = false;

export const getFirebaseBridge = () => {
  try {
    const enabled = Array.isArray(firebase.apps) && firebase.apps.length > 0;

    return {
      enabled,
      firebase,
      auth,
      firestore,
      reason: enabled
        ? null
        : 'Firebase native configuration is missing for this build.',
    };
  } catch (error) {
    return {
      enabled: false,
      firebase: null,
      auth: null,
      firestore: null,
      reason: error.message,
    };
  }
};

export const initializeFirebaseServices = () => {
  const bridge = getFirebaseBridge();

  if (bridge.enabled && !firestoreConfigured) {
    try {
      bridge.firestore().settings({
        persistence: true,
        cacheSizeBytes: bridge.firestore.CACHE_SIZE_UNLIMITED,
      });
    } catch (error) {
      console.log('Firestore settings skipped:', error.message);
    }

    firestoreConfigured = true;
  }

  return bridge;
};

