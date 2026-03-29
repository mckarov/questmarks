# QuestMarks

QuestMarks is a React Native core MVP for a gamified tourist exploration app. It turns nearby landmarks into check-in targets, awards XP by landmark tier, tracks ranks and history, and presents the project itself in English, Russian, and German.

## What is included

- Authentication flow with Firebase when native config is present
- Automatic demo fallback with seeded landmarks and in-memory accounts when Firebase is not configured
- Landmark discovery around the current location with a radar-style map view
- Distance-gated check-ins inside a 100 meter radius
- XP, ranks, profile progress, and leaderboard views
- A multilingual project overview derived from Criterion A with a clear placeholder for Criterion B wording
- Release materials under `releases/v1-core-mvp`

## Project structure

- `App.js`, `index.js`, `app.json`, `babel.config.js`: root app entry and configuration
- `src/`: screens, services, constants, translations, and reusable UI
- `docs/`: setup notes, data model, and native bootstrap guidance
- `releases/v1-core-mvp/`: packaged release notes and source manifest
- `App/`: original draft source files kept as reference material from the started project
- `sample_landmarks.json`, `landmark_importer.py`, `firebase_uploader.py`: seeded data and optional utilities

## Runtime modes

- Firebase mode: used when the app has valid native Firebase configuration files and the Firebase modules initialize successfully
- Demo mode: used automatically when Firebase is unavailable; the app still supports sign-up, sign-in, profile tracking, landmark discovery, and leaderboard logic during development

## Build note

The original `QuestMarks` folder did not contain a generated React Native native shell. The JavaScript application source is complete here, and the native-shell bootstrap steps are documented in [docs/NATIVE_BOOTSTRAP.md](/Users/re1lk/userstorage/prog/QuestMarks/docs/NATIVE_BOOTSTRAP.md).

## Further docs

- [Firebase setup](/Users/re1lk/userstorage/prog/QuestMarks/docs/FIREBASE_SETUP.md)
- [Data model](/Users/re1lk/userstorage/prog/QuestMarks/docs/DATA_MODEL.md)
- [Native bootstrap](/Users/re1lk/userstorage/prog/QuestMarks/docs/NATIVE_BOOTSTRAP.md)
- [Release package](/Users/re1lk/userstorage/prog/QuestMarks/releases/v1-core-mvp/README.md)

