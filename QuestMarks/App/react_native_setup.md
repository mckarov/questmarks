# Questmarks React Native App - Complete Setup

## 📱 Overview

This guide will help you build and run the Questmarks mobile app on both iOS and Android.

---

## 🛠️ Prerequisites

### 1. Install Node.js and npm
```bash
# Check if already installed
node --version  # Should be v16 or higher
npm --version

# If not installed, download from: https://nodejs.org/
```

### 2. Install React Native CLI
```bash
npm install -g react-native-cli
```

### 3. Platform-Specific Setup

#### **For iOS (Mac only)**
```bash
# Install Xcode from App Store (12GB+)
# Install CocoaPods
sudo gem install cocoapods
```

#### **For Android**
1. Install [Android Studio](https://developer.android.com/studio)
2. Install Android SDK (API 31+)
3. Set up environment variables:

```bash
# Add to ~/.bash_profile or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## 🚀 Step 1: Create React Native Project

```bash
# Create new project
npx react-native init Questmarks

# Navigate to project
cd Questmarks
```

---

## 📦 Step 2: Install Dependencies

```bash
# Core dependencies
npm install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth

# Map dependencies
npm install react-native-maps

# Geolocation
npm install react-native-geolocation-service

# Permissions
npm install react-native-permissions

# Navigation
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# Geohashing for Firebase queries
npm install geofire-common

# iOS specific - install pods
cd ios && pod install && cd ..
```

---

## 🔥 Step 3: Configure Firebase

### 3.1 iOS Configuration

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add to `ios/Questmarks/` folder in Xcode
3. Edit `ios/Questmarks/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Questmarks needs your location to find nearby landmarks</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Questmarks needs your location to track landmark visits</string>
```

### 3.2 Android Configuration

1. Download `google-services.json` from Firebase Console
2. Place in `android/app/` folder

3. Edit `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

4. Edit `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

// Add at the top with other dependencies
dependencies {
    implementation 'com.google.android.gms:play-services-maps:18.1.0'
}
```

5. Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Add permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application>
        <!-- Add Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_GOOGLE_MAPS_API_KEY_HERE"/>
    </application>
</manifest>
```

---

## 📂 Step 4: Create Project Structure

Create the following folder structure:

```
Questmarks/
├── src/
│   ├── screens/
│   │   ├── AuthScreen.js
│   │   ├── MapScreen.js
│   │   ├── ProfileScreen.js
│   │   └── LeaderboardScreen.js
│   ├── services/
│   │   ├── LandmarkService.js
│   │   └── UserService.js
│   ├── navigation/
│   │   └── MainNavigator.js
│   └── components/
│       ├── LandmarkCard.js
│       └── RankBadge.js
├── App.js
└── package.json
```

---

## 📝 Step 5: Add Source Files

### 5.1 Create `src/screens/AuthScreen.js`

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import UserService from '../services/UserService';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up
        const userCredential = await auth().createUserWithEmailAndPassword(
          email,
          password
        );
        
        // Initialize user profile
        await UserService.initializeUser(email.split('@')[0], email);
        
        Alert.alert('Success', 'Account created! Welcome to Questmarks!');
      } else {
        // Sign in
        await auth().signInWithEmailAndPassword(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Questmarks</Text>
      <Text style={styles.subtitle}>Explore the World</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleAuth}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.switchText}>
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1F2937',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 48,
  },
  input: {
    backgroundColor: '#374151',
    color: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    color: '#8B5CF6',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
});

export default AuthScreen;
```

### 5.2 Create `src/navigation/MainNavigator.js`

```javascript
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Tab = createBottomTabNavigator();

const MainNavigator = ({ user }) => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#1F2937',
            borderTopColor: '#374151',
          },
          tabBarActiveTintColor: '#8B5CF6',
          tabBarInactiveTintColor: '#9CA3AF',
          headerStyle: {
            backgroundColor: '#7C3AED',
          },
          headerTintColor: 'white',
        }}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🗺️</Text>,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>👤</Text>,
          }}
        />
        <Tab.Screen
          name="Leaderboard"
          component={LeaderboardScreen}
          options={{
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏆</Text>,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;
```

### 5.3 Add Services

Copy the `LandmarkService.js` and `UserService.js` files I created earlier into `src/services/`

### 5.4 Add MapScreen

Copy the `MapScreen.js` file I created earlier into `src/screens/`

### 5.5 Update `App.js`

Copy the `App.js` file I created earlier to the root directory

---

## 🗝️ Step 6: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Maps SDK for iOS** and **Maps SDK for Android**
4. Go to **Credentials** > **Create Credentials** > **API Key**
5. Copy the API key
6. Add to your app:
   - iOS: Edit `ios/Questmarks/AppDelegate.mm` and add at the top:
   ```objc
   #import <GoogleMaps/GoogleMaps.h>
   
   // In didFinishLaunchingWithOptions method, before return YES:
   [GMSServices provideAPIKey:@"YOUR_API_KEY_HERE"];
   ```
   - Android: Already added in AndroidManifest.xml (Step 3.2)

---

## ▶️ Step 7: Run the App

### iOS
```bash
# Start Metro bundler
npm start

# In another terminal, run iOS
npm run ios

# Or open in Xcode
open ios/Questmarks.xcworkspace
# Then press the Play button
```

### Android
```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npm run android

# Or open in Android Studio
# File > Open > Select android/ folder
# Press Run button
```

---

## 🧪 Step 8: Test the App

1. **Sign up** with email and password
2. **Allow location permissions** when prompted
3. **Map should load** with your current location
4. **Nearby landmarks** should appear as colored markers
5. **Tap a marker** to see landmark details
6. **Check in** when within 100m of a landmark
7. **Earn XP** and see your rank increase!

---

## 🐛 Troubleshooting

### iOS Build Fails
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Android Build Fails
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Maps Not Showing
- Check Google Maps API key is correct
- Ensure billing is enabled on Google Cloud (they require it even for free tier)
- Check API is enabled for your platform (iOS/Android)

### Location Not Working
- Check permissions in device settings
- iOS: Settings > Questmarks > Location
- Android: Settings > Apps > Questmarks > Permissions

### Firebase Connection Issues
- Verify `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in correct location
- Rebuild the app after adding Firebase config files
- Check Firebase project settings match your bundle ID/package name

### No Landmarks Showing
- Ensure you've run the landmark importer and uploaded to Firebase
- Check Firestore rules allow read access
- Check console for errors: `npx react-native log-ios` or `npx react-native log-android`

---

## 📊 Performance Tips

### Enable Hermes (JavaScript engine)
Already enabled by default in newer React Native versions.

### Enable Firebase Persistence
Already added in `App.js`:
```javascript
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});
```

### Optimize Map Performance
```javascript
// In MapScreen, add these props to MapView:
<MapView
  maxZoomLevel={18}
  minZoomLevel={10}
  loadingEnabled={true}
  loadingIndicatorColor="#8B5CF6"
  loadingBackgroundColor="#1F2937"
  moveOnMarkerPress={false}
  // ... other props
