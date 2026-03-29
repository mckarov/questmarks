# Data Model

QuestMarks uses a lightweight exploration model centered around landmarks, users, and check-ins.

## Landmark tiers

- `LOCAL`: 10 XP
- `SEMI_LOCAL`: 50 XP
- `REGIONAL`: 100 XP
- `NATIONAL`: 200 XP
- `UNESCO`: 500 XP
- `WONDER`: 1000 XP

## Rank progression

The current MVP includes a tiered rank ladder from `Wanderer` up to `Immortal Wanderer`. Rank is derived entirely from accumulated XP and does not require a separate stored field.

## Check-in rules

- The user must be within 100 meters of a landmark to check in
- Each landmark can only be checked in once per user
- A successful check-in updates XP, rank progress, visit history, and aggregate type stats

## Demo mode behavior

- Users are stored in memory for the current runtime session
- Landmarks come from `sample_landmarks.json`
- Leaderboard and history remain fully functional for the active app session
- Demo mode is intended for development and presentation, not persistent production data

