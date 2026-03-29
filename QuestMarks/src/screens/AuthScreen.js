import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import AuthService from '../services/AuthService';
import UserService from '../services/UserService';

const AuthScreen = () => {
  const { t } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const modeInfo = AuthService.getModeInfo();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('auth.title'), t('auth.validation'));
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = isSignUp
        ? await AuthService.signUp({
            email: normalizedEmail,
            password,
            displayName: displayName.trim(),
          })
        : await AuthService.signIn({
            email: normalizedEmail,
            password,
          });

      await UserService.initializeUser(
        displayName.trim() || user.displayName,
        normalizedEmail
      );
    } catch (error) {
      Alert.alert(t('auth.title'), `${t('auth.errorPrefix')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.heroCard}>
        <Text style={styles.title}>{t('auth.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {modeInfo.mode === 'firebase' ? t('common.firebaseMode') : t('common.demoMode')}
          </Text>
        </View>
      </View>

      <View style={styles.formCard}>
        {isSignUp ? (
          <TextInput
            placeholder={t('auth.displayName')}
            placeholderTextColor="#6B7280"
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
        ) : null}
        <TextInput
          placeholder={t('auth.email')}
          placeholderTextColor="#6B7280"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder={t('auth.password')}
          placeholderTextColor="#6B7280"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} disabled={loading}>
          <Text style={styles.primaryButtonText}>
            {loading ? t('common.loading') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setIsSignUp(previous => !previous)}
        >
          <Text style={styles.secondaryButtonText}>
            {isSignUp ? t('auth.switchToSignIn') : t('auth.switchToSignUp')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helperText}>
          {modeInfo.reason || t('auth.helper')}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#111827',
  },
  heroCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#F9FAFB',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#9CA3AF',
  },
  modeBadge: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#2A1607',
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDBA74',
  },
  formCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#22304A',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F97316',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FDBA74',
  },
  helperText: {
    marginTop: 18,
    fontSize: 13,
    lineHeight: 20,
    color: '#9CA3AF',
  },
});

export default AuthScreen;

