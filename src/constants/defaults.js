export const ROUTES = {
  MAP: 'Map',
  LEADERBOARD: 'Leaderboard',
  PROFILE: 'Profile',
  ABOUT: 'About',
  SETTINGS: 'Settings',
};

export const ROUTE_ORDER = [
  ROUTES.MAP,
  ROUTES.LEADERBOARD,
  ROUTES.PROFILE,
  ROUTES.ABOUT,
  ROUTES.SETTINGS,
];

export const DEFAULT_LOCATION = {
  latitude: 50.1109,
  longitude: 8.6821,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
  label: 'Frankfurt am Main',
};

export const WORLD_REGION = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 120,
  longitudeDelta: 120,
};

export const SEARCH_RADIUS_KM = 50;
export const CHECK_IN_RADIUS_METERS = 100;
