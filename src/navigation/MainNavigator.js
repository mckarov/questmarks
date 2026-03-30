import React, { useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNav from '../components/BottomNav';
import { ROUTES } from '../constants/defaults';
import AboutScreen from '../screens/AboutScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const MainNavigator = ({ user }) => {
  const [activeRoute, setActiveRoute] = useState(ROUTES.MAP);
  const [mapImmersive, setMapImmersive] = useState(false);
  const insets = useSafeAreaInsets();

  const navigate = route => {
    if (route !== ROUTES.MAP) {
      setMapImmersive(false);
    }
    setActiveRoute(route);
  };

  const screenBackground = '#E9DDC7';
  const statusBarStyle = 'dark-content';
  const navHeight = mapImmersive ? 0 : 52 + Math.max(insets.bottom, 0);

  const renderScreen = () => {
    switch (activeRoute) {
      case ROUTES.ABOUT:
        return <AboutScreen user={user} navigate={navigate} />;
      case ROUTES.SETTINGS:
        return <SettingsScreen user={user} navigate={navigate} />;
      case ROUTES.LEADERBOARD:
        return <LeaderboardScreen user={user} navigate={navigate} />;
      case ROUTES.PROFILE:
        return <ProfileScreen user={user} navigate={navigate} />;
      case ROUTES.MAP:
      default:
        return <MapScreen user={user} navigate={navigate} onFullscreenChange={setMapImmersive} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <StatusBar
        translucent
        barStyle={statusBarStyle}
        backgroundColor="transparent"
      />
      <View
        style={[styles.screenWrap, { backgroundColor: screenBackground, paddingBottom: navHeight }]}
      >
        {renderScreen()}
      </View>
      {mapImmersive ? null : (
        <BottomNav activeRoute={activeRoute} onSelect={navigate} bottomInset={insets.bottom} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E9DDC7',
  },
  screenWrap: {
    flex: 1,
  },
});

export default MainNavigator;
