# Firebase Setup

QuestMarks uses Firebase when native configuration is present. If it is missing, the app automatically falls back to demo mode so the main flows still work during development.

## Required packages

- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`

## Native configuration files

- Android: place `google-services.json` at `android/app/google-services.json`
- iOS: place `GoogleService-Info.plist` inside the iOS app target

## Suggested Firestore collections

### `landmarks`

Each landmark document should contain:

- `id`
- `name`
- `lat`
- `lng`
- `type`
- `country`
- `geohash`

### `users`

Each user document should contain:

- `displayName`
- `email`
- `xp`
- `visitedLandmarks`
- `checkInCount`
- `stats`
- `createdAt`
- `lastCheckIn`

### `checkIns`

Each check-in document should contain:

- `userId`
- `landmarkId`
- `landmarkType`
- `xpGained`
- `timestamp`

## Security and release hygiene

- `serviceAccountKey.json` is ignored for packaging and should not be committed or copied into release archives
- Build native config locally per environment rather than storing it in the project source

