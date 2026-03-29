import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomNav from '../components/BottomNav';
import { ROUTES } from '../constants/defaults';
import AboutScreen from '../screens/AboutScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';

const MainNavigator = ({ user }) => {
  const [activeRoute, setActiveRoute] = useState(ROUTES.MAP);

  const navigate = route => {
    setActiveRoute(route);
  };

  const renderScreen = () => {
    switch (activeRoute) {
      case ROUTES.LEADERBOARD:
        return <LeaderboardScreen user={user} navigate={navigate} />;
      case ROUTES.PROFILE:
        return <ProfileScreen user={user} navigate={navigate} />;
      case ROUTES.ABOUT:
        return <AboutScreen user={user} navigate={navigate} />;
      case ROUTES.MAP:
      default:
        return <MapScreen user={user} navigate={navigate} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenWrap}>{renderScreen()}</View>
      <BottomNav activeRoute={activeRoute} onSelect={navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  screenWrap: {
    flex: 1,
  },
});

export default MainNavigator;
