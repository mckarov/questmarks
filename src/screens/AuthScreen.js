import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#E9DDC7" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.heroCard}>
          <Text style={styles.title}>{t('auth.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E9DDC7',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: '#E9DDC7',
  },
  heroCard: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#F4E7CF',
    borderWidth: 1,
    borderColor: '#C9B492',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#4C3926',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: '#7A6750',
  },
  formCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 28,
    backgroundColor: '#F8F1E3',
    borderWidth: 1,
    borderColor: '#CFB99A',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: '#FFF9F0',
    color: '#4C3926',
    borderWidth: 1,
    borderColor: '#D1B89A',
  },
  primaryButton: {
    marginTop: 4,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#B08A58',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF8EF',
  },
  secondaryButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8C755B',
  },
});

export default AuthScreen;
