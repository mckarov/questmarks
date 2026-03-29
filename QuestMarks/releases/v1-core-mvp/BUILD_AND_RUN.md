# Build And Run

## Current machine state

This MVP was assembled on a machine that does not currently have:

- `node` on the shell path
- full Xcode app-build tooling
- an Android SDK path configured

Because of that, the app source and release package were completed, but native binaries were not produced here.

## To run QuestMarks on a prepared machine

1. Install Node.js 20.19.4 or newer.
2. Install project dependencies from `QuestMarks/package.json`.
3. Generate or reconnect a React Native native shell as described in `docs/NATIVE_BOOTSTRAP.md`.
4. For demo mode, run without Firebase config and start with the seeded landmarks.
5. For Firebase mode, add:
- `android/app/google-services.json`
- iOS `GoogleService-Info.plist`
6. Start Metro and run the desired platform target.

## Recommended first launch

- Launch in demo mode
- Create an account
- Use the demo location if device location is unavailable
- Verify map discovery, check-ins, profile progress, leaderboard, and language switching
- Enable Firebase only after the local native configuration is stable

