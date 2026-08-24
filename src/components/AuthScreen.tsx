import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const solyLogo = require('../../assets/Soly.png');

type Props = {
  submitting: boolean;
  brandName?: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
};

export function AuthScreen({ submitting, brandName = 'SOLÝ', onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    if (mode === 'register') {
      if (!name.trim() || password.length < 8) {
        setError('Nom requis et mot de passe de 8 caractères minimum.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Les mots de passe ne correspondent pas.');
        return;
      }
    }
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister({ name, email, phone, password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible.');
    }
  };

  return (
    <LinearGradient colors={['#04130D', '#0B3421', '#061A11']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={solyLogo} resizeMode="contain" style={styles.logo} />
          <Text style={styles.brand}>{brandName}</Text>
          <Text style={styles.tagline}>VOTRE MAJORDOME PRIVÉ</Text>

          <View style={styles.card}>
            <View style={styles.tabs}>
              {(['login', 'register'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setMode(item);
                    setError('');
                  }}
                  style={[styles.tab, mode === item && styles.tabActive]}
                >
                  <Text style={[styles.tabText, mode === item && styles.tabTextActive]}>
                    {item === 'login' ? 'CONNEXION' : 'CRÉER UN COMPTE'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.title}>{mode === 'login' ? 'Heureux de vous revoir' : 'Rejoignez SOLÝ'}</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Retrouvez votre séjour et vos avantages.' : 'Votre profil sera créé automatiquement dans notre CRM.'}
            </Text>

            {mode === 'register' ? (
              <AuthInput icon="person-outline" placeholder="Nom complet" value={name} onChangeText={setName} />
            ) : null}
            <AuthInput icon="mail-outline" placeholder="Adresse email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            {mode === 'register' ? (
              <AuthInput icon="phone-iphone" placeholder="Téléphone / WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            ) : null}
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock-outline" size={20} color="#CDA85B" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor="#718078"
                secureTextEntry={secure}
                autoCapitalize="none"
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setSecure((current) => !current)}>
                <MaterialIcons name={secure ? 'visibility' : 'visibility-off'} size={20} color="#8E9A93" />
              </TouchableOpacity>
            </View>
            {mode === 'register' ? (
              <AuthInput
                icon="verified-user"
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity disabled={submitting} onPress={() => void submit()} activeOpacity={0.82} style={[styles.button, submitting && styles.buttonDisabled]}>
              {submitting ? <ActivityIndicator color="#082719" /> : <Text style={styles.buttonText}>{mode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}</Text>}
            </TouchableOpacity>
            <Text style={styles.privacy}>Connexion chiffrée · vos données restent confidentielles</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function AuthInput(props: React.ComponentProps<typeof TextInput> & { icon: React.ComponentProps<typeof MaterialIcons>['name'] }) {
  const { icon, ...inputProps } = props;
  return (
    <View style={styles.inputWrap}>
      <MaterialIcons name={icon} size={20} color="#CDA85B" />
      <TextInput placeholderTextColor="#718078" style={styles.input} {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 42, alignItems: 'center' },
  logo: { width: 104, height: 104, marginBottom: -5 },
  brand: { color: '#D6B96F', fontFamily: 'Marcellus_400Regular', fontSize: 35, letterSpacing: 7 },
  tagline: { color: '#D9E2DC', fontFamily: 'Jost_500Medium', fontSize: 10, letterSpacing: 3.6, marginTop: 7, marginBottom: 30 },
  card: { width: '100%', maxWidth: 430, borderWidth: 1, borderColor: 'rgba(214,185,111,.3)', backgroundColor: 'rgba(5,31,20,.94)', borderRadius: 26, padding: 22 },
  tabs: { flexDirection: 'row', borderRadius: 13, padding: 4, backgroundColor: 'rgba(0,0,0,.24)', marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#CDA85B' },
  tabText: { color: '#8E9A93', fontFamily: 'Jost_700Bold', fontSize: 10, letterSpacing: 1 },
  tabTextActive: { color: '#082719' },
  title: { color: '#F4EFE5', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 28, textAlign: 'center' },
  subtitle: { color: '#9EAAA3', fontFamily: 'Jost_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  inputWrap: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: 'rgba(205,168,91,.25)', borderRadius: 14, backgroundColor: 'rgba(255,255,255,.035)', paddingHorizontal: 15, marginBottom: 12 },
  input: { flex: 1, color: '#F4EFE5', fontFamily: 'Jost_400Regular', fontSize: 15, paddingVertical: 14 },
  error: { color: '#FF9F8C', fontFamily: 'Jost_500Medium', fontSize: 12, lineHeight: 18, marginBottom: 12, textAlign: 'center' },
  button: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#D6B96F', marginTop: 4 },
  buttonDisabled: { opacity: 0.62 },
  buttonText: { color: '#082719', fontFamily: 'Jost_700Bold', fontSize: 12, letterSpacing: 1.5 },
  privacy: { color: '#66746C', fontFamily: 'Jost_400Regular', fontSize: 10, textAlign: 'center', marginTop: 15 },
});
