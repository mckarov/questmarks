import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreen from './src/screens/AuthScreen';
import CountryClaimScreen from './src/screens/CountryClaimScreen';
import MainNavigator from './src/navigation/MainNavigator';
import { AppProvider } from './src/context/AppContext';
import AuthService from './src/services/AuthService';
import ProximityNotificationService from './src/services/ProximityNotificationService';
import UserService from './src/services/UserService';

const AppShell = () => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [countryClaimPending, setCountryClaimPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeUserId = user?.uid || null;

  useEffect(() => {
    let active = true;

    const unsubscribe = AuthService.subscribe(nextUser => {
      const syncUser = async () => {
        let progress = null;

        if (nextUser) {
          try {
            progress = await UserService.initializeUser(
              nextUser.displayName,
              nextUser.email
            );
          } catch (error) {
            console.log('User bootstrap failed:', error.message);
          }
        }

        if (!active) {
          return;
        }

        setUser(nextUser);
        setCountryClaimPending(Boolean(progress?.countryClaimPending));
        setLoading(false);
      };

      syncUser();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeUserId || countryClaimPending) {
      ProximityNotificationService.stop();
      return undefined;
    }

    ProximityNotificationService.start(activeUserId).catch(error => {
      console.log('Proximity notifications failed to start:', error.message);
    });

    return () => {
      ProximityNotificationService.stop();
    };
  }, [activeUserId, countryClaimPending]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A67F4F" />
        <Text style={styles.loadingTitle}>Loading QuestMarks...</Text>
        <Text style={styles.loadingSubtitle}>
          Preparing your exploration dashboard.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        countryClaimPending ? (
          <CountryClaimScreen onClaimed={() => setCountryClaimPending(false)} />
        ) : (
          <MainNavigator user={user} />
        )
      ) : (
        <AuthScreen />
      )}
    </View>
  );
};

const App = () => (
  <SafeAreaProvider>
    <AppProvider>
      <AppShell />
    </AppProvider>
  </SafeAreaProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9DDC7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#E9DDC7',
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '700',
    color: '#4C3926',
  },
  loadingSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#7A6750',
  },
});

export default App;
