export const XP_VALUES = {
  LOCAL: 10,
  SEMI_LOCAL: 50,
  REGIONAL: 100,
  NATIONAL: 200,
  UNESCO: 500,
  WONDER: 1000,
};

export const MARKER_COLORS = {
  LOCAL: '#6B7280',
  SEMI_LOCAL: '#2563EB',
  REGIONAL: '#059669',
  NATIONAL: '#7C3AED',
  UNESCO: '#D97706',
  WONDER: '#DC2626',
};

export const TYPE_LABELS = {
  LOCAL: 'Local',
  SEMI_LOCAL: 'Semi-local',
  REGIONAL: 'Regional',
  NATIONAL: 'National',
  UNESCO: 'UNESCO',
  WONDER: 'Wonder',
};

export const TYPE_ICONS = {
  LOCAL: 'P',
  SEMI_LOCAL: 'S',
  REGIONAL: 'R',
  NATIONAL: 'N',
  UNESCO: 'U',
  WONDER: 'W',
};

export const RANKS = [
  { name: 'Wanderer', minXP: 0, maxXP: 99, icon: 'W' },
  { name: 'Explorer', minXP: 100, maxXP: 499, icon: 'E' },
  { name: 'Traveler', minXP: 500, maxXP: 999, icon: 'T' },
  { name: 'Adventurer', minXP: 1000, maxXP: 2499, icon: 'A' },
  { name: 'Voyager', minXP: 2500, maxXP: 4999, icon: 'V' },
  { name: 'Discoverer', minXP: 5000, maxXP: 9999, icon: 'D' },
  { name: 'Pathfinder', minXP: 10000, maxXP: 19999, icon: 'P' },
  { name: 'Navigator', minXP: 20000, maxXP: 39999, icon: 'N' },
  { name: 'Pioneer', minXP: 40000, maxXP: 74999, icon: 'Pi' },
  { name: 'Globetrotter', minXP: 75000, maxXP: 149999, icon: 'G' },
  { name: 'World Explorer', minXP: 150000, maxXP: 299999, icon: 'WE' },
  { name: 'Continental Master', minXP: 300000, maxXP: 599999, icon: 'CM' },
  { name: 'Geographic Legend', minXP: 600000, maxXP: 999999, icon: 'GL' },
  { name: 'Immortal Wanderer', minXP: 1000000, maxXP: Number.POSITIVE_INFINITY, icon: 'IW' },
];

