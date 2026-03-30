export const AVATAR_PRESETS = [
  { id: 'compass', emoji: '🧭', accent: '#B08A58' },
  { id: 'globe', emoji: '🌍', accent: '#C5A26A' },
  { id: 'mountain', emoji: '🏔️', accent: '#A78C62' },
  { id: 'spark', emoji: '✨', accent: '#D0B084' },
  { id: 'camera', emoji: '📸', accent: '#B8946A' },
  { id: 'rocket', emoji: '🚀', accent: '#8D6841' },
];

export const DEFAULT_AVATAR_ID = AVATAR_PRESETS[0].id;
export const FLAG_AVATAR_ACCENT = '#D6B483';

export const buildFlagAvatarId = countryCode =>
  countryCode ? `flag:${String(countryCode).trim().toUpperCase()}` : null;

export const isFlagAvatarId = avatarId =>
  typeof avatarId === 'string' && avatarId.startsWith('flag:');

export const countryCodeToFlag = countryCode =>
  countryCode
    ? String(countryCode)
        .trim()
        .toUpperCase()
        .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    : null;

export const getAvatarOptions = (countryCode, countryFlag) => {
  if (!countryCode || !countryFlag) {
    return AVATAR_PRESETS;
  }

  return [
    ...AVATAR_PRESETS,
    {
      id: buildFlagAvatarId(countryCode),
      emoji: countryFlag,
      accent: FLAG_AVATAR_ACCENT,
    },
  ];
};

export const getAvatarPreset = (avatarId, countryFlag = null) => {
  if (isFlagAvatarId(avatarId)) {
    const countryCode = avatarId.split(':')[1];

    return {
      id: avatarId,
      emoji: countryFlag || countryCodeToFlag(countryCode) || '🏳️',
      accent: FLAG_AVATAR_ACCENT,
    };
  }

  return AVATAR_PRESETS.find(avatar => avatar.id === avatarId) || AVATAR_PRESETS[0];
};
