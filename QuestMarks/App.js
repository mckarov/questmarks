import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AuthScreen from './src/screens/AuthScreen';
import MainNavigator from './src/navigation/MainNavigator';
import { AppProvider } from './src/context/AppContext';
import AuthService from './src/services/AuthService';

const AppShell = () => {
  const [user, setUser] = useState(AuthService.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.subscribe(nextUser => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingTitle}>Loading QuestMarks...</Text>
        <Text style={styles.loadingSubtitle}>
          Preparing your exploration dashboard.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      {user ? <MainNavigator user={user} /> : <AuthScreen />}
    </SafeAreaView>
  );
};

const App = () => (
  <AppProvider>
    <AppShell />
  </AppProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#111827',
  },
  loadingTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  loadingSubtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#9CA3AF',
  },
});

export default App;

