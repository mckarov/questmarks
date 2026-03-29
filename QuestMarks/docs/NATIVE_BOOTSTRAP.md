# Native Bootstrap

The original `QuestMarks` folder was missing the generated React Native `android/` and `ios/` application shell. The JavaScript application source is now complete, but the native shell still needs to be generated or reconnected before device builds can run.

## Recommended bootstrap path

1. Install the required toolchain:
- Node.js 20.19.4 or newer
- JDK 17 or newer for modern React Native Android builds
- Android Studio with SDK and emulator support
- Xcode for iOS builds on macOS

2. From a machine with the toolchain installed, generate a clean React Native shell matching the app versions in `package.json`.

3. Copy or merge the following from this `QuestMarks` folder into that shell:
- `App.js`
- `index.js`
- `app.json`
- `babel.config.js`
- `package.json`
- `src/`
- `sample_landmarks.json`
- `docs/`

4. Add native Firebase configuration only if you want live backend support.

5. Run the app in demo mode first, then enable Firebase mode after native config is confirmed.

## Why this step is documented

This machine does not currently have the full React Native native-build toolchain available. The MVP implementation therefore focuses on making the product source, structure, and release package complete while documenting the missing native bootstrap step explicitly.

