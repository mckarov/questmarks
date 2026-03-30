import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COUNTRIES, getCountryByCode } from '../constants/countries';
import { LANDMARK_TYPES, TYPE_LABELS } from '../constants/game';
import {
  AVATAR_PRESETS,
  getAvatarOptions,
} from '../constants/profile';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppContext } from '../context/AppContext';
import ProximityNotificationService from '../services/ProximityNotificationService';
import UserService from '../services/UserService';

const SettingsScreen = () => {
  const { t } = useAppContext();
  const insets = useSafeAreaInsets();
  const topContentInset = Math.max(insets.top + 8, 28);
  const [stats, setStats] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState(AVATAR_PRESETS[0].id);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCountry, setSavingCountry] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(null);
  const [selectedNotificationTypes, setSelectedNotificationTypes] = useState([]);

  const load = async () => {
    const nextStats = await UserService.getUserStats();
    setStats(nextStats);
    setDisplayName(nextStats?.displayName || '');
    setAvatarId(nextStats?.avatarId || AVATAR_PRESETS[0].id);
    setSelectedCountryCode(nextStats?.countryCode || null);
    setSelectedNotificationTypes(nextStats?.notificationTypes || LANDMARK_TYPES);
  };

  useEffect(() => {
    load();
  }, []);

  const avatarOptions = useMemo(
    () => getAvatarOptions(stats?.countryCode, stats?.countryFlag),
    [stats?.countryCode, stats?.countryFlag]
  );

  const visibleCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(
      country =>
        country.name.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query)
    );
  }, [countrySearch]);

  const selectedCountry = getCountryByCode(selectedCountryCode) || getCountryByCode(stats?.countryCode);

  const handleProfileSave = async () => {
    const trimmedName = displayName.trim();

    if (!trimmedName) {
      Alert.alert('QuestMarks', t('profile.nameValidation'));
      return;
    }

    setSavingProfile(true);

    try {
      const updated = await UserService.updateProfile({
        displayName: trimmedName,
        avatarId,
      });

      setStats(updated);
      setDisplayName(updated.displayName || trimmedName);
      setAvatarId(updated.avatarId || avatarId);
      Alert.alert('QuestMarks', t('profile.saved'));
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmCountryChange = () => {
    if (!selectedCountry) {
      return;
    }

    Alert.alert(
      'QuestMarks',
      t('settings.countryWarning'),
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('settings.countryConfirm'),
          onPress: async () => {
            setSavingCountry(true);

            try {
              const updated = await UserService.updateCountry(selectedCountry);
              setStats(updated);
              setAvatarId(updated.avatarId || avatarId);
              setSelectedCountryCode(updated.countryCode || selectedCountry.code);
              Alert.alert('QuestMarks', t('settings.countrySaved'));
            } catch (error) {
              Alert.alert('QuestMarks', error.message);
            } finally {
              setSavingCountry(false);
            }
          },
        },
      ]
    );
  };

  const toggleNotificationType = type => {
    setSelectedNotificationTypes(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type]
    );
  };

  const saveNotificationPreferences = async () => {
    setSavingNotifications(true);

    try {
      const updated = await UserService.updateNotificationPreferences(selectedNotificationTypes);
      setStats(updated);
      setSelectedNotificationTypes(updated.notificationTypes || []);
      await ProximityNotificationService.refreshUserState();
      Alert.alert('QuestMarks', t('settings.notificationsSaved'));
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topContentInset }]}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeaderButton}
          onPress={() => setCustomizeOpen(current => !current)}
        >
          <Text style={styles.cardTitle}>{t('profile.customizeTitle')}</Text>
          <Text style={styles.cardHeaderAction}>
            {customizeOpen ? t('profile.customizeCollapse') : t('profile.customizeExpand')}
          </Text>
        </TouchableOpacity>

        {customizeOpen ? (
          <>
            <Text style={styles.fieldLabel}>{t('profile.usernameField')}</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile.usernamePlaceholder')}
              placeholderTextColor="#8C755B"
            />

            <Text style={styles.fieldLabel}>{t('profile.avatarField')}</Text>
            <View style={styles.avatarGrid}>
              {avatarOptions.map(option => {
                const active = option.id === avatarId;

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.avatarOption,
                      { backgroundColor: option.accent },
                      active && styles.avatarOptionActive,
                    ]}
                    onPress={() => setAvatarId(option.id)}
                  >
                    <Text style={styles.avatarOptionEmoji}>{option.emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleProfileSave}
              disabled={savingProfile}
            >
              <Text style={styles.primaryButtonText}>
                {savingProfile ? t('common.loading') : t('profile.saveButton')}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={[styles.card, styles.spacedCard]}>
        <Text style={styles.cardTitle}>{t('profile.language')}</Text>
        <View style={styles.cardSpacer} />
        <LanguageSwitcher />
      </View>

      <View style={[styles.card, styles.spacedCard]}>
        <TouchableOpacity
          style={styles.cardHeaderButton}
          onPress={() => setNotificationsOpen(current => !current)}
        >
          <Text style={styles.cardTitle}>{t('settings.notificationsTitle')}</Text>
          <Text style={styles.cardHeaderAction}>
            {notificationsOpen ? t('profile.customizeCollapse') : t('profile.customizeExpand')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.cardBody}>
          {t('settings.notificationsSummary', {
            count: selectedNotificationTypes.length,
          })}
        </Text>

        {notificationsOpen ? (
          <>
            <View style={styles.optionGrid}>
              {LANDMARK_TYPES.map(type => {
                const active = selectedNotificationTypes.includes(type);

                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => toggleNotificationType(type)}
                  >
                    <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                      {TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={saveNotificationPreferences}
              disabled={savingNotifications}
            >
              <Text style={styles.primaryButtonText}>
                {savingNotifications ? t('common.loading') : t('settings.notificationsSave')}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View style={[styles.card, styles.spacedCard]}>
        <TouchableOpacity
          style={styles.cardHeaderButton}
          onPress={() => setCountryOpen(current => !current)}
        >
          <Text style={styles.cardTitle}>{t('settings.countryTitle')}</Text>
          <Text style={styles.cardHeaderAction}>
            {countryOpen ? t('profile.customizeCollapse') : t('profile.customizeExpand')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.cardBody}>
          {selectedCountry
            ? t('settings.currentCountry', {
                country: `${selectedCountry.name} ${selectedCountry.flag}`,
              })
            : t('settings.noCountry')}
        </Text>

        {countryOpen ? (
          <>
            <TextInput
              style={styles.input}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder={t('settings.countrySearch')}
              placeholderTextColor="#8C755B"
            />

            <ScrollView style={styles.countryList} nestedScrollEnabled>
              {visibleCountries.map(country => {
                const active = country.code === selectedCountryCode;

                return (
                  <TouchableOpacity
                    key={country.code}
                    style={[styles.countryOption, active && styles.countryOptionActive]}
                    onPress={() => setSelectedCountryCode(country.code)}
                  >
                    <Text style={styles.countryFlag}>{country.flag}</Text>
                    <Text style={styles.countryName}>{country.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={confirmCountryChange}
              disabled={savingCountry || !selectedCountry}
            >
              <Text style={styles.primaryButtonText}>
                {savingCountry ? t('common.loading') : t('settings.countryApply')}
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#E9DDC7',
  },
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  spacedCard: {
    marginTop: 16,
  },
  cardHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#4C3926',
  },
  cardHeaderAction: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8C755B',
  },
  cardBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#6D593F',
  },
  cardSpacer: {
    height: 10,
  },
  fieldLabel: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#8C755B',
  },
  input: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FFF9F0',
    color: '#4C3926',
    borderWidth: 1,
    borderColor: '#D1B89A',
  },
  avatarGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 62,
    height: 62,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D8C09B',
  },
  avatarOptionActive: {
    borderColor: '#4C3926',
  },
  avatarOptionEmoji: {
    fontSize: 24,
  },
  countryList: {
    maxHeight: 260,
    marginTop: 14,
  },
  optionGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: '#D1B89A',
  },
  optionChipActive: {
    backgroundColor: '#D8C09B',
    borderColor: '#A98C68',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D593F',
  },
  optionChipTextActive: {
    color: '#4C3926',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  countryOptionActive: {
    backgroundColor: '#EFE2CA',
  },
  countryFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryName: {
    fontSize: 14,
    color: '#4C3926',
  },
  primaryButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#B08A58',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF8EF',
  },
});

export default SettingsScreen;
