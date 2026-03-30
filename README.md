# QuestMarks

QuestMarks is a React Native exploration app built around landmark discovery, proximity check-ins, XP progression, and a world map interface.

## Features

- Firebase email/password accounts with demo fallback
- World map with fullscreen mode, filtering, and search
- Landmark check-ins inside a 100 meter radius
- XP, ranks, leaderboard, profile, and settings
- Country flag identity flow tied to the user account
- Nearby landmark notifications with per-type preferences
- English, Russian, and German UI

## Project structure

- `App.js`, `index.js`: app entry
- `src/`: screens, navigation, services, constants, and UI components
- `android/`, `ios/`: native projects
- `sample_landmarks.json`: demo landmark seed data
- `landmark_importer.py`, `firebase_uploader.py`: landmark import and upload utilities
- `data/`: static data used by the landmark pipeline

## Development

```bash
npm install
npm start
npm run android
```

For iOS, run CocoaPods first:

```bash
cd ios
pod install
```

## Notes

- Firebase config files are intentionally ignored and should not be committed.
- Generated landmark import output is intentionally ignored and can be recreated locally.
