import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import CountryService from '../services/CountryService';
import UserService from '../services/UserService';
import { useAppContext } from '../context/AppContext';

const CountryClaimScreen = ({ onClaimed }) => {
  const { t } = useAppContext();
  const spinValue = useRef(new Animated.Value(0)).current;
  const [country, setCountry] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const detectedCountry = await CountryService.detectCurrentCountry();

      if (!active) {
        return;
      }

      setCountry(detectedCountry);

      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (active) {
          setReady(true);
        }
      });
    };

    run();

    return () => {
      active = false;
    };
  }, [spinValue]);

  const handleClaim = async () => {
    if (!country) {
      return;
    }

    setSaving(true);

    try {
      await UserService.claimCountry(country);
      onClaimed?.();
    } catch (error) {
      Alert.alert('QuestMarks', error.message);
    } finally {
      setSaving(false);
    }
  };

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-720deg', '0deg'],
  });

  const scale = spinValue.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [0.15, 1.3, 1],
  });

  return (
    <View style={styles.container}>
      {!country ? (
        <>
          <ActivityIndicator size="large" color="#F8F1E3" />
          <Text style={styles.loadingText}>{t('claim.detecting')}</Text>
        </>
      ) : (
        <>
          <Animated.Text
            style={[
              styles.flag,
              {
                transform: [{ rotate }, { scale }],
              },
            ]}
          >
            {country.flag}
          </Animated.Text>
          <Text style={styles.title}>{t('claim.title')}</Text>
          <Text style={styles.subtitle}>
            {t('claim.subtitle', { country: country.name })}
          </Text>

          {ready ? (
            <TouchableOpacity style={styles.button} onPress={handleClaim} disabled={saving}>
              <Text style={styles.buttonText}>
                {saving ? t('common.loading') : t('claim.button')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#F8F1E3',
  },
  flag: {
    fontSize: 144,
    lineHeight: 168,
    textAlign: 'center',
  },
  title: {
    marginTop: 28,
    fontSize: 28,
    fontWeight: '800',
    color: '#F8F1E3',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: '#D8CDB3',
  },
  button: {
    marginTop: 30,
    paddingHorizontal: 34,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: '#D6B483',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F140B',
  },
});

export default CountryClaimScreen;