/>
```

---

## 🚀 Next Steps

1. **Add ProfileScreen** - Show user stats, rank progress, visited landmarks
2. **Add LeaderboardScreen** - Top users by XP
3. **Add Search** - Search landmarks by name
4. **Add Filters** - Filter by landmark type
5. **Add Achievements** - Badges for milestones
6. **Add Social Features** - Friends, sharing
7. **Add Photos** - Upload photos at landmarks
8. **Add Offline Mode** - Download landmarks for offline use

---

## 📱 Building for Production

### iOS
```bash
# Archive for App Store
open ios/Questmarks.xcworkspace
# Product > Archive
# Follow App Store submission guide
```

### Android
```bash
# Generate signed APK
cd android
./gradlew bundleRelease
# Find APK in: android/app/build/outputs/bundle/release/
```

---

## ✅ Checklist

- [ ] Node.js and npm installed
- [ ] React Native CLI installed
- [ ] Xcode (iOS) or Android Studio (Android) installed
- [ ] Firebase project created
- [ ] Landmarks imported to Firebase
- [ ] Google Maps API key obtained
- [ ] Firebase config files added
- [ ] Dependencies installed
- [ ] App runs on device/simulator
- [ ] Location permissions working
- [ ] Map loads with user location

---

## 🎉 Success!