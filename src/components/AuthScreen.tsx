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
};

export function AuthScreen({ submitting, brandName = 'SOLÝ', onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis.');
      return;
    }
    try {
      await onLogin(email, password);
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
            <Text style={styles.accessLabel}>ACCÈS SÉCURISÉ</Text>
            <Text style={styles.title}>Heureux de vous revoir</Text>
            <Text style={styles.subtitle}>Connectez-vous avec les accès transmis par l’équipe SOLÝ.</Text>
            <AuthInput icon="mail-outline" placeholder="Adresse email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
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
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity disabled={submitting} onPress={() => void submit()} activeOpacity={0.82} style={[styles.button, submitting && styles.buttonDisabled]}>
              {submitting ? <ActivityIndicator color="#082719" /> : <Text style={styles.buttonText}>SE CONNECTER</Text>}
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
  accessLabel: { color: '#CDA85B', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 2.4, textAlign: 'center', marginBottom: 10 },
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
