import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond';
import { EBGaramond_400Regular_Italic } from '@expo-google-fonts/eb-garamond';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Jost_400Regular, Jost_500Medium, Jost_700Bold } from '@expo-google-fonts/jost';
import { Marcellus_400Regular } from '@expo-google-fonts/marcellus';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import * as Clipboard from 'expo-clipboard';
import { useFonts } from 'expo-font';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  Animated,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import {
  BottomSheet,
  ChatBubble,
  SectionTitle,
  SolyBtnDecline,
  SolyBtnPrimary,
  SolyDetailCard,
  SolyEyebrow,
  SolyReceiptTotal,
  SurfaceCard,
  ToastNotification,
} from './src/components/SolyPrimitives';
import { RealMap } from './src/components/RealMap';
import { StayLocatorMap } from './src/components/StayLocatorMap';
import {
  agendaDays,
  companions,
  conversations,
  loyaltyTiers,
  modules,
  weatherDays,
  type ModuleKey,
} from './src/data/soly';
import { scenes, spacing, type } from './src/theme';

const solyResting = require('./assets/Soly.png');
const solyAwake = require('./assets/Soly-wakeup.png');
const solyRing = require('./assets/soly-ring.wav');

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 900,
  fade: true,
});

const quickModules: { key: ModuleKey; label: string; meta: string }[] = [
  { key: 'arrival', label: "Mode d'arrivée", meta: 'Vol AT740 à compléter' },
  { key: 'formalities', label: 'Formalités', meta: '2 dossiers incomplets' },
  { key: 'driver', label: 'Chauffeur', meta: 'Youssef arrive dans 8 min' },
  { key: 'chat', label: 'Chat', meta: '3 conversations actives' },
  { key: 'account', label: 'Compte', meta: 'Palier Hôte' },
];

const homeModules: { key: ModuleKey; label: string; kicker: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
  { key: 'stay', label: 'Mon séjour', kicker: 'le fil de vos jours', icon: 'card-travel' },
  { key: 'butler', label: 'SOLÝ', kicker: 'votre majordome', icon: 'room-service' },
  { key: 'weather', label: 'Atmosphère', kicker: "Marrakech aujourd'hui", icon: 'light-mode' },
  { key: 'explore', label: 'Explorer', kicker: 'la ville à votre main', icon: 'search' },
  { key: 'currency', label: 'Devises', kicker: "d'un simple regard", icon: 'payments' },
  { key: 'sos', label: 'SOS', kicker: 'assistance immédiate', icon: 'sos' },
];

type ArrivalMode = 'flight' | 'train' | 'car';
type AccountSection = 'advantages' | 'personal' | 'payment' | 'privacy' | 'guests';
type LiveWeatherDay = {
  label: string;
  temp: string;
  range: string;
  wind: string;
  sunset: string;
  condition: string;
  note: string;
  code?: number;
};

type LiveWeatherState = {
  status: 'loading' | 'ready' | 'denied' | 'error';
  city: string;
  currentLabel: string;
  days: LiveWeatherDay[];
};

type ExchangeRateState = {
  status: 'loading' | 'ready' | 'error';
  rate: number;
  rates: Record<string, number>;
  updatedAt: string;
};

type ExplorerActivity = {
  title: string;
  category: string;
  description: string;
  distance: string;
  eta: string;
  latitude: number;
  longitude: number;
};

type ExplorerSection = {
  title: string;
  subtitle: string;
  activities: ExplorerActivity[];
};

type ExplorerGuide = {
  district: string;
  city: string;
  note: string;
  sections: ExplorerSection[];
};

const fallbackWeather: LiveWeatherState = {
  status: 'loading',
  city: 'Marrakech',
  currentLabel: 'Marrakech · météo live',
  days: weatherDays,
};

const fallbackExchangeRate: ExchangeRateState = {
  status: 'loading',
  rate: 10.82,
  rates: { EUR: 1, USD: 1.08, JPY: 168, GBP: 0.84, CAD: 1.48, CNY: 7.86, MAD: 10.82 },
  updatedAt: "à l'ouverture",
};

const trainStations = [
  'Casablanca — Casa-Voyageurs',
  'Casablanca — Casa-Port',
  'Rabat — Agdal',
  'Rabat — Ville',
  'Kénitra',
  'Tanger — Ville (via Al Boraq)',
  'Fès',
  'Meknès',
  'Settat',
  'Ben Guerir',
  'Autre — préciser au chat',
];

const accountAdvantages = [
  { tier: 'VOYAGEUR', description: '1 sollicitation Majordome / jour · 9h—17h', note: 'Adresses choisies pour vous' },
  { tier: 'HABITUÉ', description: '2 sollicitations Majordome / jour · 9h—17h', note: 'Reconnaissance · attentions privilégiées', active: true },
  { tier: 'HÔTE', description: 'Accès privilégié au Majordome · 9h—20h', note: 'Adresses confidentielles · services privatisés' },
  { tier: 'AMBASSADEUR', description: 'Accès Signature · 24h/24', note: 'Expériences exclusives · invitations privées' },
];

const accountPersonalInfo = [
  { label: 'Thibaut ALI', detail: 'Titulaire du compte · né le 18 mars 1992', marker: '' },
  { label: '+33 6 .. .. .. 42', detail: 'Téléphone mobile — vérifié', marker: '✓' },
  { label: 'thibaut.a@...', detail: 'Courriel de contact — vérifié', marker: '✓' },
  { label: 'Paris 16e · France', detail: 'Adresse de résidence', marker: 'FR' },
];

const accountPrivacyItems = [
  { label: 'Partage entre proches', detail: 'Position et programme avec le groupe', enabled: true },
  { label: 'Géolocalisation', detail: 'Recommandations et services à proximité', enabled: true },
  { label: 'Accès aux données mobiles', detail: 'Synchronisation hors Wi‑Fi · désactivé', enabled: false, warning: true },
  { label: 'Notifications push', detail: 'Conciergerie, offres et confirmations', enabled: true },
  { label: 'Accès caméra & photos', detail: 'Scan QR et justificatifs d’identité · désactivé', enabled: false, warning: true },
  { label: 'Cookies & suivi', detail: 'Personnalisation de l’expérience', enabled: true },
  { label: 'Données d’usage anonymes', detail: 'Amélioration du service · désactivé', enabled: false, warning: true },
];

const accountGuests = [
  { name: 'Zakaria Farouki', role: 'TITULAIRE DU SÉJOUR', initial: 'Z', owner: true },
  { name: 'Sohan B.', role: 'CONVIVE · A REJOINT', initial: 'S', status: 'en ligne' },
  { name: 'Yasmine F.', role: 'CONVIVE · A REJOINT', initial: 'Y', status: 'en ligne' },
  { name: 'Nicolas B.', role: 'CONVIVE · A REJOINT', initial: 'N', status: 'en ligne' },
  { name: 'Anissa B.', role: 'CONVIVE · A REJOINT', initial: 'A', status: 'déconnectée' },
];

const explorerCompanions = [
  { name: 'Sohan B.', place: 'Riad de la Médina', distance: 'à 2 min', initial: 'S', status: 'online' },
  { name: 'Yasmine F.', place: 'Jardin Majorelle', distance: 'à 4 min', initial: 'Y', status: 'online' },
  { name: 'Nicolas B.', place: 'Souk des teinturiers', distance: 'à 9 min', initial: 'N', status: 'away' },
];

const explorerGuides: Record<string, ExplorerGuide> = {
  marrakech: {
    city: 'Marrakech',
    district: 'Médina',
    note: 'SOLÝ situe vos proches, vos étapes et glisse quelques adresses choisies à quelques pas.',
    sections: [
      {
        title: 'Escapade culturelle',
        subtitle: 'Sélection SOLÝ · à deux pas',
        activities: [
          {
            title: 'Musée YSL',
            category: 'Culture',
            description: 'Architecture de Studio KO · collections permanentes',
            distance: '3 min',
            eta: '3 min à pied',
            latitude: 31.6416,
            longitude: -8.0033,
          },
          {
            title: 'Le Monde des Arts de la Parure',
            category: 'Culture',
            description: 'Bijoux et parures du monde entier',
            distance: '3 min',
            eta: '3 min à pied',
            latitude: 31.6265,
            longitude: -7.9891,
          },
        ],
      },
      {
        title: 'Parenthèse gourmande',
        subtitle: 'Adresse choisie pour vous',
        activities: [
          {
            title: 'Nomad',
            category: 'Table',
            description: 'Terrasse contemporaine sur les toits de la médina',
            distance: '7 min',
            eta: '7 min à pied',
            latitude: 31.6297,
            longitude: -7.9867,
          },
        ],
      },
      {
        title: 'Shopping signature',
        subtitle: 'Concept stores dans la médina',
        activities: [
          {
            title: 'Atelier Akkal',
            category: 'Shopping',
            description: 'Céramique contemporaine et pièces faites main',
            distance: '12 min',
            eta: '12 min chauffeur',
            latitude: 31.6381,
            longitude: -7.9842,
          },
          {
            title: 'Souk des teinturiers',
            category: 'Shopping',
            description: 'Textiles, pigments et ateliers traditionnels',
            distance: '9 min',
            eta: '9 min à pied',
            latitude: 31.6321,
            longitude: -7.9861,
          },
        ],
      },
    ],
  },
  casablanca: {
    city: 'Casablanca',
    district: 'Anfa',
    note: 'SOLÝ adapte les haltes à Casablanca: océan, art déco et tables proches de vous.',
    sections: [
      {
        title: 'Architecture & océan',
        subtitle: 'Repères emblématiques',
        activities: [
          {
            title: 'Mosquée Hassan II',
            category: 'Culture',
            description: 'Visite monumentale face à l’Atlantique',
            distance: '8 min',
            eta: '8 min chauffeur',
            latitude: 33.6084,
            longitude: -7.6326,
          },
          {
            title: 'Quartier Habous',
            category: 'Balade',
            description: 'Arcades, librairies et pâtisseries anciennes',
            distance: '13 min',
            eta: '13 min chauffeur',
            latitude: 33.5738,
            longitude: -7.6076,
          },
        ],
      },
      {
        title: 'Parenthèse gourmande',
        subtitle: 'Tables proches',
        activities: [
          {
            title: 'La Sqala',
            category: 'Table',
            description: 'Cuisine marocaine dans une ancienne forteresse',
            distance: '6 min',
            eta: '6 min chauffeur',
            latitude: 33.5997,
            longitude: -7.6189,
          },
        ],
      },
    ],
  },
  rabat: {
    city: 'Rabat',
    district: 'Kasbah',
    note: 'SOLÝ choisit Rabat côté mer, jardins et patrimoine à portée de main.',
    sections: [
      {
        title: 'Patrimoine royal',
        subtitle: 'Sélection autour de vous',
        activities: [
          {
            title: 'Kasbah des Oudayas',
            category: 'Balade',
            description: 'Ruelles bleues, vue sur le Bouregreg et café mauresque',
            distance: '5 min',
            eta: '5 min à pied',
            latitude: 34.0319,
            longitude: -6.8361,
          },
          {
            title: 'Tour Hassan',
            category: 'Culture',
            description: 'Esplanade historique et Mausolée Mohammed V',
            distance: '9 min',
            eta: '9 min chauffeur',
            latitude: 34.0241,
            longitude: -6.8227,
          },
        ],
      },
    ],
  },
  paris: {
    city: 'Paris',
    district: 'Rive Droite',
    note: 'SOLÝ vous propose des haltes parisiennes selon votre position actuelle.',
    sections: [
      {
        title: 'Galeries & jardins',
        subtitle: 'À quelques stations',
        activities: [
          {
            title: 'Palais Royal',
            category: 'Balade',
            description: 'Jardin calme, arcades et adresses confidentielles',
            distance: '6 min',
            eta: '6 min à pied',
            latitude: 48.8647,
            longitude: 2.3376,
          },
          {
            title: 'Musée des Arts Décoratifs',
            category: 'Culture',
            description: 'Mode, design et collections permanentes',
            distance: '8 min',
            eta: '8 min à pied',
            latitude: 48.8638,
            longitude: 2.3337,
          },
        ],
      },
    ],
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_600SemiBold,
    EBGaramond_400Regular_Italic,
    Jost_400Regular,
    Jost_500Medium,
    Jost_700Bold,
    Marcellus_400Regular,
  });
  const [launchComplete, setLaunchComplete] = useState(false);
  const [screen, setScreen] = useState<ModuleKey>('home');
  const [previousScreen, setPreviousScreen] = useState<ModuleKey>('home');
  const [toast, setToast] = useState('');
  const [selectedAgenda, setSelectedAgenda] = useState<(typeof agendaDays)[number]['items'][number] | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ExplorerActivity | null>(null);
  const [selectedEmergency, setSelectedEmergency] = useState('');
  const [driverChatOpen, setDriverChatOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [solyAwake, setSolyAwake] = useState(false);
  const liveWeather = useLiveWeather();
  const exchangeRate = useExchangeRate();
  const sceneName = modules.find((item) => item.key === screen)?.scene ?? screenScene(screen);
  const scene = scenes[sceneName];
  const isLight = sceneName === 'transactional';

  useEffect(() => {
    if (!fontsLoaded) return;

    SplashScreen.hideAsync();
    const timer = setTimeout(() => setLaunchComplete(true), Platform.OS === 'web' ? 900 : 1450);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  if (!fontsLoaded || !launchComplete) {
    return <SolyLoadingScreen />;
  }

  const navigate = (next: ModuleKey, vibration = 6) => {
    Vibration.vibrate(vibration);
    setPreviousScreen(screen);
    setScreen(next);
  };

  const goBack = () => {
    Vibration.vibrate(6);
    setScreen(previousScreen === screen ? 'home' : previousScreen);
    setPreviousScreen('home');
  };

  const notify = (message: string, pattern: number | number[] = 8) => {
    Vibration.vibrate(pattern);
    setToast(message);
    setTimeout(() => setToast(''), 2200);
  };

  const shareLocation = async (recipient: 'chauffeur' | 'groupe') => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        notify('Autorisation localisation requise pour partager votre position');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const target = recipient === 'chauffeur' ? 'chauffeur' : 'accompagnants';
      try {
        await Share.share({
          message: `Position SOLÝ pour ${target}: https://maps.google.com/?q=${latitude},${longitude}`,
        });
      } catch {
        // Some web browsers block native sharing; the in-app confirmation still reflects the live coordinates.
      }
      notify(`Position partagée avec ${target} · ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, [12, 30, 12]);
    } catch {
      notify('Position indisponible · réessayez dans un instant');
    }
  };

  return (
    <SafeAreaProvider>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.stage}>
        <View style={[styles.deviceFrame, Platform.OS !== 'web' && styles.nativeDeviceFrame]}>
        <LinearGradient
          colors={screen === 'home' || screen === 'weather' || screen === 'stay' || screen === 'currency' ? ['#041E0C', '#041E0C'] : [scene.bgBright, scene.bg, scene.bgDeep, scene.bgDarker]}
          locations={screen === 'home' || screen === 'weather' || screen === 'stay' || screen === 'currency' ? [0, 1] : [0, 0.32, 0.72, 1]}
          start={{ x: 0.36, y: 0 }}
          end={{ x: 0.58, y: 1 }}
          style={styles.gradient}
        >
          <SafeAreaView
            edges={['top', 'bottom']}
            style={[
              styles.app,
              { backgroundColor: sceneName === 'transactional' ? scene.bg : 'transparent' },
            ]}
          >
        <StatusBar
          barStyle={isLight ? 'dark-content' : 'light-content'}
          backgroundColor={screen === 'home' || screen === 'weather' || screen === 'stay' || screen === 'currency' ? '#041E0C' : scene.bg}
        />
        <ToastNotification visible={Boolean(toast)} text={toast} scene={scene} />
        {screen === 'home' || screen === 'weather' || screen === 'stay' || screen === 'currency' ? null : (
          <View style={styles.topChrome}>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: scene.borderSoft }]}>
              <Text style={[styles.statusText, { color: scene.textSecondary }]}>{liveWeather.city}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.72}
              onPress={() => navigate('account')}
              style={[styles.avatar, { borderColor: scene.border, backgroundColor: scene.surfaceRaised }]}
            >
              <Text style={[styles.avatarText, { color: scene.accentPrimary }]}>ZF</Text>
            </TouchableOpacity>
          </View>
        )}
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={[
            styles.scrollContent,
            screen === 'home' && styles.homeScrollContent,
            (screen === 'weather' || screen === 'stay' || screen === 'currency') && styles.weatherScrollContent,
            screen !== 'home' && screen !== 'weather' && screen !== 'stay' && screen !== 'currency' && styles.scrollContentWithDock,
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={screen !== 'home' && screen !== 'weather' && screen !== 'currency'}
          keyboardShouldPersistTaps="handled"
        >
          {screen === 'home' ? (
            <HomeScreen navigate={navigate} notify={notify} weather={liveWeather} awake={solyAwake} onWake={() => setSolyAwake(true)} />
          ) : screen === 'stay' ? (
            <StayScreen onSelect={setSelectedAgenda} onOpenDriverChat={() => setDriverChatOpen(true)} onClose={goBack} />
          ) : screen === 'butler' ? (
            <ButlerScreen notify={notify} />
          ) : screen === 'weather' ? (
            <WeatherScreen weather={liveWeather} onClose={goBack} />
          ) : screen === 'companions' ? (
            <CompanionsScreen navigate={navigate} shareLocation={shareLocation} />
          ) : screen === 'explore' ? (
            <ExploreScreen city={liveWeather.city} onSelect={setSelectedSpot} notify={notify} shareLocation={shareLocation} />
          ) : screen === 'currency' ? (
            <CurrencyScreen exchangeRate={exchangeRate} weather={liveWeather} onClose={goBack} />
          ) : screen === 'sos' ? (
            <SosScreen onSelect={setSelectedEmergency} notify={notify} />
          ) : screen === 'arrival' ? (
            <ArrivalScreen notify={notify} />
          ) : screen === 'formalities' ? (
            <FormalitiesScreen notify={notify} />
          ) : screen === 'driver' ? (
            <DriverScreen navigate={navigate} notify={notify} shareLocation={shareLocation} />
          ) : screen === 'chat' ? (
            <ChatScreen notify={notify} />
          ) : (
            <AccountScreen notify={notify} />
          )}
        </ScrollView>

        {screen !== 'home' && screen !== 'weather' && screen !== 'stay' && screen !== 'currency' ? (
          <View style={[styles.bottomDock, { borderColor: scene.borderSoft, backgroundColor: scene.bgDeep }]}>
            <DockIconButton icon="arrow-back-ios-new" label="Retour" scene={scene} onPress={goBack} />
            <DockIconButton
              icon="forum"
              label="Messages"
              scene={scene}
              badge="2"
              onPress={() => {
                setDriverChatOpen(false);
                setMessagesOpen(false);
                navigate('chat');
              }}
              active={screen === 'chat' || messagesOpen}
            />
            <DockIconButton icon="notifications-active" label="Notifications" scene={scene} badge="3" onPress={() => notify('3 notifications en attente')} pulse />
            <DockIconButton icon="home" label="Accueil" scene={scene} onPress={() => navigate('home')} active />
          </View>
        ) : null}

        <BottomSheet
          visible={Boolean(selectedAgenda)}
          scene={scene}
          title={selectedAgenda?.title ?? ''}
          onClose={() => setSelectedAgenda(null)}
        >
          {selectedAgenda ? (
            <>
              <SolyDetailCard label="Heure" value={selectedAgenda.time} scene={scene} />
              <SolyDetailCard label="Lieu" value={selectedAgenda.place} scene={scene} />
              <SolyDetailCard label="Prestataire" value={selectedAgenda.provider} scene={scene} />
              <SolyBtnPrimary label="Contacter le chauffeur" scene={scene} onPress={() => notify('Chat chauffeur ouvert')} />
              <SolyBtnDecline label="Fermer" scene={scene} onPress={() => setSelectedAgenda(null)} />
            </>
          ) : null}
        </BottomSheet>

        <BottomSheet
          visible={Boolean(selectedSpot)}
          scene={scenes.editorial}
          title={selectedSpot?.title ?? ''}
          onClose={() => setSelectedSpot(null)}
        >
          {selectedSpot ? (
            <>
              <MiniMap dark city={liveWeather.city} markers={[selectedSpot]} />
              <Text style={[styles.explorerSheetDescription, { color: scenes.editorial.textSecondary }]}>{selectedSpot.description}</Text>
              <SolyDetailCard label="Distance" value={selectedSpot.distance} scene={scenes.editorial} />
              <SolyDetailCard label="Trajet" value={selectedSpot.eta} scene={scenes.editorial} />
              <SolyBtnPrimary label="M'y orienter" scene={scenes.editorial} onPress={() => notify('Guidage actif vers le spot')} />
              <SolyBtnDecline label="Partager au groupe" scene={scenes.editorial} onPress={() => notify('Spot partagé au groupe')} />
            </>
          ) : null}
        </BottomSheet>

        <EmergencyModal
          visible={Boolean(selectedEmergency)}
          label={selectedEmergency}
          onClose={() => setSelectedEmergency('')}
          onConfirm={() => {
            setSelectedEmergency('');
            notify('Protocole SOLÝ activé', [12, 30, 12]);
          }}
        />
        {driverChatOpen ? <DriverContactModal onClose={() => setDriverChatOpen(false)} /> : null}
        {messagesOpen ? <MessageCenterOverlay onClose={() => setMessagesOpen(false)} notify={notify} /> : null}
          </SafeAreaView>
        </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
  );
}

function SolyLoadingScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(10)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 820, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 820, useNativeDriver: true }),
      ]),
    );

    animation.start();
    Animated.parallel([
      Animated.timing(rise, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();

    return () => animation.stop();
  }, [fade, pulse, rise]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.035] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.52] });
  const firstSegmentOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });
  const lastSegmentOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] });

  return (
    <LinearGradient
      colors={['#06140E', '#0E3423', '#143F2A', '#07120D']}
      locations={[0, 0.38, 0.72, 1]}
      start={{ x: 0.22, y: 0 }}
      end={{ x: 0.82, y: 1 }}
      style={styles.loadingRoot}
    >
      <View style={styles.loadingTopLine} />
      <View style={styles.loadingFineLine} />
      <Animated.View style={[styles.loadingContent, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <Animated.View style={[styles.loadingEmblem, { transform: [{ scale }] }]}>
          <Animated.View style={[styles.loadingEmblemGlow, { opacity: glowOpacity }]} />
          <Image source={solyResting} resizeMode="contain" style={styles.loadingMascot} />
        </Animated.View>
        <Text style={styles.loadingBrand}>SOLY</Text>
        <Text style={styles.loadingSubtitle}>MAJORDOME PRIVE</Text>
        <View style={styles.loadingProgressTrack}>
          <Animated.View style={[styles.loadingProgressSegment, { opacity: firstSegmentOpacity }]} />
          <View style={[styles.loadingProgressSegment, styles.loadingProgressSegmentActive]} />
          <Animated.View style={[styles.loadingProgressSegment, { opacity: lastSegmentOpacity }]} />
        </View>
        <Text style={styles.loadingText}>PREPARATION DE VOTRE SEJOUR</Text>
      </Animated.View>
      <Text style={styles.loadingFootnote}>MARRAKECH - CONCIERGERIE SIGNATURE</Text>
    </LinearGradient>
  );
}

function HomeScreen({
  navigate,
  notify,
  weather,
  awake,
  onWake,
}: {
  navigate: (screen: ModuleKey, vibration?: number) => void;
  notify: (message: string, pattern?: number | number[]) => void;
  weather: LiveWeatherState;
  awake: boolean;
  onWake: () => void;
}) {
  const scene = scenes.immersive;
  const fade = useFadeUp();
  const ringPlayer = useAudioPlayer(solyRing);
  const [arrivalSheetOpen, setArrivalSheetOpen] = useState(false);
  const [formalitiesSheetOpen, setFormalitiesSheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [solyRequestOpen, setSolyRequestOpen] = useState(false);
  const [homeEmergencyOpen, setHomeEmergencyOpen] = useState(false);
  const homeModuleRows = useMemo(() => chunkArray(homeModules, 3), []);

  const wakeSoly = () => {
    if (awake) return;

    ringPlayer.seekTo(0);
    ringPlayer.play();
    Vibration.vibrate(10);
    onWake();
  };

  return (
    <Animated.View style={[styles.screen, styles.homeScreen, fade]}>
      <View style={styles.homeTopBar}>
        <TouchableOpacity
          activeOpacity={0.78}
          onPress={() => setAccountSheetOpen(true)}
          style={[styles.homeAccountPill, { backgroundColor: 'rgba(10,51,31,0.48)', borderColor: scene.borderSoft }]}
        >
          <View style={[styles.homeAccountInitial, { backgroundColor: scene.accentDeep }]}>
            <Text style={[styles.homeAccountInitialText, { color: scene.accentPrimary }]}>T</Text>
          </View>
          <Text style={[styles.homeAccountName, { color: scene.accentPrimary }]}>Thibaut</Text>
          <Text style={[styles.homeAccountCaret, { color: scene.accentPrimary }]}>⌄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homeHeader}>
        <Text style={[styles.homeGreeting, { color: scene.accentPrimary }]}>Bonjour, Thibaut</Text>
        <Text style={[styles.homeMeta, { color: scene.textPrimary }]}>Vendredi 15 mai  ·  {weather.city}  ·  {weather.days[0]?.temp ?? '27°C'}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.86}
        onPress={wakeSoly}
        style={styles.mascotButton}
      >
        <Image source={awake ? solyAwake : solyResting} resizeMode="contain" style={styles.mascotImage} />
      </TouchableOpacity>

      <View style={styles.homeBrand}>
        <Text style={[styles.homeLogo, { color: scene.accentPrimary }]}>SOLÝ</Text>
        <Text style={[styles.homeSubtitle, { color: scene.textPrimary }]}>VOTRE MAJORDOME</Text>
      </View>

      <HomeStayActions
        disabled={false}
        onArrival={() => setArrivalSheetOpen(true)}
        onFormalities={() => {
          Vibration.vibrate(8);
          setFormalitiesSheetOpen(true);
        }}
      />

      <TouchableOpacity activeOpacity={0.75} onPress={wakeSoly} style={styles.homeWakePrompt}>
        <View style={[styles.homeWakeDot, { backgroundColor: scene.accentPrimary }]} />
        <Text style={[styles.homeWakeText, { color: scene.accentPrimary }]}>TOUCHER SOLÝ POUR ACTIVER</Text>
        <View style={[styles.homeWakeDot, { backgroundColor: scene.accentPrimary }]} />
      </TouchableOpacity>

      <View style={styles.homeModuleGrid}>
        {homeModuleRows.map((row) => (
          <View key={row.map((item) => item.key).join('-')} style={styles.homeModuleRow}>
            {row.map((item) => {
              const isButlerTile = item.key === 'butler';
              const isSosTile = item.key === 'sos';
              const isLocked = false;

              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={isLocked ? 1 : 0.78}
                  disabled={isLocked}
                  onPress={() => {
                    if (isButlerTile) {
                      Vibration.vibrate(6);
                      setSolyRequestOpen(true);
                      return;
                    }
                    if (isSosTile) {
                      Vibration.vibrate(8);
                      setHomeEmergencyOpen(true);
                      return;
                    }

                    navigate(item.key, 8);
                  }}
                  style={[
                    styles.homeModuleTile,
                    {
                      backgroundColor: isSosTile ? 'rgba(117,25,27,0.18)' : '#062610',
                      borderColor: isSosTile ? 'rgba(230,45,49,0.42)' : '#173A1E',
                    },
                    isLocked && styles.homeModuleTileLocked,
                  ]}
                >
                  <MaterialIcons name={item.icon} size={21} color={isSosTile ? '#E62D31' : '#CFA055'} style={styles.homeModuleIcon} />
                  <View style={styles.homeTileCopy}>
                    <Text style={[styles.homeModuleLabel, { color: isSosTile ? '#F05B5E' : scene.textPrimary }]}>{item.label}</Text>
                    <Text style={[styles.homeModuleKicker, { color: scene.textMuted }]}>{item.kicker}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <HomeEmergencySheet
        visible={homeEmergencyOpen}
        weather={weather}
        onClose={() => setHomeEmergencyOpen(false)}
        notify={notify}
      />

      <ArrivalModeSheet
        visible={arrivalSheetOpen}
        onClose={() => setArrivalSheetOpen(false)}
        onConfirm={() => {
          setArrivalSheetOpen(false);
          notify('Arrivée confirmée · chauffeur informé', [12, 30, 12]);
        }}
      />
      <FormalitiesSheet
        visible={formalitiesSheetOpen}
        onClose={() => setFormalitiesSheetOpen(false)}
        notify={notify}
      />
      <SolyRequestSheet
        visible={solyRequestOpen}
        onClose={() => setSolyRequestOpen(false)}
        onRing={() => {
          wakeSoly();
          notify('SOLÝ est prévenu · un majordome arrive dans le chat', [12, 30, 12]);
        }}
      />
      <AccountSheet visible={accountSheetOpen} onClose={() => setAccountSheetOpen(false)} />
    </Animated.View>
  );
}

function HomeEmergencySheet({
  visible,
  weather,
  onClose,
  notify,
}: {
  visible: boolean;
  weather: LiveWeatherState;
  onClose: () => void;
  notify: (message: string, pattern?: number | number[]) => void;
}) {
  const [pendingCall, setPendingCall] = useState<{ label: string; number: string } | null>(null);

  if (!visible) return null;

  const directNumbers = [
    { label: 'Medical - SAMU', detail: 'Cellule urgence + partenaires medicaux', number: '15', tone: '#C95A48' },
    { label: 'Police', detail: 'Zones urbaines - dispatch securite', number: '19', tone: '#C95A48' },
    { label: 'Gendarmerie', detail: 'Zones rurales & autoroutes', number: '177', tone: '#CFA055' },
    { label: 'SOS Medecins - Marrakech', detail: 'Medecin a domicile 24/7', number: '0524404040', display: '0524 40 40 40', tone: '#CFA055' },
  ];
  const openDialer = async () => {
    if (!pendingCall) return;

    try {
      await Linking.openURL(`tel:${pendingCall.number}`);
      notify(`Appel ${pendingCall.label} prepare`, [12, 30, 12]);
      setPendingCall(null);
    } catch {
      notify("Impossible d'ouvrir l'appel sur cet appareil", [20, 40, 20]);
    }
  };

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={false}
      statusBarTranslucent={false}
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.urgentSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#041E0C" />
        <View style={styles.urgentTop}>
          <View style={styles.atmosphereAccountRow}>
            <View style={[styles.homeAccountPill, { backgroundColor: 'rgba(26,50,19,0.72)', borderColor: 'rgba(207,160,85,0.35)' }]}>
              <View style={[styles.homeAccountInitial, { backgroundColor: '#6A5C20' }]}>
                <Text style={[styles.homeAccountInitialText, { color: '#CFA055' }]}>T</Text>
              </View>
              <Text style={[styles.homeAccountName, { color: '#CFA055' }]}>Thibaut</Text>
              <Text style={[styles.homeAccountCaret, { color: '#CFA055' }]}>⌄</Text>
            </View>
          </View>
          <Text style={styles.atmosphereGreeting}>Bonjour, Thibaut</Text>
          <Text style={styles.atmosphereMeta}>Aujourd’hui  ·  {weather.city}  ·  {weather.days[0]?.temp ?? '—'}</Text>
          <Image source={solyResting} resizeMode="contain" style={styles.urgentMascotPeek} />
        </View>

        <View style={styles.urgentSheet}>
          <View style={styles.atmosphereHandle} />
          <View style={styles.atmosphereTitleRow}>
            <Text style={styles.atmosphereTitle}>Urgences</Text>
            <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.atmosphereClose}>
              <MaterialIcons name="close" size={23} color="#A6B0A5" />
            </TouchableOpacity>
          </View>
          <View style={styles.atmosphereRule} />

          <View style={styles.urgentIntroCard}>
            <Text style={styles.urgentIntroText}>
              En cas d’urgence, SOLÝ vous met en relation immédiate. Un appel n’est lancé qu’après confirmation — aucun déclenchement accidentel.
            </Text>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => setPendingCall({ label: "Cellule d’urgence", number: '112' })}
              style={styles.urgentPrimaryCall}
            >
              <MaterialIcons name="phone-in-talk" size={22} color="#F6F0E8" />
              <View>
                <Text style={styles.urgentPrimaryTitle}>Appeler la cellule d’urgence</Text>
                <Text style={styles.urgentPrimaryMeta}>112 · connecté au service le plus proche</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.urgentNumbersCard}>
            <Text style={styles.urgentNumbersTitle}>Numéros directs · Maroc</Text>
            {directNumbers.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.76}
                onPress={() => setPendingCall({ label: item.label, number: item.number })}
                style={[styles.urgentNumberRow, { borderColor: item.tone }]}
              >
                <View style={[styles.homeEmergencyDot, { backgroundColor: item.tone }]} />
                <View style={styles.homeEmergencyRowCopy}>
                  <Text style={styles.urgentNumberLabel}>{item.label.replace('Medical', 'Médical').replace('Medecins', 'Médecins')}</Text>
                  <Text style={styles.urgentNumberDetail}>{item.detail.replace('medicaux', 'médicaux').replace('securite', 'sécurité').replace('domicile', 'domicile')}</Text>
                </View>
                <Text style={styles.urgentNumberValue}>{item.display ?? item.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {pendingCall ? (
          <View style={styles.urgentConfirmOverlay}>
            <View style={styles.urgentConfirmCard}>
              <Text style={styles.urgentConfirmTitle}>Lancer l’appel d’urgence ?</Text>
              <Text style={styles.urgentConfirmDestination}>{pendingCall.label} · {pendingCall.number}</Text>
              <Text style={styles.urgentConfirmText}>
                Confirmez pour passer l’appel. Cette étape évite tout déclenchement accidentel.
              </Text>
              <View style={styles.urgentConfirmActions}>
                <TouchableOpacity activeOpacity={0.72} onPress={() => setPendingCall(null)} style={styles.urgentCancelButton}>
                  <Text style={styles.urgentCancelText}>ANNULER</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.78} onPress={openDialer} style={styles.urgentCallButton}>
                  <Text style={styles.urgentCallText}>APPELER</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function HomeEmergencySectionLabel({ label }: { label: string }) {
  return <Text style={styles.homeEmergencySectionLabel}>{label}</Text>;
}

function SolyRequestSheet({
  visible,
  onClose,
  onRing,
}: {
  visible: boolean;
  onClose: () => void;
  onRing: () => void;
}) {
  const scene = scenes.immersive;
  const [request, setRequest] = useState('');
  const [selectedDay, setSelectedDay] = useState('today');
  const [selectedSlot, setSelectedSlot] = useState('now');
  const [mode, setMode] = useState<'request' | 'chat'>('request');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 'soly-1', from: 'soly', text: 'Je suis à votre service, Thibaut. Je traite votre demande.', time: 'Aujourd’hui · 19h42' },
    { id: 'soly-2', from: 'me', text: 'Bonjour', time: 'Aujourd’hui · 19h42' },
  ]);
  const days = useMemo(() => {
    const today = new Date();

    return [0, 1].map((offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const weekday = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const month = date.toLocaleDateString('fr-FR', { month: 'short' });

      return {
        key: offset === 0 ? 'today' : 'tomorrow',
        label: offset === 0 ? "Aujourd'hui" : 'Demain',
        value: String(date.getDate()),
        meta: `${weekday} ${month}`,
      };
    });
  }, []);
  const slots = [
    { key: 'now', label: 'Maintenant', meta: "dans l'heure" },
    { key: 'noon', label: 'Midi', meta: '12h - 14h' },
    { key: 'afternoon', label: 'Après-midi', meta: '14h - 18h' },
    { key: 'evening', label: 'Soirée', meta: 'à partir de 19h' },
  ];

  useEffect(() => {
    if (visible) setMode('request');
  }, [visible]);

  const openChat = (withRequest = false) => {
    if (withRequest && request.trim()) {
      setChatMessages((current) => [
        ...current,
        { id: `soly-${Date.now()}`, from: 'me', text: request.trim(), time: 'Maintenant' },
      ]);
    }
    if (withRequest) onRing();
    setMode('chat');
  };

  const sendChatMessage = () => {
    const clean = chatDraft.trim();
    if (!clean) return;
    setChatMessages((current) => [...current, { id: `soly-${Date.now()}`, from: 'me', text: clean, time: 'Maintenant' }]);
    setChatDraft('');
    Vibration.vibrate(8);
  };

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={false}
      statusBarTranslucent={false}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.solyRequestRoot}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.solyRequestBackdrop} />
        <View style={[styles.solyRequestSheet, styles.solyModernSheet]}>
          <View style={styles.solyModernHandle} />
          <View style={[styles.solyRequestHeader, { borderBottomColor: scene.borderSoft }]}>
            <View style={styles.solyRequestHeaderCopy}>
              <Text style={styles.solyModernTitle}>Solliciter SOLÝ</Text>
            </View>
            <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.solyModernClose}>
              <MaterialIcons name="close" size={23} color="#A6B0A5" />
            </TouchableOpacity>
          </View>

          {mode === 'request' ? (
            <ScrollView
              style={styles.solyRequestScroll}
              contentContainerStyle={styles.solyModernContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.solyModernPrompt}>
                Comment puis-je <Text style={styles.solyModernPromptAccent}>vous servir,</Text> Thibaut ?
              </Text>
              <Text style={styles.solyModernNote}>Confiez-moi votre envie — je m’occupe de tout.</Text>

              <SolyRequestPickerLabel label="Votre demande" scene={scene} />
              <View style={styles.solyModernRequestField}>
              <TextInput
                value={request}
                onChangeText={setRequest}
                multiline
                textAlignVertical="top"
                  placeholder="Décrivez librement vos envies. Merci de me préciser le nombre de personnes, le jour et le créneau souhaité."
                  placeholderTextColor="#A79E96"
                  style={styles.solyModernRequestInput}
              />
              </View>

              <SolyRequestPickerLabel label="Pour quel jour ?" scene={scene} />
              <View style={styles.solyRequestChoiceGrid}>
              {days.map((day) => {
                const active = selectedDay === day.key;

                return (
                  <TouchableOpacity
                    key={day.key}
                    activeOpacity={0.78}
                    onPress={() => setSelectedDay(day.key)}
                    style={[
                      styles.solyRequestDayButton,
                      {
                        borderColor: active ? scene.accentPrimary : scene.border,
                          backgroundColor: active ? 'rgba(207,160,85,0.08)' : '#0A2C1B',
                      },
                    ]}
                  >
                    <Text style={[styles.solyRequestChoiceLabel, { color: scene.accentPrimary }]}>{day.label}</Text>
                    <Text style={[styles.solyRequestDayNumber, { color: scene.textPrimary }]}>{day.value}</Text>
                    <Text style={[styles.solyRequestChoiceMeta, { color: scene.textMuted }]}>{day.meta}</Text>
                  </TouchableOpacity>
                );
              })}
              </View>

              <SolyRequestPickerLabel label="Pour quel créneau ?" scene={scene} />
              <View style={styles.solyRequestChoiceGrid}>
              {slots.map((slot) => {
                const active = selectedSlot === slot.key;

                return (
                  <TouchableOpacity
                    key={slot.key}
                    activeOpacity={0.78}
                    onPress={() => setSelectedSlot(slot.key)}
                    style={[
                      styles.solyRequestSlotButton,
                      {
                        borderColor: active ? scene.accentPrimary : scene.border,
                          backgroundColor: active ? 'rgba(207,160,85,0.08)' : '#0A2C1B',
                      },
                    ]}
                  >
                    <Text style={[styles.solyRequestChoiceLabel, { color: scene.textPrimary }]}>{slot.label}</Text>
                    <Text style={[styles.solyRequestChoiceMeta, { color: scene.textMuted }]}>{slot.meta}</Text>
                  </TouchableOpacity>
                );
              })}
              </View>

              <TouchableOpacity activeOpacity={0.84} onPress={() => openChat(true)} style={styles.solyModernRingButton}>
                <Text style={styles.solyModernRingText}>SONNER SOLÝ</Text>
                <MaterialIcons name="arrow-forward" size={22} color="#092416" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.72} onPress={() => openChat(false)} style={styles.solyRequestChatLink}>
                <Text style={styles.solyModernChatLink}>Échanger en chat avec un majordome</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.solyChatBody}>
              <ScrollView contentContainerStyle={styles.solyChatMessages} showsVerticalScrollIndicator={false}>
                {chatMessages.map((message) => {
                  const mine = message.from === 'me';
                  return (
                    <View key={message.id} style={[styles.solyChatMessageRow, mine ? styles.solyChatMessageRowMine : styles.solyChatMessageRowSoly]}>
                      <View style={[styles.solyChatBubble, mine ? styles.solyChatBubbleMine : styles.solyChatBubbleSoly]}>
                        <Text style={styles.solyChatMessageText}>{message.text}</Text>
                        <Text style={styles.solyChatMessageTime}>{message.time}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              <View style={styles.solyChatComposer}>
                <TextInput
                  value={chatDraft}
                  onChangeText={setChatDraft}
                  onSubmitEditing={sendChatMessage}
                  placeholder="Écrire un message..."
                  placeholderTextColor="#879A8D"
                  style={styles.solyChatInput}
                />
                <TouchableOpacity activeOpacity={0.78} onPress={sendChatMessage} style={styles.solyChatSend}>
                  <MaterialIcons name="chevron-right" size={23} color="#092416" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SolyRequestPickerLabel({ label, scene }: { label: string; scene: typeof scenes.immersive }) {
  return (
    <View style={styles.solyRequestPickerLabel}>
      <View style={[styles.solyRequestPickerDash, { backgroundColor: scene.accentPrimary }]} />
      <Text style={[styles.solyRequestPickerText, { color: scene.accentPrimary }]}>{label}</Text>
    </View>
  );
}

function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<AccountSection | ''>('');
  const [paymentDeleteConfirm, setPaymentDeleteConfirm] = useState(false);
  const [paymentRemoved, setPaymentRemoved] = useState(false);
  const [paymentEntryOpen, setPaymentEntryOpen] = useState(false);
  const [inviteGuestOpen, setInviteGuestOpen] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    location: true,
    notifications: true,
  });
  const detailExpanded =
    activeSection === 'advantages' ||
    activeSection === 'personal' ||
    activeSection === 'payment' ||
    activeSection === 'privacy';

  const syncPrivacyPermissions = async () => {
    const [locationPermission, notificationPermission] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);
    setPrivacySettings({
      location: locationPermission.status === 'granted',
      notifications: notificationPermission.status === 'granted',
    });
  };

  useEffect(() => {
    if (!visible) return undefined;

    void syncPrivacyPermissions();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncPrivacyPermissions();
    });
    return () => subscription.remove();
  }, [visible]);

  const togglePhonePermission = async (key: 'location' | 'notifications') => {
    Vibration.vibrate(5);
    if (privacySettings[key]) {
      await Linking.openSettings();
      return;
    }

    const permission =
      key === 'location'
        ? await Location.requestForegroundPermissionsAsync()
        : await Notifications.requestPermissionsAsync();

    setPrivacySettings((current) => ({
      ...current,
      [key]: permission.status === 'granted',
    }));

    if (permission.status !== 'granted' && !permission.canAskAgain) {
      await Linking.openSettings();
    }
  };
  const sections: { key: AccountSection; title: string; subtitle: string; icon: React.ComponentProps<typeof MaterialIcons>['name'] }[] = [
    { key: 'advantages', title: 'Vos avantages', subtitle: 'Statut Habitué · accès prioritaire', icon: 'star-outline' },
    { key: 'personal', title: 'Données personnelles', subtitle: 'Profil et coordonnées', icon: 'person-outline' },
    { key: 'payment', title: 'Paiement', subtitle: 'Visa Infinite · •••• 6411', icon: 'credit-card' },
    { key: 'privacy', title: 'Confidentialité', subtitle: 'Permissions et préférences', icon: 'lock-outline' },
    { key: 'guests', title: 'Inviter un convive', subtitle: 'Partager une invitation au séjour', icon: 'person-add-alt' },
  ];

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={false}
      statusBarTranslucent={false}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.accountModernRoot}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.accountBackdrop} />
        <View style={styles.accountModernSheet}>
          <View style={styles.solyModernHandle} />
          <View style={styles.accountModernHeader}>
            <Text style={styles.accountModernTitle}>Votre compte</Text>
            <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.solyModernClose}>
              <MaterialIcons name="close" size={23} color="#A6B0A5" />
            </TouchableOpacity>
          </View>
          <View style={styles.atmosphereRule} />

          <View style={styles.accountModernContent}>
            <View style={styles.accountModernHero}>
              <View style={styles.accountModernHeroTop}>
                <Text style={styles.accountModernSince}>MEMBRE DEPUIS 2021</Text>
                <View style={styles.accountModernTierBadge}>
                  <Text style={styles.accountModernTierText}>HABITUÉ</Text>
                </View>
              </View>
              <Text style={styles.accountModernName}>Thibaut</Text>
              <Text style={styles.accountModernClient}>N° SLV–04287</Text>
              <View style={styles.accountModernProgressLabels}>
                <Text style={styles.accountModernProgressLabel}>HABITUÉ</Text>
                <Text style={styles.accountModernProgressValue}>42% vers HÔTE</Text>
                <Text style={styles.accountModernProgressLabel}>HÔTE</Text>
              </View>
              <View style={styles.accountModernProgressTrack}>
                <View style={styles.accountModernProgressFill} />
              </View>
              <Text style={styles.accountModernProgressNote}>42% vers le statut Hôte</Text>
            </View>

            <View style={[styles.accountModernMenu, detailExpanded && styles.accountModernMenuExpanded]}>
              {(detailExpanded ? sections.filter((section) => section.key === activeSection) : sections).map((section) => {
                const active = activeSection === section.key;
                return (
                  <View
                    key={section.key}
                    style={[
                      active && detailExpanded && styles.accountAdvantageExpanded,
                      active && section.key === 'payment' && styles.accountPaymentExpanded,
                      active && section.key === 'privacy' && styles.accountPrivacyExpanded,
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.76}
                      onPress={() => {
                        Vibration.vibrate(5);
                        if (section.key === 'guests') {
                          setInviteGuestOpen(true);
                          return;
                        }
                        setActiveSection(active ? '' : section.key);
                      }}
                      style={[
                        styles.accountModernRow,
                        active && styles.accountModernRowActive,
                        active && detailExpanded && styles.accountModernRowExpanded,
                      ]}
                    >
                      <MaterialIcons name={section.icon} size={23} color="#CFA055" />
                      <View style={styles.accountModernRowCopy}>
                        <Text style={styles.accountModernRowTitle}>{section.title}</Text>
                        <Text style={styles.accountModernRowSubtitle}>{section.subtitle}</Text>
                      </View>
                      <MaterialIcons name={active ? 'expand-less' : 'chevron-right'} size={27} color="#CFA055" />
                    </TouchableOpacity>

                    {active && section.key === 'advantages' ? (
                      <View style={styles.accountTierList}>
                        {accountAdvantages.map((item, index) => {
                          const tones = ['#CFA055', '#D8872D', '#54D786', '#42C1D9'];
                          const tone = tones[index];
                          return (
                            <View key={item.tier} style={[styles.accountTierCardModern, { borderColor: tone }]}>
                              <View style={styles.accountTierCardTop}>
                                <Text style={[styles.accountTierCardName, { color: tone }]}>{item.tier}</Text>
                                {index === 0 ? (
                                  <View style={styles.accountTierCurrentBadge}>
                                    <Text style={styles.accountTierCurrentText}>ACTUEL</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.accountTierCardDescription}>{item.description}</Text>
                              <Text style={styles.accountTierCardNote}>{item.note}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    {active && section.key === 'personal' ? (
                      <View style={styles.accountPersonalList}>
                        {accountPersonalInfo.map((item) => (
                          <View key={item.label} style={styles.accountPersonalCard}>
                            <View style={styles.accountPersonalDot} />
                            <View style={styles.accountPersonalCopy}>
                              <Text style={styles.accountPersonalLabel}>{item.label}</Text>
                              <Text style={styles.accountPersonalDetail}>{item.detail}</Text>
                            </View>
                            {item.marker ? (
                              item.marker === '✓' ? (
                                <MaterialIcons name="check" size={26} color="#54D786" />
                              ) : (
                                <Text style={styles.accountPersonalMarker}>{item.marker}</Text>
                              )
                            ) : null}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {active && section.key === 'payment' ? (
                      <View style={styles.accountPaymentContent}>
                        {!paymentRemoved ? (
                          <View style={styles.accountModernPaymentCard}>
                            {!paymentDeleteConfirm ? (
                              <View style={styles.accountPaymentIcon}>
                                <MaterialIcons name="credit-card" size={23} color="#CFA055" />
                              </View>
                            ) : null}
                            <View style={styles.accountPaymentCopy}>
                              <Text style={styles.accountPaymentName}>Visa ···· 4242</Text>
                              <Text style={styles.accountPaymentExpiry}>Expire 12/27</Text>
                            </View>
                            {paymentDeleteConfirm ? (
                              <View style={styles.accountPaymentConfirmActions}>
                                <TouchableOpacity
                                  activeOpacity={0.72}
                                  onPress={() => setPaymentDeleteConfirm(false)}
                                  style={styles.accountPaymentCancel}
                                >
                                  <Text style={styles.accountPaymentCancelText}>ANNULER</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  activeOpacity={0.72}
                                  onPress={() => {
                                    Vibration.vibrate(8);
                                    setPaymentRemoved(true);
                                    setPaymentDeleteConfirm(false);
                                  }}
                                  style={styles.accountPaymentDelete}
                                >
                                  <Text style={styles.accountPaymentDeleteText}>SUPPRIMER</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <>
                                <View style={styles.accountVisaBadge}>
                                  <Text style={styles.accountVisaText}>VISA</Text>
                                </View>
                                <TouchableOpacity
                                  activeOpacity={0.72}
                                  onPress={() => {
                                    Vibration.vibrate(5);
                                    setPaymentDeleteConfirm(true);
                                  }}
                                  style={styles.accountModernPaymentRemove}
                                >
                                  <MaterialIcons name="close" size={23} color="#B6C0B8" />
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        ) : null}

                        <TouchableOpacity
                          activeOpacity={0.75}
                          onPress={() => {
                            Vibration.vibrate(5);
                            setPaymentEntryOpen(true);
                          }}
                          style={styles.accountAddPayment}
                        >
                          <MaterialIcons name="add" size={31} color="#CFA055" />
                          <Text style={styles.accountAddPaymentText}>Ajouter un moyen de paiement</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {active && section.key === 'privacy' ? (
                      <View style={styles.accountPrivacyList}>
                        {[
                          {
                            key: 'location' as const,
                            title: 'Géolocalisation',
                            detail: 'Recommandations et services à proximité',
                          },
                          {
                            key: 'notifications' as const,
                            title: 'Notifications push',
                            detail: 'Conciergerie, offres et confirmations',
                          },
                        ].map((item) => {
                          const enabled = privacySettings[item.key];
                          return (
                            <TouchableOpacity
                              key={item.key}
                              activeOpacity={0.78}
                              onPress={() => void togglePhonePermission(item.key)}
                              style={styles.accountPrivacyModernCard}
                            >
                              <View style={styles.accountPersonalDot} />
                              <View style={styles.accountPersonalCopy}>
                                <Text style={styles.accountPrivacyModernTitle}>{item.title}</Text>
                                <Text style={styles.accountPrivacyModernDetail}>{item.detail}</Text>
                              </View>
                              <View style={[styles.accountPrivacySwitch, enabled && styles.accountPrivacySwitchOn]}>
                                <View style={[styles.accountPrivacyKnob, enabled && styles.accountPrivacyKnobOn]} />
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
        {paymentEntryOpen ? (
          <PaymentEntrySheet
            onClose={() => setPaymentEntryOpen(false)}
            onSave={() => {
              setPaymentRemoved(false);
              setPaymentEntryOpen(false);
            }}
          />
        ) : null}
        {inviteGuestOpen ? <InviteGuestSheet onClose={() => setInviteGuestOpen(false)} /> : null}
      </View>
    </Modal>
  );
}

function PaymentEntrySheet({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [method, setMethod] = useState<'card' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiration, setExpiration] = useState('');
  const [crypto, setCrypto] = useState('');
  const [holder, setHolder] = useState('');

  return (
    <View style={styles.paymentEntryOverlay}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.paymentEntryBackdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.paymentEntrySheet}
      >
        <View style={styles.solyModernHandle} />
        <View style={styles.paymentEntryHeader}>
          <Text style={styles.paymentEntryTitle}>Paiement</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.solyModernClose}>
            <MaterialIcons name="close" size={25} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.atmosphereRule} />

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.paymentEntryContent}
        >
          <Text style={styles.paymentEntryIntro}>
            Vos coordonnées ne quittent jamais votre appareil pendant la saisie.{'\n'}
            Seuls les <Text style={styles.paymentEntryIntroStrong}>quatre derniers chiffres et le type de carte</Text> sont conservés pour affichage.
          </Text>

          <View style={styles.paymentMethodTabs}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMethod('card')}
              style={[styles.paymentMethodTab, method === 'card' && styles.paymentMethodTabActive]}
            >
              <Text style={styles.paymentMethodText}>Carte bancaire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setMethod('paypal')}
              style={[styles.paymentMethodTab, method === 'paypal' && styles.paymentMethodTabActive]}
            >
              <Text style={styles.paymentMethodText}>PayPal</Text>
            </TouchableOpacity>
          </View>

          {method === 'card' ? (
            <>
              <PaymentField label="NUMÉRO DE CARTE" value={cardNumber} onChangeText={setCardNumber} placeholder="0000 0000 0000 0000" keyboardType="number-pad" />
              <PaymentField label="EXPIRATION" value={expiration} onChangeText={setExpiration} placeholder="MM/AA" keyboardType="number-pad" />
              <PaymentField label="CRYPTO" value={crypto} onChangeText={setCrypto} placeholder="000" keyboardType="number-pad" secureTextEntry />
              <PaymentField label="NOM DU TITULAIRE" value={holder} onChangeText={setHolder} placeholder="Comme inscrit sur la carte" autoCapitalize="words" />
            </>
          ) : (
            <PaymentField label="ADRESSE PAYPAL" value={holder} onChangeText={setHolder} placeholder="nom@exemple.com" keyboardType="email-address" autoCapitalize="none" />
          )}

          <TouchableOpacity activeOpacity={0.78} onPress={onSave} style={styles.paymentEntrySave}>
            <Text style={styles.paymentEntrySaveText}>ENREGISTRER</Text>
          </TouchableOpacity>
          <View style={styles.paymentEntrySecurity}>
            <MaterialIcons name="lock-outline" size={13} color="#A9B6AD" />
            <Text style={styles.paymentEntrySecurityText}>Chiffrement TLS · aucune donnée brute conservée</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PaymentField({
  label,
  ...inputProps
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.paymentField}>
      <Text style={styles.paymentFieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor="#829087"
        selectionColor="#CFA055"
        style={styles.paymentFieldInput}
      />
    </View>
  );
}

function InviteGuestSheet({ onClose }: { onClose: () => void }) {
  const inviteLink = 'https://soly.app/j/SLY-04287-2024-mrk';
  const inviteMessage = `Rejoignez mon séjour SOLÝ : ${inviteLink}`;
  const [copied, setCopied] = useState(false);

  const shareInvite = async (channel: 'sms' | 'email' | 'whatsapp' | 'other') => {
    Vibration.vibrate(5);

    if (channel === 'other') {
      await Share.share({ title: 'Invitation SOLÝ', message: inviteMessage, url: inviteLink });
      return;
    }

    const encodedMessage = encodeURIComponent(inviteMessage);
    const urls = {
      sms: Platform.OS === 'ios' ? `sms:&body=${encodedMessage}` : `sms:?body=${encodedMessage}`,
      email: `mailto:?subject=${encodeURIComponent('Invitation à mon séjour SOLÝ')}&body=${encodedMessage}`,
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
    };
    await Linking.openURL(urls[channel]);
  };

  return (
    <View style={styles.inviteGuestOverlay}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.paymentEntryBackdrop} />
      <View style={styles.inviteGuestSheet}>
        <View style={styles.solyModernHandle} />
        <View style={styles.inviteGuestHeader}>
          <Text style={styles.inviteGuestTitle}>Inviter un convive</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.solyModernClose}>
            <MaterialIcons name="close" size={25} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.atmosphereRule} />

        <Text style={styles.inviteGuestIntro}>
          Conviez vos proches au séjour. Ils retrouveront le programme, les horaires et le chat de groupe dès leur arrivée dans l’app.
        </Text>

        <View style={styles.inviteLinkCard}>
          <Text numberOfLines={1} style={styles.inviteLinkText}>{inviteLink}</Text>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={async () => {
              await Clipboard.setStringAsync(inviteLink);
              Vibration.vibrate(5);
              setCopied(true);
            }}
            style={styles.inviteCopyButton}
          >
            <Text style={styles.inviteCopyText}>{copied ? 'COPIÉ' : 'COPIER'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inviteChannels}>
          {[
            { key: 'sms' as const, label: 'SMS', icon: 'chat-bubble-outline' as const },
            { key: 'email' as const, label: 'E-mail', icon: 'mail-outline' as const },
            { key: 'whatsapp' as const, label: 'WhatsApp', icon: 'phone-in-talk' as const },
            { key: 'other' as const, label: 'Autres', icon: 'more-horiz' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.75}
              onPress={() => void shareInvite(item.key)}
              style={styles.inviteChannelButton}
            >
              <MaterialIcons name={item.icon} size={21} color="#CFA055" />
              <Text style={styles.inviteChannelText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inviteGuestNote}>
          <Text style={styles.inviteGuestNoteText}>
            Vos convives auront accès au programme partagé, au chat de groupe et à la cagnotte commune. SOLÝ, vos paiements et le chauffeur restent sous votre seule autorité.
          </Text>
        </View>
      </View>
    </View>
  );
}

function AccountSectionBlock({
  title,
  open,
  onToggle,
  children,
}: React.PropsWithChildren<{
  title: string;
  open: boolean;
  onToggle: () => void;
}>) {
  return (
    <View style={styles.accountSectionBlock}>
      <TouchableOpacity activeOpacity={0.74} onPress={onToggle} style={styles.accountSectionHeader}>
        <Text style={styles.accountSectionTitle}>{title}</Text>
        <Text style={styles.accountSectionChevron}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {open ? <View style={styles.accountSectionContent}>{children}</View> : null}
    </View>
  );
}

function HomeStayActions({
  disabled,
  onArrival,
  onFormalities,
}: {
  disabled: boolean;
  onArrival: () => void;
  onFormalities: () => void;
}) {
  const scene = scenes.immersive;

  return (
    <View style={[styles.homeStayActions, disabled && styles.homeStayActionsLocked]}>
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.78}
        disabled={disabled}
        onPress={onArrival}
        style={[styles.homeActionCard, { backgroundColor: scene.surfaceRaised, borderColor: scene.borderSoft }]}
      >
        <View style={[styles.homeActionIcon, { borderColor: scene.borderSoft, backgroundColor: 'rgba(207,160,85,0.08)' }]}>
          <Text style={[styles.homeActionIconText, { color: scene.accentPrimary }]}>✈</Text>
        </View>
        <View style={styles.homeActionCopy}>
          <Text style={[styles.homeActionTitle, { color: scene.textPrimary }]}>Indiquez votre mode d'arrivée</Text>
          <Text style={[styles.homeActionMeta, { color: scene.accentPrimary }]}>Avion, train ou voiture — un chauffeur vous attendra</Text>
        </View>
        <Text style={[styles.homeActionChevron, { color: scene.accentPrimary }]}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.78}
        disabled={disabled}
        onPress={onFormalities}
        style={[styles.homeActionCard, { backgroundColor: scene.surfaceRaised, borderColor: scene.borderSoft }]}
      >
        <View style={[styles.homeActionIcon, { borderColor: scene.borderSoft, backgroundColor: 'rgba(207,160,85,0.08)' }]}>
          <Text style={[styles.homeActionIconText, { color: scene.accentPrimary }]}>⚠</Text>
        </View>
        <View style={styles.homeActionCopy}>
          <Text style={[styles.homeActionTitle, { color: scene.textPrimary }]}>Formalités d'arrivée à compléter</Text>
          <Text style={[styles.homeActionMeta, { color: scene.accentPrimary }]}>2 dossiers sur 3 incomplets — échéance dans 3 jours</Text>
        </View>
        <Text style={[styles.homeActionChevron, { color: scene.accentPrimary }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function ArrivalModeSheet({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mode, setMode] = useState<ArrivalMode>('flight');
  const [trainStation, setTrainStation] = useState(trainStations[0]);
  const [trainStationOpen, setTrainStationOpen] = useState(false);
  const isFlight = mode === 'flight';
  const isTrain = mode === 'train';
  const isCar = mode === 'car';

  const selectMode = (next: ArrivalMode) => {
    setMode(next);
    setTrainStationOpen(false);
    Vibration.vibrate(6);
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.arrivalModalRoot}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.arrivalBackdrop} />
        <View style={styles.arrivalSheet}>
          <View style={styles.arrivalHandle} />
          <View style={styles.arrivalHeader}>
            <View style={styles.arrivalHeaderIcon}>
              <Text style={styles.arrivalHeaderIconText}>✦</Text>
            </View>
            <View style={styles.arrivalHeaderCopy}>
              <Text style={styles.arrivalTitle}>Mode d'arrivée</Text>
              <Text style={styles.arrivalSubtitle}>POUR VOUS ACCUEILLIR À MARRAKECH</Text>
            </View>
            <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.arrivalClose}>
              <Text style={styles.arrivalCloseText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.arrivalScroll}
            contentContainerStyle={styles.arrivalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.arrivalIntro}>
              <Text style={styles.arrivalEyebrow}>— POUR VOUS ACCUEILLIR À MARRAKECH —</Text>
              <Text style={styles.arrivalIntroTitle}>Votre <Text style={styles.arrivalIntroAccent}>arrivée.</Text></Text>
              <Text style={styles.arrivalIntroText}>Indiquez votre mode d'arrivée. Un chauffeur vous attendra à l'heure exacte.</Text>
            </View>

            <ArrivalOption
              active={isFlight}
              icon="✈"
              title="Arrivée en avion"
              subtitle="AÉROPORT MENARA · MARRAKECH"
              onPress={() => selectMode('flight')}
            >
              {isFlight ? (
                <View style={styles.arrivalExpanded}>
                  <View style={styles.arrivalField}>
                    <Text style={styles.arrivalFieldLabel}>COMPAGNIE AÉRIENNE</Text>
                    <View style={styles.arrivalSelectRow}>
                      <Text style={styles.arrivalFieldValue}>Royal Air Maroc</Text>
                      <Text style={styles.arrivalSelectChevron}>⌄</Text>
                    </View>
                  </View>
                  <View style={styles.arrivalField}>
                    <Text style={styles.arrivalFieldLabel}>NUMÉRO DE VOL</Text>
                    <TextInput value="AT 879" editable={false} style={styles.arrivalTextInput} />
                  </View>
                  <View style={styles.arrivalMiniPanel}>
                    <View style={styles.arrivalMiniField}>
                      <Text style={styles.arrivalFieldLabel}>ATTERRISSAGE</Text>
                      <TextInput value="11:45 AM" editable={false} style={styles.arrivalMiniValue} />
                    </View>
                    <Text style={styles.arrivalClock}>◷</Text>
                    <View style={styles.arrivalMiniField}>
                      <Text style={styles.arrivalFieldLabel}>DATE</Text>
                      <TextInput value="06/12/2026" editable={false} style={styles.arrivalMiniValue} />
                    </View>
                  </View>
                </View>
              ) : null}
            </ArrivalOption>

            <ArrivalOption
              active={isTrain}
              icon="≡"
              title="Arrivée en train"
              subtitle="GARE ONCF · MARRAKECH"
              onPress={() => selectMode('train')}
            >
              {isTrain ? (
                <View style={styles.arrivalExpanded}>
                  <View style={styles.arrivalField}>
                    <Text style={styles.arrivalFieldLabel}>GARE DE DÉPART</Text>
                    <TouchableOpacity activeOpacity={0.76} onPress={() => setTrainStationOpen((open) => !open)} style={styles.arrivalSelectRow}>
                      <Text style={styles.arrivalFieldValue}>{trainStation}</Text>
                      <Text style={styles.arrivalSelectChevron}>⌄</Text>
                    </TouchableOpacity>
                    {trainStationOpen ? (
                      <View style={styles.trainDropdown}>
                        {trainStations.map((station) => (
                          <TouchableOpacity
                            key={station}
                            activeOpacity={0.74}
                            onPress={() => {
                              setTrainStation(station);
                              setTrainStationOpen(false);
                            }}
                            style={[styles.trainOption, station === trainStation && styles.trainOptionActive]}
                          >
                            <Text style={[styles.trainOptionText, station === trainStation && styles.trainOptionTextActive]}>{station}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.arrivalMiniPanel}>
                    <View style={styles.arrivalMiniField}>
                      <Text style={styles.arrivalFieldLabel}>ARRIVÉE PRÉVUE</Text>
                      <TextInput value="02:30 PM" editable={false} style={styles.arrivalMiniValue} />
                    </View>
                    <Text style={styles.arrivalClock}>◷</Text>
                    <View style={styles.arrivalMiniField}>
                      <Text style={styles.arrivalFieldLabel}>DATE</Text>
                      <TextInput value="06/12/2026" editable={false} style={styles.arrivalMiniValue} />
                    </View>
                  </View>
                </View>
              ) : null}
            </ArrivalOption>

            <ArrivalOption
              active={isCar}
              icon="⌬"
              title="Arrivée en voiture"
              subtitle="PAS DE PRISE EN CHARGE"
              onPress={() => selectMode('car')}
            >
              {isCar ? (
                <View style={styles.arrivalExpanded}>
                  <Text style={styles.arrivalCarNote}>Vous serez libre d'arriver à votre rythme. SOLÝ gardera le chat ouvert pour toute assistance.</Text>
                </View>
              ) : null}
            </ArrivalOption>

            <Text style={styles.arrivalFootnote}>À l'heure d'arrivée prévue, un chat avec votre chauffeur s'ouvrira automatiquement dans l'application.</Text>
            <TouchableOpacity activeOpacity={0.82} onPress={onConfirm} style={styles.arrivalConfirm}>
              <Text style={styles.arrivalConfirmText}>CONFIRMER MON ARRIVÉE</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FormalitiesSheet({
  visible,
  onClose,
  notify,
}: {
  visible: boolean;
  onClose: () => void;
  notify: (message: string, pattern?: number | number[]) => void;
}) {
  const dossiers = [
    { name: 'Thibaut', status: 'COMPLET', passport: 'Passeport vérifié', visa: 'Visa non requis', complete: true },
    { name: 'Yasmine F.', status: 'INCOMPLET', passport: 'Passeport à ajouter', visa: 'Visa non requis', complete: false },
    { name: 'Nicolas B.', status: 'À VÉRIFIER', passport: 'Passeport reçu', visa: 'Visa à vérifier', complete: false },
  ];

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={false}
      statusBarTranslucent={false}
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.formalitiesModalRoot}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.arrivalBackdrop} />
        <View style={styles.formalitiesSheet}>
          <View style={styles.solyModernHandle} />
          <View style={styles.formalitiesHeader}>
            <Text style={styles.formalitiesTitle}>Formalités</Text>
            <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.solyModernClose}>
              <MaterialIcons name="close" size={23} color="#A6B0A5" />
            </TouchableOpacity>
          </View>
          <View style={styles.atmosphereRule} />

          <Text style={styles.formalitiesIntro}>
            Complétez les documents d’arrivée pour garantir un accueil fluide dès votre arrivée à Marrakech.
          </Text>

          <View style={styles.formalitiesAlert}>
            <View style={styles.formalitiesAlertIcon}>
              <MaterialIcons name="warning-amber" size={22} color="#CFA055" />
            </View>
            <View style={styles.formalitiesAlertCopy}>
              <Text style={styles.formalitiesAlertTitle}>2 dossiers sur 3 incomplets</Text>
              <Text style={styles.formalitiesAlertText}>Échéance dans 3 jours</Text>
            </View>
          </View>

          <ScrollView
            style={styles.formalitiesScroll}
            contentContainerStyle={styles.formalitiesList}
            showsVerticalScrollIndicator={false}
          >
            {dossiers.map((dossier) => (
              <View key={dossier.name} style={styles.formalitiesCard}>
                <View style={styles.formalitiesCardTop}>
                  <Text style={styles.formalitiesName}>{dossier.name}</Text>
                  <View style={[styles.formalitiesStatus, dossier.complete && styles.formalitiesStatusComplete]}>
                    <Text style={[styles.formalitiesStatusText, dossier.complete && styles.formalitiesStatusTextComplete]}>
                      {dossier.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.formalitiesDetailRow}>
                  <MaterialIcons
                    name={dossier.complete ? 'check-circle-outline' : 'error-outline'}
                    size={18}
                    color={dossier.complete ? '#54D786' : '#CFA055'}
                  />
                  <Text style={styles.formalitiesDetail}>{dossier.passport}</Text>
                </View>
                <View style={styles.formalitiesDetailRow}>
                  <MaterialIcons name="description" size={18} color="#CFA055" />
                  <Text style={styles.formalitiesDetail}>{dossier.visa}</Text>
                </View>
                {!dossier.complete ? (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    onPress={() => notify(`Dossier ${dossier.name} ouvert`, 8)}
                    style={styles.formalitiesUpdate}
                  >
                    <Text style={styles.formalitiesUpdateText}>METTRE À JOUR</Text>
                    <MaterialIcons name="arrow-forward" size={18} color="#082718" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ArrivalOption({
  active,
  icon,
  title,
  subtitle,
  onPress,
  children,
}: React.PropsWithChildren<{
  active: boolean;
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}>) {
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[styles.arrivalOption, active && styles.arrivalOptionActive]}
    >
      <View style={styles.arrivalOptionHead}>
        <View style={[styles.arrivalOptionIcon, active && styles.arrivalOptionIconActive]}>
          <Text style={styles.arrivalOptionIconText}>{icon}</Text>
        </View>
        <View style={styles.arrivalOptionCopy}>
          <Text style={styles.arrivalOptionTitle}>{title}</Text>
          <Text style={styles.arrivalOptionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </TouchableOpacity>
  );
}

function StayScreen({
  onSelect,
  onOpenDriverChat,
  onClose,
}: {
  onSelect: (item: (typeof agendaDays)[number]['items'][number]) => void;
  onOpenDriverChat: () => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(0);
  const [locatorOpen, setLocatorOpen] = useState(false);
  const visibleDays = agendaDays.slice(0, 2);

  return (
    <View style={[styles.stayLayerScreen, locatorOpen && styles.stayLayerScreenExpanded]}>
      <View style={styles.stayLayerTop}>
        <Image source={solyResting} resizeMode="contain" style={styles.stayMascotPeek} />
      </View>

      <View style={[styles.stayLayerSheet, locatorOpen && styles.stayLayerSheetExpanded]}>
        <View style={[styles.atmosphereHandle, styles.stayLayerHandle]} />
        <View style={styles.atmosphereTitleRow}>
          <Text style={styles.atmosphereTitle}>Mon séjour</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.atmosphereClose}>
            <MaterialIcons name="close" size={23} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.atmosphereRule} />

        <View style={styles.stayDriverCard}>
          <View style={styles.driverArrivalBadge}>
            <View style={styles.driverArrivalBadgeDot} />
            <Text style={styles.driverArrivalBadgeText}>DANS 45 MIN</Text>
          </View>
          <Text style={styles.stayDriverHeadline}>
            <Text style={styles.stayDriverName}>Youssef</Text> arrive dans 45 min
          </Text>
          <Text style={styles.stayDriverRoute}>Aéroport Menara · Porte B → Riad Yasmine · médina</Text>
          <Text style={styles.stayDriverCar}>MERCEDES CLASSE V  ·  184  -  A  -  32</Text>

          <View style={styles.driverArrivalActions}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => {
                Vibration.vibrate(8);
                setLocatorOpen((current) => !current);
              }}
              style={[styles.stayDriverButton, locatorOpen && styles.stayDriverButtonLocated]}
            >
              <MaterialIcons name={locatorOpen ? 'check' : 'location-on'} size={18} color={locatorOpen ? '#54D786' : '#CFA055'} />
              <Text style={[styles.stayDriverButtonText, locatorOpen && styles.stayDriverButtonTextLocated]}>LOCALISER</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.78} onPress={onOpenDriverChat} style={styles.stayDriverButton}>
              <MaterialIcons name="mail-outline" size={18} color="#CFA055" />
              <Text style={styles.stayDriverButtonText}>CONTACTER</Text>
            </TouchableOpacity>
          </View>
          <StayLocatorMap visible={locatorOpen} onClose={() => setLocatorOpen(false)} />
        </View>

        <Text style={styles.stayLayerWelcome}>Nous sommes heureux de vous accueillir du 15 au 17 mai</Text>

        {visibleDays.map((day, index) => (
          <View key={day.day} style={styles.stayDayCard}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              Vibration.vibrate(6);
              setOpen(open === index ? -1 : index);
            }}
            style={styles.stayDayHead}
          >
            <View style={styles.stayDayCopy}>
              <Text style={styles.stayDayTitle}>{index === 0 ? 'Vendredi 15 mai' : 'Samedi 16 mai'}</Text>
              <Text numberOfLines={1} style={styles.stayDaySubtitle}>{index === 0 ? "Aujourd’hui · Vos premiers instants à Marrakech" : 'Médina & culture'}</Text>
            </View>
            <View style={styles.stayDayBadge}>
              <Text style={styles.stayDayBadgeText}>{index === 0 ? '6' : '3'}</Text>
            </View>
            <MaterialIcons name={open === index ? 'arrow-drop-up' : 'arrow-drop-down'} size={20} color="#CFA055" />
          </TouchableOpacity>
          {open === index ? (
            <View style={styles.stayEventList}>
              {day.items.slice(0, 2).map((item, itemIndex) => (
                <TouchableOpacity key={`${item.time}-${item.title}`} activeOpacity={0.76} onPress={() => onSelect(item)} style={styles.stayEventCard}>
                  <View style={styles.stayEventCopy}>
                    <Text style={styles.stayEventTitle}>{itemIndex === 0 && index === 0 ? 'Arrivée à Marrakech' : item.title}</Text>
                    <Text style={styles.stayEventPlace}>{item.place}</Text>
                    {itemIndex === 0 && index === 0 ? (
                      <>
                        <Text style={styles.stayEventDetail}>Vol AT1196</Text>
                        <Text style={styles.stayEventAccent}>CHAUFFEUR · YOUSSEF</Text>
                        <Text style={styles.stayEventAccent}>MATRICULE · 184 - A - 32</Text>
                      </>
                    ) : (
                      <Text style={styles.stayEventDetail}>{item.provider}</Text>
                    )}
                  </View>
                  <Text style={styles.stayEventTime}>{itemIndex === 0 ? '06:00 – 07:00' : '07:30 – 08:30'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function StayRoutePreview() {
  const scene = scenes.immersive;

  return (
    <View style={styles.stayRouteWrap}>
      <StaticRouteMap />
      <Text style={[styles.stayRouteMeta, { color: scene.textSecondary }]}>
        Youssef · <Text style={{ color: scene.accentPrimary }}>Mercedes Classe V</Text> · 184-A-32
      </Text>
    </View>
  );
}

function StaticRouteMap() {
  const tiles = [
    'https://tile.openstreetmap.org/14/7828/6673.png',
    'https://tile.openstreetmap.org/14/7829/6673.png',
    'https://tile.openstreetmap.org/14/7828/6674.png',
    'https://tile.openstreetmap.org/14/7829/6674.png',
  ];

  return (
    <View style={styles.staticRouteMap}>
      <View style={styles.staticRouteTileGrid}>
        {tiles.map((tile) => (
          <Image key={tile} source={{ uri: tile }} resizeMode="cover" style={styles.staticRouteTile} />
        ))}
      </View>
      <View style={styles.staticRouteScrim} />
      <View style={[styles.staticRoutePin, styles.staticRoutePinYou]}>
        <Text style={styles.staticRoutePinText}>VO</Text>
      </View>
      <View style={[styles.staticRoutePin, styles.staticRoutePinDriver]}>
        <Text style={styles.staticRoutePinText}>Y</Text>
      </View>
      <View style={styles.staticRoutePath} />
      <Text style={[styles.stayRouteLabel, styles.stayRouteUserLabel]}>Vous</Text>
      <Text style={[styles.stayRouteLabel, styles.stayRouteDriverLabel]}>Youssef · 184-A-32</Text>
    </View>
  );
}

function DriverContactModal({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'driver-1',
      from: 'them',
      text: 'Bonjour Thibaut, je suis votre chauffeur SOLÝ. Je vous attends à la sortie des arrivées.',
      time: 'Aujourd’hui · 19h42',
    },
    {
      id: 'driver-2',
      from: 'me',
      text: 'D’accord',
      time: 'Aujourd’hui · 19h42',
    },
  ]);

  const sendDriverMessage = (text = draft.trim()) => {
    const clean = text.trim();
    if (!clean) return;

    setMessages((current) => [
      ...current,
      { id: `driver-${Date.now()}`, from: 'me', text: clean, time: 'maintenant' },
    ]);
    setDraft('');
    Vibration.vibrate(8);
  };

  return (
    <View style={styles.contactChatRoot}>
      <View style={styles.contactChatPanel}>
        <View style={styles.contactChatHandle} />
        <View style={styles.contactChatTitleRow}>
          <Text style={styles.contactChatTitle}>Chat</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.contactChatClose}>
            <MaterialIcons name="close" size={23} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.contactChatRule} />

        <View style={styles.contactChatProfile}>
          <View style={styles.contactChatAvatar}>
            <Text style={styles.contactChatAvatarText}>Y</Text>
            <View style={styles.contactChatOnlineDot} />
          </View>
          <View>
            <Text style={styles.contactChatName}>Youssef B.</Text>
            <Text style={styles.contactChatConnected}>Connecté</Text>
          </View>
        </View>

        <View style={styles.contactChatCarBar}>
          <Text style={styles.contactChatCar}>MERCEDES CLASSE V · 12345 - A</Text>
          <Text style={styles.contactChatEta}>ARRIVÉE DANS 8 MIN</Text>
        </View>

        <Text style={styles.contactChatNotice}>
          Position de Youssef partagée en direct — arrivée estimée dans 8 min.
        </Text>

        <ScrollView contentContainerStyle={styles.contactChatMessages} showsVerticalScrollIndicator={false}>
          {messages.map((message) => {
            const mine = message.from === 'me';
            return (
              <View key={message.id} style={[styles.contactChatMessageRow, mine ? styles.contactChatMessageRowMine : styles.contactChatMessageRowDriver]}>
                <View style={[styles.contactChatBubble, mine ? styles.contactChatBubbleMine : styles.contactChatBubbleDriver]}>
                  <Text style={styles.contactChatMessageText}>{message.text}</Text>
                  <Text style={styles.contactChatMessageTime}>{message.time}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.contactChatQuickReplies}>
          {['Je suis en retard', 'Changer le lieu', "J’arrive"].map((reply) => (
            <TouchableOpacity key={reply} activeOpacity={0.78} onPress={() => sendDriverMessage(reply)} style={styles.contactChatQuickReply}>
              <Text style={styles.contactChatQuickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contactChatComposer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => sendDriverMessage()}
            placeholder="Écrire un message..."
            placeholderTextColor="#879A8D"
            style={styles.contactChatInput}
          />
          <TouchableOpacity activeOpacity={0.78} onPress={() => sendDriverMessage()} style={styles.contactChatSend}>
            <MaterialIcons name="chevron-right" size={23} color="#092416" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function MessageCenterOverlay({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (message: string, pattern?: number | number[]) => void;
}) {
  const scene = scenes.immersive;
  const [activeChat, setActiveChat] = useState('Chauffeur');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', chat: 'Chauffeur', from: 'them', text: 'Bonjour Slim, je suis devant la sortie principale dans huit minutes.', time: '14:08' },
    { id: '2', chat: 'Chauffeur', from: 'me', text: 'Parfait, nous descendons.', time: '14:09' },
    { id: '3', chat: 'Groupe', from: 'them', text: 'Je suis au patio, on se retrouve après le check-in ?', time: '14:03' },
    { id: '4', chat: 'Groupe', from: 'me', text: 'Oui, je vous partage la position.', time: '14:04' },
    { id: '5', chat: 'SOLÝ', from: 'soly', text: 'Votre chauffeur a été notifié. ETA confirmée.', time: '14:10' },
  ]);
  const inbox = ['Chauffeur', 'Groupe', 'SOLÝ'];
  const activeMessages = messages.filter((message) => message.chat === activeChat);

  const sendMessage = (text = draft.trim()) => {
    if (!text) return;
    setMessages((current) => [...current, { id: `${Date.now()}`, chat: activeChat, from: 'me', text, time: 'maintenant' }]);
    setDraft('');
    notify('Message envoyé');
  };

  return (
    <View style={styles.messageOverlayRoot}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.messageOverlayBackdrop} />
      <View style={[styles.messageOverlayPanel, { backgroundColor: scene.bg, borderColor: scene.border }]}>
        <View style={styles.messageOverlayHeader}>
          <View>
            <Text style={[styles.messageOverlayTitle, { color: scene.accentPrimary }]}>Messages</Text>
            <Text style={[styles.messageOverlaySubtitle, { color: scene.textSecondary }]}>CHAUFFEUR · GROUPE · SOLÝ</Text>
          </View>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.messageOverlayClose}>
            <MaterialIcons name="close" size={19} color="#0D2F21" />
          </TouchableOpacity>
        </View>

        <View style={styles.messageOverlayTabs}>
          {inbox.map((chat) => {
            const unread = chat === 'Chauffeur' ? '2' : chat === 'Groupe' ? '1' : '';
            const active = activeChat === chat;

            return (
              <TouchableOpacity
                key={chat}
                activeOpacity={0.78}
                onPress={() => setActiveChat(chat)}
                style={[styles.messageOverlayTab, { borderColor: active ? scene.accentPrimary : scene.border, backgroundColor: active ? 'rgba(207,160,85,0.10)' : 'transparent' }]}
              >
                <Text style={[styles.messageOverlayTabText, { color: active ? scene.accentPrimary : scene.textSecondary }]}>{chat}</Text>
                {unread ? (
                  <View style={styles.messageOverlayBadge}>
                    <Text style={styles.messageOverlayBadgeText}>{unread}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.messageOverlayScroll} contentContainerStyle={styles.messageOverlayList} showsVerticalScrollIndicator={false}>
          {activeMessages.map((message) => {
            const mine = message.from === 'me';
            const soly = message.from === 'soly';

            return (
              <View
                key={message.id}
                style={[
                  styles.messageBubble,
                  mine && styles.messageBubbleMine,
                  soly && styles.messageBubbleSoly,
                  {
                    borderColor: mine ? scene.accentPrimary : scene.borderSoft,
                    backgroundColor: mine ? 'rgba(207,160,85,0.12)' : scene.surfaceRaised,
                  },
                ]}
              >
                <Text style={[styles.messageBubbleText, { color: scene.textPrimary }]}>{message.text}</Text>
                <Text style={[styles.messageBubbleTime, { color: scene.textMuted }]}>{message.time}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.messageOverlayReplies}>
          {['+5 min', 'Changer le lieu', "J'arrive"].map((reply) => (
            <TouchableOpacity key={reply} activeOpacity={0.78} onPress={() => sendMessage(reply)} style={[styles.intentChip, { borderColor: scene.border }]}>
              <Text style={[styles.intentText, { color: scene.textPrimary }]}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.messageInputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire un message..."
            placeholderTextColor={scene.textMuted}
            style={[styles.messageInput, { borderColor: scene.border, color: scene.textPrimary }]}
          />
          <TouchableOpacity activeOpacity={0.78} onPress={() => sendMessage()} style={[styles.messageSendButton, { backgroundColor: scene.accentPrimary }]}>
            <MaterialIcons name="send" size={18} color={scene.bgDeep} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ButlerScreen({ notify }: { notify: (message: string, pattern?: number | number[]) => void }) {
  const scene = scenes.immersive;
  const [request, setRequest] = useState('Restaurant ce soir');
  const [searching, setSearching] = useState(false);
  const pulse = usePulse(searching);
  const intentions = ['Restaurant', 'Hammam', 'Excursion', 'Chauffeur'];

  const submit = () => {
    setSearching(true);
    Vibration.vibrate(8);
    setTimeout(() => {
      setSearching(false);
      notify('Demande confirmée · +120 points', [12, 30, 12]);
    }, 1200);
  };

  return (
    <View style={[styles.screen, styles.messagesScreen]}>
      <SectionTitle title="Demander à SOLÝ" subtitle="Une interface conversationnelle pour réserver, ajuster ou déléguer." scene={scene} />
      <View style={styles.bellWrap}>
        <Animated.View style={[styles.bell, { borderColor: scene.accentPrimary, transform: [{ scale: pulse }] }]}>
          <Text style={[styles.bellText, { color: scene.accentPrimary }]}>SOLÝ</Text>
        </Animated.View>
      </View>
      <ChatBubble variant="soly" scene={scene}>Dites-moi ce que vous souhaitez. Je vous propose un créneau adapté au rythme du séjour.</ChatBubble>
      <View style={styles.chips}>
        {intentions.map((intent) => (
          <TouchableOpacity
            key={intent}
            activeOpacity={0.76}
            onPress={() => setRequest(intent)}
            style={[styles.intentChip, { borderColor: scene.border, backgroundColor: request.includes(intent) ? 'rgba(207,160,85,0.14)' : 'transparent' }]}
          >
            <Text style={[styles.intentText, { color: scene.textPrimary }]}>{intent}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ChatBubble variant="me" scene={scene}>{request}</ChatBubble>
      <SurfaceCard scene={scene}>
        <TextInput
          value={request}
          onChangeText={setRequest}
          placeholder="Votre demande"
          placeholderTextColor={scene.textMuted}
          style={[styles.input, { color: scene.textPrimary, borderColor: scene.border }]}
        />
        <View style={styles.twoColumns}>
          <SolyDetailCard label="Date" value="22 mai" scene={scene} />
          <SolyDetailCard label="Créneau" value="Soir" scene={scene} />
        </View>
        <SolyDetailCard label="Chauffeur" value="Inclus" scene={scene} />
        <SolyReceiptTotal label="Fidélité" value="+120 pts" scene={scene} />
        {searching ? <Text style={[styles.searching, { color: scene.accentPrimary }]}>SOLÝ cherche...</Text> : null}
        <SolyBtnPrimary label="Confirmer la demande" scene={scene} onPress={submit} />
      </SurfaceCard>
    </View>
  );
}

function WeatherScreen({ weather, onClose }: { weather: LiveWeatherState; onClose: () => void }) {
  const days = weather.days.length ? weather.days : weatherDays;
  const day = days[0];
  const dayIcon = weatherIconForDay(day);
  const [minTemp = '—', maxTemp = '—'] = day.range.split('/').map((value) => value.trim());

  return (
    <View style={styles.atmosphereScreen}>
      <View style={styles.atmosphereTop}>
        <View style={styles.atmosphereAccountRow}>
          <View style={[styles.homeAccountPill, { backgroundColor: 'rgba(26,50,19,0.72)', borderColor: 'rgba(177,148,48,0.35)' }]}>
            <View style={[styles.homeAccountInitial, { backgroundColor: '#6A5C20' }]}>
              <Text style={[styles.homeAccountInitialText, { color: '#CFA055' }]}>T</Text>
            </View>
            <Text style={[styles.homeAccountName, { color: '#CFA055' }]}>Thibaut</Text>
            <Text style={[styles.homeAccountCaret, { color: '#CFA055' }]}>⌄</Text>
          </View>
        </View>
        <Text style={styles.atmosphereGreeting}>Bonjour, Thibaut</Text>
        <Text style={styles.atmosphereMeta}>Aujourd’hui  ·  {weather.city}  ·  {days[0]?.temp ?? '—'}</Text>
        <Image source={solyResting} resizeMode="contain" style={styles.atmosphereMascotPeek} />
      </View>

      <View style={styles.atmosphereSheet}>
        <View style={styles.atmosphereHandle} />
        <View style={styles.atmosphereTitleRow}>
          <Text style={styles.atmosphereTitle}>Atmosphère</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.atmosphereClose}>
            <MaterialIcons name="close" size={23} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.atmosphereRule} />
        <Text style={styles.atmosphereIntro}>
          {currentWeatherSummary(day, weather.city)}
        </Text>

        <View style={styles.atmosphereHero}>
          <View style={styles.atmosphereDateRow}>
            <Text style={styles.atmosphereDate}>{day.label}</Text>
            <Text style={styles.atmosphereToday}>AUJOURD’HUI</Text>
          </View>
          <View style={styles.atmosphereTempRow}>
            <Text style={styles.atmosphereWeatherIcon}>{dayIcon}</Text>
            <Text style={styles.atmosphereTemp}>{day.temp}</Text>
          </View>
          <Text style={styles.atmosphereCondition}>{day.condition}</Text>
          <View style={styles.atmosphereStats}>
            <WeatherStat label="Max" value={maxTemp} />
            <WeatherStat label="Min" value={minTemp} />
            <WeatherStat label="Vent" value={day.wind} />
            <WeatherStat label="Coucher" value={day.sunset} />
          </View>
          <View style={styles.atmosphereNote}>
            <Text style={styles.atmosphereNoteText}>{day.note}</Text>
          </View>
        </View>

        <Text style={styles.atmosphereOtherLabel}>LES AUTRES JOURS DU SÉJOUR</Text>
        <View style={styles.atmosphereRule} />
        <View style={styles.atmosphereForecastRow}>
          {days.slice(1, 4).map((item) => (
            <View key={item.label} style={styles.atmosphereMini}>
              <Text numberOfLines={1} style={styles.atmosphereMiniLabel}>{item.label}</Text>
              <Text style={styles.atmosphereMiniIcon}>{weatherIconForDay(item)}</Text>
              <Text style={styles.atmosphereMiniTemp}>{item.temp}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.atmosphereStat}>
      <Text style={styles.atmosphereStatLabel}>{label}</Text>
      <Text style={styles.atmosphereStatValue}>{value}</Text>
    </View>
  );
}

function currentWeatherSummary(day: LiveWeatherDay, city: string) {
  const condition = day.condition.toLowerCase();

  if (condition.includes('clair')) {
    return `À ${city}, le ciel est dégagé avec ${day.temp}. Vent léger à ${day.wind} : une belle journée pour profiter de l’extérieur.`;
  }
  if (condition.includes('nuage')) {
    return `À ${city}, le ciel est nuageux avec ${day.temp}. Le vent souffle à ${day.wind} : une lumière douce accompagne votre journée.`;
  }
  if (condition.includes('pluie') || condition.includes('bruine')) {
    return `Quelques précipitations sont prévues à ${city}, avec ${day.temp} et un vent à ${day.wind}. Privilégiez les déplacements couverts.`;
  }
  if (condition.includes('orage')) {
    return `Risque d’orage à ${city}, avec ${day.temp} et un vent à ${day.wind}. SOLÝ recommande d’adapter les sorties.`;
  }
  if (condition.includes('brume')) {
    return `Une légère brume couvre ${city}, avec ${day.temp} et un vent à ${day.wind}. La visibilité peut être réduite par moments.`;
  }

  return `À ${city}, il fait actuellement ${day.temp}. ${day.condition}, avec un vent à ${day.wind}.`;
}

function CompanionsScreen({
  navigate,
  shareLocation,
}: {
  navigate: (screen: ModuleKey, vibration?: number) => void;
  shareLocation: (recipient: 'chauffeur' | 'groupe') => void;
}) {
  const scene = scenes.immersive;

  return (
    <View style={styles.screen}>
      <SectionTitle title="Vos Proches" subtitle="Présence, permissions et documents du groupe." scene={scene} />
      <MiniMap withCompanions />
      {companions.map((person) => (
        <TouchableOpacity key={person.name} activeOpacity={0.76} onPress={() => navigate('chat')} style={[styles.personCard, { borderColor: scene.border, backgroundColor: scene.surface }]}>
          <View style={[styles.initials, { borderColor: scene.border }]}>
            <Text style={[styles.initialsText, { color: scene.accentPrimary }]}>{person.initials}</Text>
          </View>
          <View style={styles.personCopy}>
            <Text style={[styles.itemTitle, { color: scene.textPrimary }]}>{person.name}</Text>
            <Text style={[styles.cardText, { color: scene.textMuted }]}>{person.permissions}</Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: person.status === 'en ligne' ? '#79C58A' : '#CFA055' }]} />
        </TouchableOpacity>
      ))}
      <SurfaceCard scene={scene} style={styles.shareCard}>
        <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>Partager ma localisation</Text>
        <Text style={[styles.cardText, { color: scene.textMuted }]}>Envoyez votre position live au groupe ou au chauffeur.</Text>
        <View style={styles.shareActions}>
          <TouchableOpacity activeOpacity={0.78} onPress={() => shareLocation('groupe')} style={[styles.shareButton, { borderColor: scene.border }]}>
            <Text style={[styles.shareButtonText, { color: scene.textPrimary }]}>Accompagnants</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.78} onPress={() => shareLocation('chauffeur')} style={[styles.shareButtonPrimary, { backgroundColor: scene.accentPrimary }]}>
            <Text style={[styles.shareButtonPrimaryText, { color: scene.bgDeep }]}>Chauffeur</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>
      <SolyBtnPrimary label="Inviter un proche" scene={scene} onPress={() => Vibration.vibrate(8)} />
      <SurfaceCard scene={scene}>
        <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>Documents d'entrée</Text>
        <SolyDetailCard label="Complet" value="1 dossier" scene={scene} />
        <SolyDetailCard label="Incomplet" value="2 dossiers" scene={scene} />
      </SurfaceCard>
    </View>
  );
}

function ExploreScreen({
  city,
  onSelect,
  notify,
  shareLocation,
}: {
  city: string;
  onSelect: (spot: ExplorerActivity) => void;
  notify: (message: string, pattern?: number | number[]) => void;
  shareLocation: (recipient: 'chauffeur' | 'groupe') => void;
}) {
  const scene = scenes.editorial;
  const guide = explorerGuideForCity(city);
  const [openSection, setOpenSection] = useState(guide.sections[0]?.title ?? '');
  const activityMarkers = guide.sections.flatMap((section) => section.activities);

  return (
    <View style={[styles.screen, styles.explorerScreen]}>
      <View style={styles.explorerHeader}>
        <View style={[styles.explorerHeaderIcon, { borderColor: scene.border }]}>
          <Text style={[styles.explorerHeaderIconText, { color: scene.accentPrimary }]}>◇</Text>
        </View>
        <View style={styles.explorerHeaderCopy}>
          <Text style={[styles.explorerTitle, { color: scene.accentPrimary }]}>Explorer</Text>
          <Text style={[styles.explorerSubtitle, { color: scene.textSecondary }]}>LA VILLE À VOTRE MAIN · {guide.city.toUpperCase()}</Text>
        </View>
      </View>

      <MiniMap dark withCompanions city={guide.city} markers={activityMarkers} />

      <Text style={[styles.explorerIntro, { color: scene.textSecondary }]}>
        Vous êtes dans la <Text style={{ color: scene.accentPrimary }}>{guide.district}</Text>. {guide.note}
      </Text>

      <View style={styles.explorerBlock}>
        <Text style={[styles.explorerBlockLabel, { color: scene.accentPrimary }]}>VOS PROCHES DISPONIBLES · EN DIRECT</Text>
        <View style={styles.explorerCompanionGrid}>
          {explorerCompanions.map((person) => (
            <TouchableOpacity
              key={person.name}
              activeOpacity={0.78}
              onPress={() => notify(`${person.name} est ${person.distance}`)}
              style={[styles.explorerCompanionCard, { borderColor: scene.border, backgroundColor: scene.surface }]}
            >
              <View style={[styles.explorerLiveDot, { backgroundColor: person.status === 'online' ? '#D9E5B7' : '#9AC2C8' }]} />
              <View style={styles.explorerCompanionCopy}>
                <Text style={[styles.explorerCompanionName, { color: scene.textPrimary }]}>{person.name}</Text>
                <Text style={[styles.explorerCompanionDistance, { color: scene.accentPrimary }]}>{person.distance}</Text>
                <Text style={[styles.explorerCompanionPlace, { color: scene.textSecondary }]}>{person.place}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {guide.sections.map((section) => {
        const isOpen = openSection === section.title;

        return (
          <View key={section.title} style={[styles.explorerSection, { borderColor: scene.border, backgroundColor: scene.surface }]}>
            <TouchableOpacity activeOpacity={0.78} onPress={() => setOpenSection(isOpen ? '' : section.title)} style={styles.explorerSectionHeader}>
              <View style={[styles.explorerSectionBullet, { backgroundColor: scene.accentPrimary }]} />
              <View style={styles.explorerSectionCopy}>
                <Text style={[styles.explorerSectionTitle, { color: scene.textPrimary }]}>{section.title}</Text>
                <Text style={[styles.explorerSectionSubtitle, { color: scene.accentPrimary }]}>{section.subtitle}</Text>
              </View>
              <View style={styles.explorerCountPill}>
                <Text style={[styles.explorerCountText, { color: scene.textSecondary }]}>{section.activities.length}</Text>
              </View>
              <Text style={[styles.explorerChevron, { color: scene.accentPrimary }]}>{isOpen ? '⌃' : '⌄'}</Text>
            </TouchableOpacity>

            {isOpen ? (
              <View style={styles.explorerActivityList}>
                {section.activities.map((activity) => (
                  <TouchableOpacity
                    key={activity.title}
                    activeOpacity={0.78}
                    onPress={() => onSelect(activity)}
                    style={[styles.explorerActivityCard, { borderColor: scene.borderSoft, backgroundColor: scene.surfaceRaised }]}
                  >
                    <View style={[styles.explorerActivityDot, { backgroundColor: scene.accentPrimary }]} />
                    <View style={styles.explorerActivityCopy}>
                      <Text style={[styles.explorerActivityTitle, { color: scene.textPrimary }]}>{activity.title}</Text>
                      <Text style={[styles.explorerActivityDescription, { color: scene.textSecondary }]}>{activity.description}</Text>
                    </View>
                    <Text style={[styles.explorerActivityDistance, { color: scene.accentPrimary }]}>{activity.distance}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
      <View style={styles.shareActions}>
        <TouchableOpacity activeOpacity={0.78} onPress={() => shareLocation('groupe')} style={[styles.shareButton, { borderColor: scene.border }]}>
          <Text style={[styles.shareButtonText, { color: scene.textPrimary }]}>Partager au groupe</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.78} onPress={() => shareLocation('chauffeur')} style={[styles.shareButtonPrimary, { backgroundColor: scene.accentPrimary }]}>
          <Text style={[styles.shareButtonPrimaryText, { color: scene.bgDeep }]}>Au chauffeur</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CurrencyScreen({
  exchangeRate,
  weather,
  onClose,
}: {
  exchangeRate: ExchangeRateState;
  weather: LiveWeatherState;
  onClose: () => void;
}) {
  const currencies = [
    { code: 'EUR', name: 'EURO' },
    { code: 'USD', name: 'DOLLAR AMÉRICAIN' },
    { code: 'JPY', name: 'YEN JAPONAIS' },
    { code: 'GBP', name: 'LIVRE STERLING' },
    { code: 'CAD', name: 'DOLLAR CANADIEN' },
    { code: 'CNY', name: 'YUAN CHINOIS' },
  ];
  const [selectedCode, setSelectedCode] = useState('EUR');
  const [amount, setAmount] = useState('100');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selected = currencies.find((item) => item.code === selectedCode) ?? currencies[0];
  const selectedBaseRate = exchangeRate.rates[selectedCode] || 1;
  const madPerUnit = exchangeRate.rate / selectedBaseRate;
  const numericAmount = Number(amount.replace(',', '.')) || 0;
  const madValue = numericAmount * madPerUnit;
  const quickConversions = [
    { label: 'Pause café en terrasse', mad: 25 },
    { label: 'Trajet en médina', mad: 60 },
    { label: 'Dîner signature', mad: 650 },
  ];

  return (
    <View style={styles.currencyLayerScreen}>
      <View style={styles.currencyLayerTop}>
        <View style={styles.atmosphereAccountRow}>
          <View style={[styles.homeAccountPill, { backgroundColor: 'rgba(26,50,19,0.72)', borderColor: 'rgba(207,160,85,0.35)' }]}>
            <View style={[styles.homeAccountInitial, { backgroundColor: '#6A5C20' }]}>
              <Text style={[styles.homeAccountInitialText, { color: '#CFA055' }]}>T</Text>
            </View>
            <Text style={[styles.homeAccountName, { color: '#CFA055' }]}>Thibaut</Text>
            <Text style={[styles.homeAccountCaret, { color: '#CFA055' }]}>⌄</Text>
          </View>
        </View>
        <Text style={styles.atmosphereGreeting}>Bonjour, Thibaut</Text>
        <Text style={styles.atmosphereMeta}>Aujourd’hui  ·  {weather.city}  ·  {weather.days[0]?.temp ?? '—'}</Text>
        <Image source={solyResting} resizeMode="contain" style={styles.currencyMascotPeek} />
      </View>

      <View style={styles.currencyLayerSheet}>
        <View style={styles.atmosphereHandle} />
        <View style={styles.atmosphereTitleRow}>
          <Text style={styles.atmosphereTitle}>Devises</Text>
          <TouchableOpacity activeOpacity={0.72} onPress={onClose} style={styles.atmosphereClose}>
            <MaterialIcons name="close" size={23} color="#A6B0A5" />
          </TouchableOpacity>
        </View>
        <View style={styles.atmosphereRule} />

        <View style={styles.currencyConverterCard}>
          <View style={styles.currencyRow}>
            <Text style={styles.currencyRowLabel}>MAD  ·  Dirham</Text>
            <Text style={styles.currencyRowValue}>{formatCurrencyNumber(madValue, 'MAD')}</Text>
          </View>
          <View style={styles.currencySwap}>
            <MaterialIcons name="swap-vert" size={27} color="#CFA055" />
          </View>
          <TouchableOpacity activeOpacity={0.78} onPress={() => setDropdownOpen((current) => !current)} style={styles.currencyRow}>
            <View style={styles.currencyCodeWrap}>
              <Text style={styles.currencyRowLabel}>{selected.code}  ·  {currencyDisplayName(selected.name)}</Text>
              <MaterialIcons name={dropdownOpen ? 'arrow-drop-up' : 'arrow-drop-down'} size={19} color="#CFA055" />
            </View>
            <TextInput
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              onFocus={() => setDropdownOpen(false)}
              style={styles.currencyAmountInput}
            />
          </TouchableOpacity>
          <Text style={styles.currencyRateText}>
            1 {selected.code} = {madPerUnit.toFixed(2).replace('.', ',')} MAD · mis à jour {exchangeRate.updatedAt}
          </Text>

          {dropdownOpen ? (
            <View style={styles.currencyDropdown}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  activeOpacity={0.76}
                  onPress={() => {
                    setSelectedCode(currency.code);
                    setDropdownOpen(false);
                  }}
                  style={[styles.currencyDropdownItem, currency.code === selectedCode && styles.currencyDropdownItemActive]}
                >
                  <Text style={styles.currencyDropdownText}>{currency.code} · {currency.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.currencyQuickCard}>
          <Text style={styles.currencyQuickTitle}>CONVERSIONS RAPIDES</Text>
          {quickConversions.map((item) => (
            <View key={item.label} style={styles.currencyQuickRow}>
              <View style={styles.currencyQuickDot} />
              <View style={styles.currencyQuickCopy}>
                <Text style={styles.currencyQuickLabel}>{item.label}</Text>
                <Text style={styles.currencyQuickMad}>≈ {item.mad} MAD</Text>
              </View>
              <Text style={styles.currencyQuickValue}>
                {(item.mad / madPerUnit).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} {selected.code}
              </Text>
            </View>
          ))}
          <Text style={styles.currencyAttribution}>Rates by ExchangeRate-API</Text>
        </View>
      </View>
    </View>
  );
}

function currencyDisplayName(name: string) {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

function formatCurrencyNumber(value: number, currency: string) {
  return value.toLocaleString('fr-FR', {
    maximumFractionDigits: currency === 'MAD' ? 0 : 2,
  });
}

function SosScreen({
  onSelect,
  notify,
}: {
  onSelect: (label: string) => void;
  notify: (message: string, pattern?: number | number[]) => void;
}) {
  const scene = scenes.emergency;
  const direct = ['SOLÝ Urgences 24/7', 'SAMU Marrakech · 15', 'Police Tourisme · 19', 'SOS Médecins Marrakech'];
  const discreet = [
    'Je ne trouve pas mon chauffeur',
    'Je souhaite rentrer maintenant',
    'Je me sens fatigué·e',
    'Je suis perdu·e',
    "Besoin d'aide discrète",
  ];

  return (
    <View style={styles.screen}>
      <SectionTitle title="SOS" subtitle="Aide prioritaire avec confirmation anti-erreur." scene={scene} />
      <SurfaceCard scene={scene} style={styles.emergencyCard}>
        <SolyEyebrow scene={scene}>Urgences directes</SolyEyebrow>
        {direct.map((item) => (
          <TouchableOpacity key={item} activeOpacity={0.76} onPress={() => onSelect(item)} style={[styles.emergencyRow, { borderColor: scene.border }]}>
            <Text style={[styles.quickLabel, { color: scene.textPrimary }]}>{item}</Text>
            <Text style={[styles.chevron, { color: scene.accentPrimary }]}>Appeler</Text>
          </TouchableOpacity>
        ))}
      </SurfaceCard>
      <SurfaceCard scene={scene}>
        <SolyEyebrow scene={scene}>Aide discrète</SolyEyebrow>
        {discreet.map((item) => (
          <TouchableOpacity key={item} activeOpacity={0.76} onPress={() => notify(`${item} · transmis à SOLÝ`, 8)} style={[styles.emergencyRow, { borderColor: scene.border }]}>
            <Text style={[styles.quickLabel, { color: scene.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </SurfaceCard>
      <SurfaceCard scene={scene}>
        <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>Protocole SOLÝ</Text>
        <Text style={[styles.cardText, { color: scene.textMuted }]}>Géolocalisation, identité et contexte du séjour sont transmis automatiquement à la cellule urgence 24/7, priorité MAX.</Text>
      </SurfaceCard>
    </View>
  );
}

function ArrivalScreen({ notify }: { notify: (message: string, pattern?: number | number[]) => void }) {
  const scene = scenes.transactional;
  const [mode, setMode] = useState('Avion');

  return (
    <View style={styles.screen}>
      <SectionTitle title="Mode d'arrivée" subtitle="SOLÝ planifie l'accueil chauffeur automatiquement." scene={scene} />
      <View style={styles.chips}>
        {['Avion', 'Train', 'Voiture'].map((item) => (
          <TouchableOpacity key={item} activeOpacity={0.76} onPress={() => setMode(item)} style={[styles.intentChip, { borderColor: mode === item ? scene.accentPrimary : scene.border }]}>
            <Text style={[styles.intentText, { color: scene.textPrimary }]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SurfaceCard scene={scene}>
        <SolyDetailCard label="Mode" value={mode} scene={scene} />
        <SolyDetailCard label="Référence" value={mode === 'Avion' ? 'AT740' : mode === 'Train' ? 'ONCF 112' : 'Arrivée privée'} scene={scene} />
        <SolyDetailCard label="Heure" value="14:20" scene={scene} />
        <SolyDetailCard label="Terminal" value="RAK T1" scene={scene} />
        <SolyBtnPrimary label="Valider l'arrivée" scene={scene} onPress={() => notify('Accueil chauffeur planifié', [12, 30, 12])} />
      </SurfaceCard>
    </View>
  );
}

function FormalitiesScreen({ notify }: { notify: (message: string, pattern?: number | number[]) => void }) {
  const scene = scenes.transactional;

  return (
    <View style={styles.screen}>
      <SectionTitle title="Formalités" subtitle="Documents d'entrée par voyageur." scene={scene} />
      <SurfaceCard scene={scene} style={styles.alertCard}>
        <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>2 dossiers sur 3 incomplets</Text>
        <Text style={[styles.cardText, { color: scene.textMuted }]}>Échéance dans 4 jours pour garantir l'arrivée sans friction.</Text>
      </SurfaceCard>
      {companions.map((person, index) => (
        <SurfaceCard key={person.name} scene={scene}>
          <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>{person.name}</Text>
          <SolyDetailCard label="Passeport" value={index === 0 ? 'Complet' : 'Incomplet'} scene={scene} />
          <SolyDetailCard label="Visa" value={index === 2 ? 'À vérifier' : 'Non requis'} scene={scene} />
          <SolyBtnDecline label="Mettre à jour" scene={scene} onPress={() => notify(`Dossier ${person.name} ouvert`)} />
        </SurfaceCard>
      ))}
    </View>
  );
}

function DriverScreen({
  navigate,
  notify,
  shareLocation,
}: {
  navigate: (screen: ModuleKey, vibration?: number) => void;
  notify: (message: string, pattern?: number | number[]) => void;
  shareLocation: (recipient: 'chauffeur' | 'groupe') => void;
}) {
  const scene = scenes.immersive;

  return (
    <View style={styles.screen}>
      <SectionTitle title="Chauffeur" subtitle="Arrivée, suivi et coordination en temps réel." scene={scene} />
      <SurfaceCard scene={scene} style={styles.driverCard}>
        <View style={styles.driverHead}>
          <View style={[styles.driverAvatar, { borderColor: scene.border }]}>
            <Text style={[styles.driverInitial, { color: scene.accentPrimary }]}>YO</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>Youssef</Text>
            <Text style={[styles.cardText, { color: scene.textMuted }]}>Mercedes Classe V · 3421-M-6</Text>
          </View>
        </View>
        <MiniMap />
        <SolyDetailCard label="Attente estimée" value="8 min" scene={scene} />
        <SolyDetailCard label="Point de rencontre" value="RAK T1" scene={scene} />
        <SolyBtnPrimary label="Géolocaliser Youssef" scene={scene} onPress={() => notify('Position chauffeur actualisée')} />
        <SolyBtnPrimary label="Partager ma position avec Youssef" scene={scene} onPress={() => shareLocation('chauffeur')} />
        <SolyBtnDecline label="Ouvrir le chat chauffeur" scene={scene} onPress={() => navigate('chat')} />
      </SurfaceCard>
    </View>
  );
}

function ChatScreen({ notify }: { notify: (message: string, pattern?: number | number[]) => void }) {
  const scene = scenes.immersive;
  const [activeChat, setActiveChat] = useState('Chauffeur');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', chat: 'Chauffeur', from: 'them', text: 'Bonjour Slim, je suis devant la sortie principale dans huit minutes.', time: '14:08' },
    { id: '2', chat: 'Chauffeur', from: 'me', text: 'Parfait, nous descendons.', time: '14:09' },
    { id: '3', chat: 'Groupe', from: 'them', text: 'Je suis au patio, on se retrouve après le check-in ?', time: '14:03' },
    { id: '4', chat: 'Groupe', from: 'me', text: 'Oui, je vous partage la position.', time: '14:04' },
    { id: '5', chat: 'SOLÝ', from: 'soly', text: 'Votre chauffeur a été notifié. ETA confirmée.', time: '14:10' },
  ]);
  const activeMessages = messages.filter((message) => message.chat === activeChat);

  const sendMessage = (text = draft.trim()) => {
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}`, chat: activeChat, from: 'me', text, time: 'maintenant' },
    ]);
    setDraft('');
    notify('Message envoyé');
  };

  return (
    <View style={styles.screen}>
      <SectionTitle title="Chat" subtitle="Chauffeur, groupe et conversations privées." scene={scene} />
      {conversations.map((conversation) => (
        <TouchableOpacity
          key={conversation.title}
          activeOpacity={0.78}
          onPress={() => setActiveChat(conversation.title === 'Camille' ? 'Groupe' : conversation.title)}
          style={[
            styles.messageThreadCard,
            {
              borderColor: activeChat === conversation.title ? scene.accentPrimary : scene.border,
              backgroundColor: scene.surface,
            },
          ]}
        >
          <View style={styles.chatHead}>
            <View>
              <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>{conversation.title}</Text>
              <Text style={[styles.cardText, { color: scene.textMuted }]}>{conversation.subtitle}</Text>
            </View>
            {conversation.unread ? (
              <View style={[styles.unread, { backgroundColor: scene.accentPrimary }]}>
                <Text style={[styles.unreadText, { color: scene.bgDeep }]}>{conversation.unread}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      ))}
      <SurfaceCard scene={scene} style={styles.messageConversationCard}>
        <View style={styles.messageConversationHead}>
          <View>
            <Text style={[styles.messageConversationTitle, { color: scene.textPrimary }]}>{activeChat}</Text>
            <Text style={[styles.cardText, { color: scene.textMuted }]}>conversation active</Text>
          </View>
          <View style={[styles.messageLivePill, { borderColor: scene.border }]}>
            <Text style={[styles.messageLiveText, { color: scene.accentPrimary }]}>live</Text>
          </View>
        </View>
        <View style={styles.messageList}>
          {activeMessages.map((message) => {
            const mine = message.from === 'me';
            const soly = message.from === 'soly';
            const senderLabel = mine ? 'Vous' : soly ? 'SOLY' : activeChat;
            const senderInitial = mine ? 'VO' : soly ? 'S' : activeChat.slice(0, 2).toUpperCase();

            return (
              <View key={message.id} style={styles.messageRow}>
                <View
                  style={[
                    styles.messageAvatar,
                    {
                      borderColor: mine ? scene.accentPrimary : scene.borderSoft,
                      backgroundColor: mine ? 'rgba(207,160,85,0.16)' : scene.surfaceRaised,
                    },
                  ]}
                >
                  <Text style={[styles.messageAvatarText, { color: mine ? scene.accentPrimary : scene.textSecondary }]}>{senderInitial}</Text>
                </View>
                <View
                  style={[
                    styles.messageBubble,
                    mine && styles.messageBubbleMine,
                    soly && styles.messageBubbleSoly,
                    {
                      borderColor: mine ? scene.accentPrimary : scene.borderSoft,
                      backgroundColor: mine ? 'rgba(207,160,85,0.10)' : scene.surfaceRaised,
                    },
                  ]}
                >
                  <View style={styles.messageBubbleMetaRow}>
                    <Text style={[styles.messageSender, { color: mine ? scene.accentPrimary : scene.textMuted }]}>{senderLabel}</Text>
                    <Text style={[styles.messageBubbleTime, { color: scene.textMuted }]}>{message.time}</Text>
                  </View>
                  <Text style={[styles.messageBubbleText, { color: scene.textPrimary }]}>{message.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.messageLegacyHidden}>
        <ChatBubble variant="them" scene={scene}>Je suis devant la sortie principale dans huit minutes.</ChatBubble>
        <ChatBubble variant="me" scene={scene}>Parfait, nous descendons.</ChatBubble>
        <ChatBubble variant="soly" scene={scene}>ETA chauffeur confirmé. Le groupe a été notifié.</ChatBubble>
        </View>
        <View style={styles.chips}>
          {['+5 min', '+10 min', 'Changer le lieu'].map((item) => (
            <TouchableOpacity key={item} activeOpacity={0.76} onPress={() => sendMessage(item)} style={[styles.intentChip, { borderColor: scene.border }]}>
              <Text style={[styles.intentText, { color: scene.textPrimary }]}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.messageInputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire un message..."
            placeholderTextColor={scene.textMuted}
            style={[styles.messageInput, { borderColor: scene.border, color: scene.textPrimary }]}
          />
          <TouchableOpacity activeOpacity={0.78} onPress={() => sendMessage()} style={[styles.messageSendButton, { backgroundColor: scene.accentPrimary }]}>
            <MaterialIcons name="send" size={18} color={scene.bgDeep} />
          </TouchableOpacity>
        </View>
      </SurfaceCard>
    </View>
  );
}

function AccountScreen({ notify }: { notify: (message: string, pattern?: number | number[]) => void }) {
  const scene = scenes.transactional;

  return (
    <View style={styles.screen}>
      <SectionTitle title="Compte & Fidélité" subtitle="Profil, avantages, paiement et confidentialité." scene={scene} />
      <SurfaceCard scene={scene} style={styles.tierHero}>
        <SolyEyebrow scene={scene}>Palier actuel</SolyEyebrow>
        <Text style={[styles.tierName, { color: scene.textPrimary }]}>Hôte</Text>
        <Text style={[styles.cardText, { color: scene.textMuted }]}>Client SOLÝ n° 0482 · 780 points avant Ambassadeur</Text>
        <View style={[styles.progressTrack, { backgroundColor: scene.bgDeep }]}>
          <View style={[styles.progressFill, { backgroundColor: scene.accentPrimary }]} />
        </View>
      </SurfaceCard>
      {loyaltyTiers.map((tier) => (
        <SurfaceCard key={tier.tier} scene={scene}>
          <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>{tier.tier}</Text>
          <SolyDetailCard label="Accès" value={tier.access} scene={scene} />
          <SolyDetailCard label="Avantage" value={tier.advantage} scene={scene} />
        </SurfaceCard>
      ))}
      <SurfaceCard scene={scene}>
        <Text style={[styles.cardTitle, { color: scene.textPrimary }]}>Confidentialité</Text>
        {['Géolocalisation', 'Notifications push', 'Partage groupe', 'Données mobiles'].map((item) => (
          <TouchableOpacity key={item} activeOpacity={0.76} onPress={() => notify(`${item} ajusté`)} style={[styles.toggleRow, { borderColor: scene.border }]}>
            <Text style={[styles.quickLabel, { color: scene.textPrimary }]}>{item}</Text>
            <Text style={[styles.toggle, { color: scene.accentPrimary }]}>Activé</Text>
          </TouchableOpacity>
        ))}
      </SurfaceCard>
    </View>
  );
}

function MiniMap({
  dark = false,
  withCompanions = false,
  city,
  markers = [],
}: {
  dark?: boolean;
  withCompanions?: boolean;
  city?: string;
  markers?: ExplorerActivity[];
}) {
  return <RealMap dark={dark} withCompanions={withCompanions} city={city} markers={markers} />;
}

function EmergencyModal({
  visible,
  label,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  label: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const scene = scenes.emergency;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.confirmModal, { backgroundColor: scene.bg, borderColor: scene.border }]}>
          <Text style={[styles.modalTitle, { color: scene.textPrimary }]}>Confirmer l'appel</Text>
          <Text style={[styles.cardText, { color: scene.textMuted }]}>Vous êtes sur le point de contacter {label}. Cette confirmation évite les appels involontaires.</Text>
          <SolyBtnPrimary label="Confirmer" scene={scene} onPress={onConfirm} />
          <SolyBtnDecline label="Annuler" scene={scene} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function useLiveWeather() {
  const [weather, setWeather] = useState<LiveWeatherState>(fallbackWeather);

  useEffect(() => {
    let mounted = true;

    const loadWeather = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          const marrakechWeather = await fetchWeatherForCoords(31.6295, -7.9811, 'Marrakech', 'denied');
          if (mounted) setWeather(marrakechWeather);
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = position.coords;
        const city = await resolveCity(latitude, longitude);
        const live = await fetchWeatherForCoords(latitude, longitude, city, 'ready');
        if (mounted) setWeather(live);
      } catch {
        try {
          const fallback = await fetchWeatherForCoords(31.6295, -7.9811, 'Marrakech', 'error');
          if (mounted) setWeather(fallback);
        } catch {
          if (mounted) setWeather({ ...fallbackWeather, status: 'error' });
        }
      }
    };

    loadWeather();

    return () => {
      mounted = false;
    };
  }, []);

  return weather;
}

function useExchangeRate() {
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateState>(fallbackExchangeRate);

  useEffect(() => {
    let mounted = true;

    const loadRate = async () => {
      try {
        const response = await fetch('https://open.er-api.com/v6/latest/EUR');
        if (!response.ok) throw new Error('Exchange rate request failed');
        const data = await response.json();
        const rate = Number(data.rates?.MAD);
        if (!rate) throw new Error('MAD rate missing');
        const updatedAt = data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : 'maintenant';

        if (mounted) setExchangeRate({ status: 'ready', rate, rates: data.rates ?? fallbackExchangeRate.rates, updatedAt });
      } catch {
        if (mounted) setExchangeRate({ ...fallbackExchangeRate, status: 'error', updatedAt: 'hors ligne' });
      }
    };

    loadRate();

    return () => {
      mounted = false;
    };
  }, []);

  return exchangeRate;
}

function explorerGuideForCity(city: string) {
  const normalized = city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('casablanca')) return explorerGuides.casablanca;
  if (normalized.includes('rabat')) return explorerGuides.rabat;
  if (normalized.includes('paris')) return explorerGuides.paris;
  return explorerGuides.marrakech;
}

async function resolveCity(latitude: number, longitude: number) {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    const place = places[0];
    return place?.city || place?.subregion || place?.region || 'Votre position';
  } catch {
    return 'Votre position';
  }
}

async function fetchWeatherForCoords(
  latitude: number,
  longitude: number,
  city: string,
  status: LiveWeatherState['status'],
): Promise<LiveWeatherState> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    '&current=temperature_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunset' +
    '&timezone=auto&forecast_days=4';
  const response = await fetch(url);
  if (!response.ok) throw new Error('Weather request failed');

  const data = await response.json();
  const currentTemp = Math.round(Number(data.current?.temperature_2m ?? weatherDays[0].temp.replace(/\D/g, '')));
  const currentWind = Math.round(Number(data.current?.wind_speed_10m ?? 0));
  const currentCode = Number(data.current?.weather_code ?? data.daily?.weather_code?.[0] ?? 0);
  const dailyTimes: string[] = data.daily?.time ?? [];
  const days: LiveWeatherDay[] = dailyTimes.slice(0, 4).map((date, index) => {
    const max = Math.round(Number(data.daily.temperature_2m_max?.[index] ?? currentTemp));
    const min = Math.round(Number(data.daily.temperature_2m_min?.[index] ?? currentTemp));
    const code = Number(data.daily.weather_code?.[index] ?? currentCode);
    const sunset = formatSunset(data.daily.sunset?.[index]);

    return {
      label: formatWeatherDay(date),
      temp: index === 0 ? `${currentTemp}°` : `${max}°`,
      range: `${min}° / ${max}°`,
      wind: `${currentWind} km/h`,
      sunset,
      condition: weatherCodeLabel(code),
      note: weatherNote(code, city, date),
      code,
    };
  });

  return {
    status,
    city,
    currentLabel: `${city} · ${weatherCodeLabel(currentCode).toLowerCase()}`,
    days: days.length ? days : weatherDays,
  };
}

function formatWeatherDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace('.', '');
}

function formatSunset(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function weatherCodeLabel(code: number) {
  if ([0, 1].includes(code)) return 'Ciel clair';
  if ([2, 3].includes(code)) return 'Nuages doux';
  if ([45, 48].includes(code)) return 'Brume';
  if ([51, 53, 55, 56, 57].includes(code)) return 'Bruine';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Pluie';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Neige';
  if ([95, 96, 99].includes(code)) return 'Orage';
  return 'Météo live';
}

function weatherIconForDay(day: LiveWeatherDay) {
  if (typeof day.code === 'number') return weatherIconForCode(day.code);
  const condition = day.condition.toLowerCase();
  if (condition.includes('clair') || condition.includes('lumiere') || condition.includes('lumière')) return '☀';
  if (condition.includes('nuage')) return '☁';
  if (condition.includes('brume')) return '≋';
  if (condition.includes('bruine') || condition.includes('pluie')) return '☔';
  if (condition.includes('neige')) return '❄';
  if (condition.includes('orage')) return '⚡';
  return '☼';
}

function weatherIconForCode(code: number) {
  if ([0, 1].includes(code)) return '☀';
  if ([2, 3].includes(code)) return '☁';
  if ([45, 48].includes(code)) return '≋';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '☔';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄';
  if ([95, 96, 99].includes(code)) return '⚡';
  return '☼';
}

function weatherNote(code: number, city: string, date: string) {
  const day = date ? new Date(date).toLocaleDateString('fr-FR', { weekday: 'long' }) : 'jour';
  if ([0, 1].includes(code)) return `${city}, ${day}: conditions idéales pour sortir sans contrainte.`;
  if ([2, 3].includes(code)) return `${city}, ${day}: lumière douce, parfaite pour les déplacements.`;
  if ([61, 63, 65, 80, 81, 82].includes(code)) return `${city}, ${day}: prévoir un trajet couvert et un départ souple.`;
  if ([95, 96, 99].includes(code)) return `${city}, ${day}: SOLÝ recommande de confirmer les trajets avant départ.`;
  return `${city}, ${day}: météo actualisée selon votre position.`;
}

function useFadeUp() {
  const y = useRef(new Animated.Value(14)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 520, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 520, useNativeDriver: true }),
    ]).start();
  }, [opacity, y]);

  return { opacity, transform: [{ translateY: y }] };
}

function usePulse(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 420, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return scale;
}

function DockIconButton({
  icon,
  label,
  scene,
  badge,
  active = false,
  pulse = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  scene: (typeof scenes)[keyof typeof scenes];
  badge?: string;
  active?: boolean;
  pulse?: boolean;
  onPress: () => void;
}) {
  const iconColor = active ? scene.bgDeep : scene.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.bottomDockIconButton,
        active && { backgroundColor: scene.accentPrimary },
        pulse && { borderColor: scene.accentPrimary, backgroundColor: 'rgba(207,160,85,0.08)' },
      ]}
    >
      <MaterialIcons name={icon} size={22} color={iconColor} />
      {badge ? (
        <View style={styles.bottomDockBadge}>
          <Text style={styles.bottomDockBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function screenScene(screen: ModuleKey) {
  if (screen === 'sos') return 'emergency';
  if (screen === 'currency' || screen === 'arrival' || screen === 'formalities' || screen === 'account') return 'transactional';
  if (screen === 'explore') return 'editorial';
  return 'immersive';
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#F4EFE4',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
  },
  deviceFrame: {
    width: Platform.OS === 'web' ? 430 : '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    height: Platform.OS === 'web' ? 932 : '100%',
    maxHeight: Platform.OS === 'web' ? '96%' : undefined,
    borderRadius: Platform.OS === 'web' ? 34 : 0,
    padding: Platform.OS === 'web' ? 10 : 0,
    backgroundColor: Platform.OS === 'web' ? '#111111' : 'transparent',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.28 : 0,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    overflow: 'hidden',
  },
  nativeDeviceFrame: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    borderRadius: Platform.OS === 'web' ? 26 : 0,
    overflow: 'hidden',
  },
  app: {
    flex: 1,
  },
  mainScroll: {
    flex: 1,
  },
  loadingRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingTopLine: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 34 : 64,
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(207,160,85,0.28)',
  },
  loadingFineLine: {
    position: 'absolute',
    left: 42,
    right: 42,
    top: '31%',
    height: 1,
    backgroundColor: 'rgba(207,160,85,0.10)',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmblem: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.36)',
    backgroundColor: 'rgba(6,20,14,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  loadingEmblemGlow: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(207,160,85,0.16)',
  },
  loadingMascot: {
    width: 64,
    height: 58,
  },
  loadingBrand: {
    fontFamily: type.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: 6,
    color: '#CFA055',
  },
  loadingSubtitle: {
    marginTop: 2,
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    letterSpacing: 3,
    color: 'rgba(244,239,228,0.88)',
  },
  loadingProgressTrack: {
    width: 118,
    height: 18,
    marginTop: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  loadingProgressSegment: {
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(207,160,85,0.72)',
  },
  loadingProgressSegmentActive: {
    width: 34,
    backgroundColor: '#CFA055',
  },
  loadingText: {
    marginTop: 9,
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    letterSpacing: 1.8,
    color: 'rgba(244,239,228,0.78)',
  },
  loadingFootnote: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 38 : 54,
    fontFamily: type.bodyBold,
    fontSize: 8.8,
    letterSpacing: 2.2,
    color: 'rgba(207,160,85,0.52)',
  },
  topChrome: {
    height: 46,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backText: {
    fontFamily: type.bodyBold,
    fontSize: 13,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 58,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 10 : 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: Platform.OS === 'web' ? 0.22 : 0,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    zIndex: 15,
  },
  bottomDockIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(244,239,228,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bottomDockBadge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#F4EFE4',
    backgroundColor: '#E33A3A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#E33A3A',
    shadowOpacity: 0.55,
    shadowRadius: 8,
  },
  bottomDockBadgeText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
  },
  bottomDockButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDockButtonPrimary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomDockText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  bottomDockPrimaryText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  scrollContentWithDock: {
    paddingBottom: 92,
  },
  homeScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 28,
  },
  weatherScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  screen: {
    gap: spacing.md,
  },
  homeScreen: {
    minHeight: Platform.OS === 'web' ? 852 : undefined,
    gap: 0,
    alignItems: 'center',
  },
  homeTopBar: {
    width: '100%',
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 7,
  },
  homeTime: {
    position: 'absolute',
    left: 0,
    fontFamily: type.bodyBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  homeAccountPill: {
    minHeight: 36,
    borderRadius: 19,
    borderWidth: 1,
    paddingLeft: 4,
    paddingRight: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  homeAccountInitial: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeAccountInitialText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    lineHeight: 12,
  },
  homeAccountName: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  homeAccountCaret: {
    fontFamily: type.bodyBold,
    fontSize: 10,
  },
  homeHeader: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 2,
    marginTop: 2,
  },
  homeGreeting: {
    fontFamily: type.serif,
    fontSize: 27,
    lineHeight: 32,
  },
  homeMeta: {
    fontFamily: type.body,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  mascotButton: {
    width: '100%',
    height: 122,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  mascotImage: {
    width: 139,
    height: 122,
  },
  homeBrand: {
    alignItems: 'center',
    marginTop: 7,
    marginBottom: 22,
  },
  homeLogo: {
    fontFamily: type.display,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: 2,
  },
  homeSubtitle: {
    fontFamily: type.bodyMedium,
    fontSize: 8,
    letterSpacing: 4.2,
  },
  homeDivider: {
    width: 118,
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerDiamond: {
    fontFamily: type.display,
    fontSize: 10,
  },
  homeIntro: {
    alignItems: 'center',
    marginTop: 7,
    marginBottom: 17,
  },
  homeLead: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 23,
  },
  homeSosButton: {
    width: 58,
    height: 30,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: '#E62D31',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    marginBottom: 4,
  },
  homeSosText: {
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    letterSpacing: 2.5,
    color: '#FFFFFF',
  },
  urgentSafeArea: {
    flex: 1,
    backgroundColor: '#041E0C',
  },
  urgentTop: {
    height: 166,
    paddingHorizontal: 24,
    paddingTop: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  urgentMascotPeek: {
    position: 'absolute',
    width: 92,
    height: 81,
    bottom: -49,
    left: '50%',
    marginLeft: -46,
  },
  urgentSheet: {
    flex: 1,
    minHeight: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 14,
  },
  urgentIntroCard: {
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 16,
    marginTop: 18,
  },
  urgentIntroText: {
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 17,
    color: '#B7C1BA',
  },
  urgentPrimaryCall: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#B44339',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 13,
  },
  urgentPrimaryTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: '#F6F0E8',
  },
  urgentPrimaryMeta: {
    fontFamily: type.body,
    fontSize: 7,
    lineHeight: 10,
    color: '#E7CDC8',
  },
  urgentNumbersCard: {
    flex: 1,
    minHeight: 0,
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 13,
    marginTop: 18,
  },
  urgentNumbersTitle: {
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 18,
    color: '#CFA055',
    marginBottom: 11,
  },
  urgentNumberRow: {
    flex: 1,
    minHeight: 52,
    maxHeight: 63,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  urgentNumberLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    color: '#F1EEE7',
  },
  urgentNumberDetail: {
    fontFamily: type.body,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#A8B5AC',
  },
  urgentNumberValue: {
    fontFamily: type.body,
    fontSize: 10,
    color: '#F1EEE7',
    textAlign: 'right',
  },
  urgentConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    backgroundColor: 'rgba(4,30,12,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  urgentConfirmCard: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#125638',
    paddingHorizontal: 17,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 18,
  },
  urgentConfirmTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 16,
    lineHeight: 21,
    color: '#CFA055',
    textAlign: 'center',
  },
  urgentConfirmDestination: {
    fontFamily: type.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    color: '#F4F0E7',
    textAlign: 'center',
    marginTop: 4,
  },
  urgentConfirmText: {
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 17,
    color: '#B9C7BD',
    textAlign: 'center',
    marginTop: 14,
  },
  urgentConfirmActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 17,
  },
  urgentCancelButton: {
    flex: 1,
    height: 42,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#DCE7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentCancelText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#F3F0E9',
  },
  urgentCallButton: {
    flex: 1,
    height: 42,
    borderRadius: 7,
    backgroundColor: '#B44339',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentCallText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#F8F2EA',
  },
  homeEmergencyPanel: {
    width: '100%',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(193,93,66,0.38)',
    backgroundColor: '#27120F',
    paddingHorizontal: 17,
    paddingTop: 12,
    paddingBottom: 18,
    gap: 11,
    marginBottom: 18,
  },
  homeEmergencyHandle: {
    alignSelf: 'center',
    width: 43,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(207,160,85,0.24)',
    marginBottom: 5,
  },
  homeEmergencyHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(193,93,66,0.25)',
  },
  homeEmergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(193,93,66,0.45)',
    backgroundColor: 'rgba(193,93,66,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeEmergencyTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeEmergencyTitle: {
    fontFamily: type.serif,
    fontSize: 25,
    lineHeight: 29,
    color: '#CFA055',
  },
  homeEmergencySubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: '#EDE5D0',
  },
  homeEmergencyClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  homeEmergencyIntro: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    lineHeight: 21,
    color: '#D8D0BE',
  },
  homeEmergencyCallCard: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(193,93,66,0.42)',
    backgroundColor: 'rgba(193,93,66,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  homeEmergencyCallCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  homeEmergencyCallTitle: {
    fontFamily: type.bodyBold,
    fontSize: 15,
    lineHeight: 19,
    color: '#F5F0E4',
  },
  homeEmergencyCallMeta: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
    color: '#D8D0BE',
  },
  homeEmergencyConfirm: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.36)',
    backgroundColor: 'rgba(207,160,85,0.08)',
    padding: 12,
    gap: 12,
  },
  homeEmergencyConfirmText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    lineHeight: 17,
    color: '#F5F0E4',
  },
  homeEmergencyConfirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  homeEmergencyCancelButton: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeEmergencyCancelText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    color: '#CFA055',
  },
  homeEmergencyConfirmButton: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#CFA055',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  homeEmergencyConfirmButtonText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    color: '#2B120F',
  },
  homeEmergencySectionLabel: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 3,
    color: '#CFA055',
    marginTop: 8,
  },
  homeEmergencyRow: {
    minHeight: 70,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.20)',
    backgroundColor: 'rgba(0,0,0,0.13)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeEmergencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#CFA055',
    shadowOpacity: 0.4,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  homeEmergencyRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  homeEmergencyRowTitle: {
    fontFamily: type.bodyBold,
    fontSize: 13,
    lineHeight: 17,
    color: '#F5F0E4',
  },
  homeEmergencyRowMeta: {
    fontFamily: type.bodyMedium,
    fontSize: 10.5,
    lineHeight: 14,
    color: '#D8D0BE',
  },
  homeEmergencyRowValue: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#F5F0E4',
    maxWidth: 96,
    textAlign: 'right',
  },
  homeStayActions: {
    width: '100%',
    marginBottom: 0,
    gap: 9,
  },
  homeStayActionsLocked: {
    opacity: 0.48,
  },
  homeStayDivider: {
    alignSelf: 'center',
    width: 140,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeStayLine: {
    flex: 1,
    height: 1,
  },
  homeStayDiamond: {
    fontFamily: type.display,
    fontSize: 12,
    lineHeight: 14,
  },
  homeStayTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  homeActionCard: {
    width: '100%',
    minHeight: 63,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  homeActionIcon: {
    width: 33,
    height: 33,
    borderRadius: 9,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeActionIconText: {
    fontFamily: type.display,
    fontSize: 17,
    lineHeight: 20,
  },
  homeActionCopy: {
    flex: 1,
    gap: 4,
  },
  homeActionTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 12.5,
    lineHeight: 17,
  },
  homeActionMeta: {
    fontFamily: type.body,
    fontSize: 9.5,
    lineHeight: 13,
  },
  homeActionChevron: {
    fontFamily: type.body,
    fontSize: 24,
    lineHeight: 26,
    opacity: 0.72,
  },
  homeWakePrompt: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  homeWakeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  homeWakeText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  momentCard: {
    width: '100%',
    minHeight: 94,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: 19,
  },
  momentTitle: {
    fontFamily: type.serif,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  momentScript: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  momentRating: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 7,
  },
  ratingMark: {
    fontFamily: type.display,
    fontSize: 16,
    lineHeight: 18,
  },
  homeModuleGrid: {
    width: '100%',
    gap: 22,
  },
  homeModuleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  homeModuleTile: {
    width: '30%',
    minWidth: 0,
    height: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  homeModuleTileLocked: {
    opacity: 0.44,
  },
  homeModuleIcon: {
    opacity: 0.78,
  },
  tileMascot: {
    width: 46,
    height: 38,
  },
  homeTileCopy: {
    alignItems: 'center',
    gap: 3,
  },
  homeModuleLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  homeModuleKicker: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 10,
    textAlign: 'center',
  },
  solyRequestRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: Platform.OS === 'web' ? 10 : 0,
    paddingBottom: Platform.OS === 'web' ? 10 : 0,
  },
  solyRequestBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  solyRequestSheet: {
    width: Platform.OS === 'web' ? '100%' : '100%',
    maxWidth: Platform.OS === 'web' ? 410 : undefined,
    maxHeight: Platform.OS === 'web' ? '92%' : '96%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    borderWidth: 1,
    overflow: 'hidden',
    paddingTop: 10,
  },
  solyModernSheet: {
    height: '92%',
    maxHeight: '92%',
    borderWidth: 0,
    backgroundColor: '#164A31',
  },
  solyModernHandle: {
    alignSelf: 'center',
    width: 35,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F0E9DB',
    marginBottom: 14,
  },
  solyModernTitle: {
    fontFamily: type.serif,
    fontSize: 27,
    lineHeight: 33,
    color: '#F2EEE5',
  },
  solyModernClose: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(220,225,216,0.18)',
    backgroundColor: 'rgba(220,225,216,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyModernContent: {
    paddingHorizontal: 21,
    paddingTop: 18,
    paddingBottom: 25,
    gap: 16,
  },
  solyModernPrompt: {
    fontFamily: type.serif,
    fontSize: 21,
    lineHeight: 27,
    color: '#F2EEE5',
    textAlign: 'center',
  },
  solyModernPromptAccent: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    color: '#CFA055',
  },
  solyModernNote: {
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 15,
    color: '#AAB8AE',
    textAlign: 'center',
    marginTop: -10,
  },
  solyModernRequestField: {
    minHeight: 104,
    borderRadius: 8,
    backgroundColor: '#F7F6F2',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  solyModernRequestInput: {
    minHeight: 76,
    padding: 0,
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 17,
    color: '#173824',
  },
  solyModernRingButton: {
    minHeight: 43,
    borderRadius: 8,
    backgroundColor: '#CFA055',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 4,
  },
  solyModernRingText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 2.2,
    color: '#092416',
  },
  solyModernChatLink: {
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 15,
    color: '#AAB8AE',
    textAlign: 'center',
  },
  solyChatBody: {
    flex: 1,
  },
  solyChatMessages: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 16,
    gap: 12,
  },
  solyChatMessageRow: {
    width: '100%',
    flexDirection: 'row',
  },
  solyChatMessageRowSoly: {
    justifyContent: 'flex-end',
  },
  solyChatMessageRowMine: {
    justifyContent: 'flex-start',
  },
  solyChatBubble: {
    maxWidth: '72%',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 8,
  },
  solyChatBubbleSoly: {
    backgroundColor: '#082719',
  },
  solyChatBubbleMine: {
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.36)',
    backgroundColor: 'rgba(207,160,85,0.08)',
  },
  solyChatMessageText: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 18,
    color: '#F0EEE7',
  },
  solyChatMessageTime: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#91A297',
    textAlign: 'right',
    marginTop: 7,
  },
  solyChatComposer: {
    minHeight: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(207,160,85,0.12)',
    backgroundColor: '#082719',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  solyChatInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    paddingHorizontal: 18,
    fontFamily: type.body,
    fontSize: 12,
    color: '#F2EEE5',
  },
  solyChatSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CFA055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyRequestHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  solyRequestHeader: {
    minHeight: 70,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  solyRequestHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyRequestHeaderIconText: {
    fontFamily: type.display,
    fontSize: 22,
    lineHeight: 25,
  },
  solyRequestHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  solyRequestTitle: {
    fontFamily: type.serif,
    fontSize: 24,
    lineHeight: 27,
  },
  solyRequestSubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  solyRequestClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyRequestCloseText: {
    fontFamily: type.body,
    fontSize: 18,
    lineHeight: 20,
  },
  solyRequestScroll: {
    flexShrink: 1,
    maxHeight: Platform.OS === 'web' ? 720 : undefined,
  },
  solyRequestContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 18,
  },
  solyRequestHero: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  solyRequestBellHalo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyRequestBellCore: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solyRequestBellGlyph: {
    fontFamily: type.display,
    fontSize: 38,
    lineHeight: 42,
  },
  solyRequestEyebrow: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  solyRequestPrompt: {
    fontFamily: type.serif,
    fontSize: 30,
    lineHeight: 32,
    textAlign: 'center',
  },
  solyRequestPromptAccent: {
    color: '#CFA055',
    fontStyle: 'italic',
  },
  solyRequestNote: {
    fontFamily: type.bodyBold,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  solyRequestFieldCard: {
    minHeight: 168,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    gap: 12,
  },
  solyRequestSectionLabel: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  solyRequestInput: {
    minHeight: 94,
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    padding: 0,
  },
  solyRequestPickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  solyRequestPickerDash: {
    width: 8,
    height: 1,
  },
  solyRequestPickerText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  solyRequestChoiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  solyRequestDayButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  solyRequestSlotButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 3,
  },
  solyRequestChoiceLabel: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  solyRequestDayNumber: {
    fontFamily: type.serif,
    fontSize: 27,
    lineHeight: 30,
  },
  solyRequestChoiceMeta: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  solyRequestRingButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  solyRequestRingText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 4,
  },
  solyRequestChatLink: {
    alignSelf: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(239,234,224,0.32)',
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  solyRequestChatLinkText: {
    fontFamily: type.serif,
    fontSize: 14,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  brandBlock: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logo: {
    fontFamily: type.serif,
    fontSize: 78,
    lineHeight: 84,
  },
  brandLine: {
    maxWidth: 310,
    fontFamily: type.body,
    fontSize: 15,
    lineHeight: 22,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bannerCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: type.bodyBold,
    fontSize: 16,
  },
  cardText: {
    fontFamily: type.body,
    fontSize: 13,
    lineHeight: 19,
  },
  smallPill: {
    borderWidth: 1,
    borderRadius: 17,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  presenceCard: {
    gap: spacing.sm,
  },
  presenceText: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 33,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rating: {
    fontFamily: type.serif,
    fontSize: 32,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moduleTile: {
    width: '48.5%',
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  moduleIcon: {
    fontFamily: type.serif,
    fontSize: 24,
  },
  moduleLabel: {
    fontFamily: type.display,
    fontSize: 16,
  },
  moduleKicker: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  quickList: {
    gap: spacing.sm,
  },
  quickRow: {
    minHeight: 62,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickLabel: {
    fontFamily: type.bodyBold,
    fontSize: 14,
  },
  quickMeta: {
    fontFamily: type.body,
    fontSize: 12,
    marginTop: 3,
  },
  shareCard: {
    gap: spacing.sm,
  },
  shareActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  shareButtonPrimary: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  shareButtonText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  shareButtonPrimaryText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  chevron: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '800',
  },
  sosButton: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: {
    fontFamily: type.bodyBold,
    fontSize: 13,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  stayLayerScreen: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: '#041E0C',
  },
  stayLayerScreenExpanded: {
    minHeight: 850,
  },
  stayLayerTop: {
    height: 34,
    position: 'relative',
    overflow: 'hidden',
  },
  stayMascotPeek: {
    position: 'absolute',
    width: 66,
    height: 58,
    bottom: -43,
    left: '50%',
    marginLeft: -33,
  },
  stayLayerSheet: {
    flex: 1,
    minHeight: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 0,
  },
  stayLayerSheetExpanded: {
    minHeight: 816,
    paddingBottom: 18,
  },
  stayLayerHandle: {
    marginBottom: 12,
  },
  stayDriverCard: {
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 13,
    marginTop: 12,
  },
  stayDriverHeadline: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
    color: '#F1EEE6',
    marginTop: 8,
  },
  stayDriverName: {
    fontFamily: type.bodyMedium,
    color: '#CFA055',
  },
  stayDriverRoute: {
    fontFamily: type.body,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#A7B3AA',
    marginTop: 8,
  },
  stayDriverCar: {
    fontFamily: type.bodyMedium,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 2,
    color: '#71877A',
  },
  stayDriverButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#CFA055',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  stayDriverButtonText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#CFA055',
  },
  stayDriverButtonLocated: {
    borderColor: '#54D786',
    backgroundColor: 'rgba(84,215,134,0.08)',
  },
  stayDriverButtonTextLocated: {
    color: '#54D786',
  },
  stayLayerWelcome: {
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 16,
    color: '#F0ECE3',
    marginVertical: 12,
  },
  stayDayCard: {
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginBottom: 10,
  },
  stayDayHead: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  stayDayCopy: {
    flex: 1,
    minWidth: 0,
  },
  stayDayTitle: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 19,
    lineHeight: 22,
    color: '#F1EEE6',
  },
  stayDaySubtitle: {
    fontFamily: type.body,
    fontSize: 9,
    lineHeight: 13,
    color: '#9EADA3',
  },
  stayDayBadge: {
    minWidth: 25,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(207,160,85,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayDayBadgeText: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    color: '#CFA055',
  },
  stayEventList: {
    gap: 8,
    marginTop: 9,
  },
  stayEventCard: {
    minHeight: 61,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    backgroundColor: '#173824',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stayEventCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stayEventTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 14,
    color: '#F2EEE4',
  },
  stayEventPlace: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#B0BCB3',
  },
  stayEventDetail: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#D6DCD5',
  },
  stayEventAccent: {
    fontFamily: type.bodyMedium,
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: 1.4,
    color: '#CFA055',
  },
  stayEventTime: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 13,
    lineHeight: 16,
    color: '#CFA055',
  },
  stayScreen: {
    gap: 20,
  },
  stayLegacyTitleHidden: {
    display: 'none',
  },
  stayHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stayHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stayHeaderIconText: {
    fontFamily: type.display,
    fontSize: 18,
    lineHeight: 22,
  },
  stayHeaderCopy: {
    flex: 1,
  },
  stayTitle: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 32,
  },
  staySubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  driverArrivalCard: {
    borderRadius: 14,
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(207,160,85,0.05)',
  },
  driverArrivalBadge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(207,160,85,0.12)',
  },
  driverArrivalBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CFA055',
  },
  driverArrivalBadgeText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    color: '#D7B763',
  },
  driverArrivalName: {
    marginTop: 4,
    fontFamily: type.bodyBold,
    fontSize: 15,
    lineHeight: 19,
  },
  driverArrivalTime: {
    fontFamily: type.bodyBold,
    fontSize: 17,
    lineHeight: 23,
  },
  driverArrivalRoute: {
    fontFamily: type.bodyMedium,
    fontSize: 11.5,
    lineHeight: 17,
  },
  driverArrivalCar: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
  },
  driverArrivalActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  driverArrivalButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  driverArrivalButtonActive: {
    borderColor: 'rgba(126,234,122,0.46)',
    backgroundColor: 'rgba(126,234,122,0.08)',
  },
  driverArrivalButtonText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  stayRouteWrap: {
    marginTop: 6,
    gap: 10,
  },
  staticRouteMap: {
    height: 178,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.18)',
    overflow: 'hidden',
    backgroundColor: '#102E20',
  },
  staticRouteTileGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  staticRouteTile: {
    width: '50%',
    height: '50%',
  },
  staticRouteScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,45,30,0.12)',
  },
  staticRoutePath: {
    position: 'absolute',
    left: '35%',
    top: '48%',
    width: 96,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.88)',
    transform: [{ rotate: '-18deg' }],
  },
  staticRoutePin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#CFA055',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CFA055',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    zIndex: 2,
  },
  staticRoutePinYou: {
    left: '55%',
    top: '48%',
  },
  staticRoutePinDriver: {
    left: '32%',
    top: '61%',
  },
  staticRoutePinText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    color: '#0D2F21',
  },
  stayRouteMap: {
    height: 132,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.18)',
    backgroundColor: 'rgba(2,24,15,0.30)',
    overflow: 'hidden',
  },
  stayRouteDashOne: {
    position: 'absolute',
    left: '27%',
    top: 75,
    width: 92,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.72)',
    transform: [{ rotate: '-22deg' }],
  },
  stayRouteDashTwo: {
    position: 'absolute',
    left: '46%',
    top: 54,
    width: 88,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.72)',
    transform: [{ rotate: '-20deg' }],
  },
  stayRoutePin: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#C29B45',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CFA055',
    shadowOpacity: 0.38,
    shadowRadius: 8,
  },
  stayRoutePinUser: {
    left: '23%',
    top: 69,
  },
  stayRoutePinDriver: {
    right: '24%',
    top: 24,
  },
  stayRoutePinText: {
    fontFamily: type.serif,
    fontSize: 12,
    color: '#F4EFE4',
  },
  stayRouteLabel: {
    position: 'absolute',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
    backgroundColor: '#07150E',
    fontFamily: type.bodyBold,
    fontSize: 8.5,
    color: '#F4EFE4',
  },
  stayRouteUserLabel: {
    left: '21%',
    top: 96,
  },
  stayRouteDriverLabel: {
    right: '10%',
    top: 52,
  },
  stayRouteMeta: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
  },
  stayWelcome: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  contactChatRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: '#041E0C',
  },
  contactChatPanel: {
    flex: 1,
    marginTop: 42,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    overflow: 'hidden',
    paddingTop: 8,
  },
  contactChatHandle: {
    alignSelf: 'center',
    width: 35,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F0E9DB',
    marginBottom: 19,
  },
  contactChatTitleRow: {
    minHeight: 44,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactChatTitle: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 34,
    color: '#F2EEE5',
  },
  contactChatClose: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(220,225,216,0.18)',
    backgroundColor: 'rgba(220,225,216,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactChatRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(207,160,85,0.28)',
    marginHorizontal: 24,
  },
  contactChatProfile: {
    minHeight: 68,
    paddingHorizontal: 24,
    backgroundColor: '#0A2C1B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 19,
  },
  contactChatAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#B28A3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactChatAvatarText: {
    fontFamily: type.serif,
    fontSize: 18,
    color: '#F6F0E4',
  },
  contactChatOnlineDot: {
    position: 'absolute',
    top: 1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#54D786',
  },
  contactChatName: {
    fontFamily: type.serif,
    fontSize: 18,
    lineHeight: 21,
    color: '#CFA055',
  },
  contactChatConnected: {
    fontFamily: type.body,
    fontSize: 9,
    color: '#9FB0A5',
  },
  contactChatCarBar: {
    minHeight: 50,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(207,160,85,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  contactChatCar: {
    flex: 1,
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#E6E6DC',
  },
  contactChatEta: {
    fontFamily: type.bodyMedium,
    fontSize: 8,
    letterSpacing: 1.2,
    color: '#CFA055',
  },
  contactChatNotice: {
    fontFamily: type.body,
    fontSize: 9.5,
    lineHeight: 15,
    color: '#CFA055',
    textAlign: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  contactChatMessages: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  contactChatMessageRow: {
    width: '100%',
    flexDirection: 'row',
  },
  contactChatMessageRowDriver: {
    justifyContent: 'flex-end',
  },
  contactChatMessageRowMine: {
    justifyContent: 'flex-start',
  },
  contactChatBubble: {
    maxWidth: '72%',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 8,
  },
  contactChatBubbleDriver: {
    backgroundColor: '#082719',
  },
  contactChatBubbleMine: {
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.36)',
    backgroundColor: 'rgba(207,160,85,0.08)',
  },
  contactChatMessageText: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 18,
    color: '#F0EEE7',
  },
  contactChatMessageTime: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#91A297',
    textAlign: 'right',
    marginTop: 6,
  },
  contactChatQuickReplies: {
    minHeight: 50,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactChatQuickReply: {
    flex: 1,
    minHeight: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  contactChatQuickReplyText: {
    fontFamily: type.body,
    fontSize: 8.5,
    color: '#CFA055',
  },
  contactChatComposer: {
    minHeight: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(207,160,85,0.12)',
    backgroundColor: '#082719',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  contactChatInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    paddingHorizontal: 18,
    fontFamily: type.body,
    fontSize: 12,
    color: '#F2EEE5',
  },
  contactChatSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CFA055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChatRoot: {
    position: 'absolute',
    zIndex: 80,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 10 : 8,
  },
  driverChatBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.56)',
  },
  driverChatPanel: {
    width: '100%',
    maxWidth: '100%',
    flex: 1,
    borderRadius: Platform.OS === 'web' ? 24 : 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  driverChatHeader: {
    minHeight: 84,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#17452C',
  },
  driverChatAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#B9903D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChatAvatarText: {
    fontFamily: type.serif,
    fontSize: 20,
    color: '#F4EFE4',
  },
  driverChatHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  driverChatName: {
    fontFamily: type.serif,
    fontSize: 24,
    lineHeight: 28,
  },
  driverChatRole: {
    fontFamily: type.bodyBold,
    fontSize: 11,
  },
  driverChatClose: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EFE4',
  },
  driverChatCloseText: {
    fontFamily: type.bodyBold,
    fontSize: 17,
    lineHeight: 20,
    color: '#0D2F21',
  },
  driverChatCarBar: {
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(207,160,85,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  driverChatCarText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.8,
    color: '#D7B763',
  },
  driverChatBody: {
    flex: 1,
    padding: 18,
    gap: 12,
  },
  driverChatNotice: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: '#D7B763',
  },
  driverMessageList: {
    gap: 11,
    paddingBottom: 4,
  },
  driverMessageRow: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  driverMessageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.18)',
    backgroundColor: 'rgba(244,239,228,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  driverMessageAvatarMine: {
    borderColor: 'rgba(207,160,85,0.56)',
    backgroundColor: 'rgba(207,160,85,0.16)',
  },
  driverMessageAvatarText: {
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    color: 'rgba(244,239,228,0.68)',
  },
  driverMessageAvatarTextMine: {
    color: '#D7B763',
  },
  driverMessageBubble: {
    flex: 1,
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.12)',
    backgroundColor: 'rgba(244,239,228,0.055)',
    padding: 14,
    gap: 7,
    justifyContent: 'center',
  },
  driverMessageBubbleMine: {
    borderColor: 'rgba(207,160,85,0.46)',
    borderLeftWidth: 3,
    backgroundColor: 'rgba(207,160,85,0.10)',
  },
  driverMessageMetaRow: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  driverMessageSender: {
    flex: 1,
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    color: 'rgba(244,239,228,0.56)',
    textTransform: 'uppercase',
  },
  driverMessageSenderMine: {
    color: '#D7B763',
  },
  driverMessageText: {
    fontFamily: type.bodyBold,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#F4EFE4',
  },
  driverMessageTime: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    color: 'rgba(244,239,228,0.56)',
  },
  driverLegacyHidden: {
    display: 'none',
  },
  driverQuickReplies: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverQuickReply: {
    minHeight: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  driverQuickReplyText: {
    fontFamily: type.bodyBold,
    fontSize: 10.5,
    color: '#D7B763',
  },
  driverChatInputRow: {
    minHeight: 62,
    paddingHorizontal: 18,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  driverChatInput: {
    flex: 1,
    minHeight: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.10)',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 16,
    fontFamily: type.bodyMedium,
    fontSize: 13,
    color: '#F4EFE4',
  },
  driverChatSend: {
    width: 43,
    height: 43,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.42)',
    backgroundColor: '#D7B763',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChatSendText: {
    fontFamily: type.serif,
    fontSize: 24,
    color: '#D7B763',
  },
  messageOverlayRoot: {
    position: 'absolute',
    zIndex: 85,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 10 : 8,
  },
  messageOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  messageOverlayPanel: {
    width: '100%',
    maxWidth: '100%',
    flex: 1,
    borderRadius: Platform.OS === 'web' ? 24 : 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  messageOverlayHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  messageOverlayTitle: {
    fontFamily: type.serif,
    fontSize: 30,
    lineHeight: 34,
  },
  messageOverlaySubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  messageOverlayClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4EFE4',
  },
  messageOverlayTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  messageOverlayTab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageOverlayTabText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
  },
  messageOverlayBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E33A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageOverlayBadgeText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  messageOverlayScroll: {
    flex: 1,
  },
  messageOverlayList: {
    paddingVertical: 6,
    gap: 10,
  },
  messageOverlayReplies: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accordionCard: {
    gap: spacing.md,
  },
  accordionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayTitle: {
    fontFamily: type.serif,
    fontSize: 24,
  },
  dayBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayBadgeText: {
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '800',
  },
  timeline: {
    gap: spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 54,
  },
  time: {
    width: 48,
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '800',
  },
  timelineCopy: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: type.body,
    fontSize: 15,
    fontWeight: '800',
  },
  status: {
    fontFamily: type.body,
    fontSize: 11,
  },
  bellWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  bell: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellText: {
    fontFamily: type.serif,
    fontSize: 24,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  intentChip: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intentText: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    borderBottomWidth: 1,
    fontFamily: type.body,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  twoColumns: {
    gap: spacing.xs,
  },
  searching: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '800',
    marginVertical: spacing.sm,
  },
  atmosphereScreen: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: '#041E0C',
  },
  atmosphereTop: {
    height: 155,
    paddingHorizontal: 24,
    paddingTop: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  atmosphereAccountRow: {
    minHeight: 44,
    alignItems: 'flex-end',
    marginBottom: 7,
  },
  atmosphereGreeting: {
    fontFamily: type.serif,
    fontSize: 27,
    lineHeight: 32,
    color: '#CFA055',
  },
  atmosphereMeta: {
    fontFamily: type.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#ECE8DD',
  },
  atmosphereMascotPeek: {
    position: 'absolute',
    width: 70,
    height: 62,
    bottom: -37,
    left: '50%',
    marginLeft: -35,
  },
  atmosphereSheet: {
    flex: 1,
    minHeight: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 24,
  },
  atmosphereHandle: {
    alignSelf: 'center',
    width: 35,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#EFE8D8',
    marginBottom: 24,
  },
  atmosphereTitleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atmosphereTitle: {
    fontFamily: type.serif,
    fontSize: 29,
    lineHeight: 35,
    color: '#EEE9DF',
  },
  atmosphereClose: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(220,225,216,0.18)',
    backgroundColor: 'rgba(220,225,216,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  atmosphereRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(204,177,84,0.28)',
  },
  atmosphereIntro: {
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 17,
    color: '#F0EDE4',
    marginTop: 17,
    marginBottom: 16,
  },
  atmosphereHero: {
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 18,
  },
  atmosphereDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  atmosphereDate: {
    flex: 1,
    fontFamily: type.serif,
    fontSize: 21,
    lineHeight: 26,
    color: '#CFA055',
  },
  atmosphereToday: {
    fontFamily: type.bodyMedium,
    fontSize: 8.5,
    letterSpacing: 2,
    color: '#CFA055',
  },
  atmosphereTempRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  atmosphereWeatherIcon: {
    width: 68,
    fontSize: 52,
    lineHeight: 65,
    color: '#FFA92E',
    textAlign: 'center',
  },
  atmosphereTemp: {
    fontFamily: type.serif,
    fontSize: 57,
    lineHeight: 65,
    color: '#F5F0E6',
  },
  atmosphereCondition: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
    color: '#EFECE3',
    marginBottom: 12,
  },
  atmosphereStats: {
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(210,214,202,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  atmosphereStat: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  atmosphereStatLabel: {
    fontFamily: type.body,
    fontSize: 9,
    letterSpacing: 0.7,
    color: '#7D9184',
  },
  atmosphereStatValue: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    color: '#E9E9DF',
  },
  atmosphereNote: {
    minHeight: 56,
    borderLeftWidth: 1,
    borderLeftColor: '#CFA055',
    borderRadius: 0,
    backgroundColor: '#1C3C27',
    paddingHorizontal: 11,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  atmosphereNoteText: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 14,
    lineHeight: 14,
    color: '#CFA055',
  },
  atmosphereOtherLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 7.5,
    letterSpacing: 2,
    color: '#91A395',
    marginTop: 18,
    marginBottom: 8,
  },
  atmosphereForecastRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  atmosphereMini: {
    flex: 1,
    height: 75,
    minWidth: 0,
    borderRadius: 12,
    backgroundColor: '#0D3522',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  atmosphereMiniLabel: {
    width: '100%',
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#A6B4A9',
    textAlign: 'center',
  },
  atmosphereMiniIcon: {
    fontSize: 23,
    lineHeight: 27,
  },
  atmosphereMiniTemp: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    color: '#F1EEE6',
  },
  atmosphereLiveStatus: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 12,
    color: '#829489',
    textAlign: 'center',
    marginTop: 13,
  },
  weatherHero: {
    gap: spacing.sm,
  },
  weatherHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weatherIconOrb: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherIconGlyph: {
    fontSize: 42,
    lineHeight: 48,
  },
  temp: {
    fontFamily: type.serif,
    fontSize: 62,
    lineHeight: 70,
  },
  weatherCondition: {
    fontFamily: type.body,
    fontSize: 15,
    fontWeight: '800',
  },
  statsRow: {
    gap: spacing.xs,
  },
  editorialNote: {
    fontFamily: type.serif,
    fontSize: 18,
    lineHeight: 25,
    fontStyle: 'italic',
  },
  weatherStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  weatherMini: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  weatherMiniHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  weatherMiniLabel: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 11,
    fontWeight: '700',
  },
  weatherMiniIcon: {
    fontSize: 17,
    lineHeight: 20,
  },
  weatherMiniTemp: {
    fontFamily: type.serif,
    fontSize: 26,
  },
  map: {
    height: 220,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nativeMap: {
    ...StyleSheet.absoluteFillObject,
  },
  osmTileGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  osmTile: {
    width: '50%',
    height: '50%',
  },
  mapScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,28,18,0.24)',
  },
  mapLine: {
    position: 'absolute',
    height: 1,
    left: -20,
    right: -20,
    backgroundColor: 'rgba(207,160,85,0.18)',
  },
  mapLineOne: {
    top: 70,
    transform: [{ rotate: '-18deg' }],
  },
  mapLineTwo: {
    top: 145,
    transform: [{ rotate: '22deg' }],
  },
  mainPin: {
    position: 'absolute',
    left: '52%',
    top: '48%',
  },
  companionPin: {
    position: 'absolute',
  },
  personCard: {
    minHeight: 72,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  initials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '900',
  },
  personCopy: {
    flex: 1,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  explorerScreen: {
    gap: 18,
  },
  explorerHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  explorerHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerHeaderIconText: {
    fontFamily: type.display,
    fontSize: 19,
    lineHeight: 22,
  },
  explorerHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  explorerTitle: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 32,
  },
  explorerSubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
  },
  explorerIntro: {
    fontFamily: type.bodyMedium,
    fontSize: 14,
    lineHeight: 23,
  },
  explorerBlock: {
    gap: 12,
  },
  explorerBlockLabel: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 4,
  },
  explorerCompanionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  explorerCompanionCard: {
    width: '48%',
    minWidth: 148,
    minHeight: 74,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 10,
  },
  explorerLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    shadowColor: '#CFA055',
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  explorerCompanionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  explorerCompanionName: {
    fontFamily: type.bodyBold,
    fontSize: 13,
    lineHeight: 17,
  },
  explorerCompanionDistance: {
    fontFamily: type.serif,
    fontSize: 13,
    lineHeight: 16,
  },
  explorerCompanionPlace: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    lineHeight: 15,
  },
  explorerSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  explorerSectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  explorerSectionBullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  explorerSectionCopy: {
    flex: 1,
    minWidth: 0,
  },
  explorerSectionTitle: {
    fontFamily: type.bodyBold,
    fontSize: 15,
    lineHeight: 19,
  },
  explorerSectionSubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 14,
  },
  explorerCountPill: {
    minWidth: 26,
    height: 18,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(207,160,85,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  explorerCountText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
  },
  explorerChevron: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 16,
  },
  explorerActivityList: {
    gap: 10,
  },
  explorerActivityCard: {
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  explorerActivityDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowColor: '#CFA055',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  explorerActivityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  explorerActivityTitle: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    lineHeight: 18,
  },
  explorerActivityDescription: {
    fontFamily: type.bodyMedium,
    fontSize: 11.5,
    lineHeight: 16,
  },
  explorerActivityDistance: {
    fontFamily: type.serif,
    fontSize: 18,
    lineHeight: 22,
  },
  explorerSheetDescription: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  spotCard: {
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  distance: {
    fontFamily: type.serif,
    fontSize: 22,
  },
  currencyLayerScreen: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: '#041E0C',
  },
  currencyLayerTop: {
    height: 166,
    paddingHorizontal: 24,
    paddingTop: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  currencyMascotPeek: {
    position: 'absolute',
    width: 92,
    height: 81,
    bottom: -49,
    left: '50%',
    marginLeft: -46,
  },
  currencyLayerSheet: {
    flex: 1,
    minHeight: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 14,
  },
  currencyConverterCard: {
    zIndex: 20,
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    marginTop: 18,
    position: 'relative',
  },
  currencyRow: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.58)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  currencyRowLabel: {
    fontFamily: type.body,
    fontSize: 10,
    color: '#C8D0C9',
  },
  currencyRowValue: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 24,
    color: '#CFA055',
  },
  currencyCodeWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyAmountInput: {
    minWidth: 72,
    padding: 0,
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 20,
    lineHeight: 24,
    color: '#CFA055',
    textAlign: 'right',
  },
  currencySwap: {
    zIndex: 2,
    alignSelf: 'center',
    width: 39,
    height: 39,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CFA055',
    backgroundColor: '#0A2C1B',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -7,
  },
  currencyRateText: {
    fontFamily: type.body,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#C8D0C9',
    textAlign: 'center',
    marginTop: 12,
  },
  currencyDropdown: {
    position: 'absolute',
    zIndex: 50,
    top: 151,
    left: 20,
    right: 20,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.26)',
    backgroundColor: '#164A31',
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 12,
  },
  currencyDropdownItem: {
    minHeight: 35,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  currencyDropdownItemActive: {
    backgroundColor: '#0A2C1B',
  },
  currencyDropdownText: {
    fontFamily: type.bodyMedium,
    fontSize: 9.5,
    color: '#F0EEE7',
  },
  currencyQuickCard: {
    zIndex: 1,
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 11,
    marginTop: 18,
  },
  currencyQuickTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 7.5,
    letterSpacing: 2,
    color: '#CFA055',
    marginBottom: 10,
  },
  currencyQuickRow: {
    minHeight: 59,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 10,
  },
  currencyQuickDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#CFA055',
    shadowColor: '#CFA055',
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  currencyQuickCopy: {
    flex: 1,
    minWidth: 0,
  },
  currencyQuickLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    lineHeight: 13,
    color: '#F0EEE7',
  },
  currencyQuickMad: {
    fontFamily: type.body,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#9BAA9F',
  },
  currencyQuickValue: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 15,
    color: '#CFA055',
  },
  currencyAttribution: {
    fontFamily: type.body,
    fontSize: 6.5,
    lineHeight: 9,
    color: '#71877A',
    textAlign: 'center',
  },
  converter: {
    gap: spacing.sm,
  },
  currencyLabel: {
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  currencyInput: {
    fontFamily: type.serif,
    fontSize: 52,
    minHeight: 70,
  },
  convertDivider: {
    minHeight: 48,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertIcon: {
    fontSize: 22,
  },
  currencyOutput: {
    fontFamily: type.serif,
    fontSize: 52,
  },
  rate: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 18,
  },
  emergencyCard: {
    gap: spacing.sm,
  },
  emergencyRow: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  alertCard: {
    borderWidth: 1,
  },
  driverCard: {
    gap: spacing.md,
  },
  driverHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitial: {
    fontFamily: type.body,
    fontSize: 13,
    fontWeight: '900',
  },
  chatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  messagesScreen: {
    gap: 12,
  },
  messageThreadCard: {
    minHeight: 68,
    borderRadius: 10,
    borderWidth: 1,
    padding: spacing.md,
  },
  messageConversationCard: {
    gap: spacing.md,
  },
  messageConversationHead: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  messageConversationTitle: {
    fontFamily: type.serif,
    fontSize: 24,
    lineHeight: 28,
  },
  messageLivePill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageLiveText: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  messageList: {
    gap: 11,
  },
  messageRow: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  messageAvatarText: {
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  messageBubble: {
    flex: 1,
    minHeight: 66,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    gap: 7,
  },
  messageBubbleMine: {
    borderLeftWidth: 3,
  },
  messageBubbleSoly: {
    borderLeftWidth: 3,
  },
  messageBubbleMetaRow: {
    minHeight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  messageSender: {
    flex: 1,
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  messageBubbleText: {
    fontFamily: type.bodyBold,
    fontSize: 13.5,
    lineHeight: 20,
  },
  messageBubbleTime: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 13,
  },
  messageLegacyHidden: {
    display: 'none',
  },
  messageInputRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: type.bodyMedium,
    fontSize: 13,
  },
  messageSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '900',
  },
  tierHero: {
    gap: spacing.sm,
  },
  tierName: {
    fontFamily: type.serif,
    fontSize: 46,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    width: '68%',
    height: '100%',
  },
  toggleRow: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggle: {
    fontFamily: type.body,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  confirmModal: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 392 : undefined,
    maxHeight: '86%',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontFamily: type.serif,
    fontSize: 28,
  },
  accountModernRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  accountModernSheet: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 8,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  accountModernHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountModernTitle: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 34,
    color: '#F2EEE5',
  },
  accountModernContent: {
    flex: 1,
    paddingTop: 18,
  },
  accountModernHero: {
    minHeight: 171,
    borderRadius: 14,
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 13,
  },
  accountModernHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountModernSince: {
    fontFamily: type.bodyMedium,
    fontSize: 6.5,
    letterSpacing: 1.4,
    color: '#CFA055',
  },
  accountModernTierBadge: {
    minHeight: 21,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CFA055',
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountModernTierText: {
    fontFamily: type.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.3,
    color: '#CFA055',
  },
  accountModernName: {
    fontFamily: type.serif,
    fontSize: 21,
    lineHeight: 26,
    color: '#F2EEE5',
    marginTop: 7,
  },
  accountModernClient: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 1,
    color: '#B1BDB4',
    marginTop: 3,
  },
  accountModernProgressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },
  accountModernProgressLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.2,
    color: '#CFA055',
  },
  accountModernProgressValue: {
    fontFamily: type.body,
    fontSize: 8,
    letterSpacing: 1,
    color: '#F0EEE7',
  },
  accountModernProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#294C38',
    overflow: 'hidden',
    marginTop: 11,
  },
  accountModernProgressFill: {
    width: '42%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#CFA055',
  },
  accountModernProgressNote: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 10,
    lineHeight: 13,
    color: '#CFA055',
    textAlign: 'center',
    marginTop: 11,
  },
  accountModernMenu: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 10,
    marginTop: 16,
  },
  accountModernMenuExpanded: {
    justifyContent: 'flex-start',
  },
  accountAdvantageExpanded: {
    flex: 1,
    minHeight: 0,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    backgroundColor: '#0A2C1B',
    overflow: 'hidden',
  },
  accountModernRow: {
    flex: 0,
    height: 54,
    minHeight: 54,
    maxHeight: 54,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    backgroundColor: '#0A2C1B',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accountModernRowActive: {
    borderColor: '#CFA055',
    backgroundColor: '#123822',
  },
  accountModernRowExpanded: {
    flex: 0,
    height: 54,
    maxHeight: 54,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: '#0A2C1B',
  },
  accountModernRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountModernRowTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    color: '#F2EEE5',
  },
  accountModernRowSubtitle: {
    fontFamily: type.body,
    fontSize: 7.5,
    lineHeight: 11,
    color: '#A7B5AB',
  },
  accountTierList: {
    flex: 1,
    minHeight: 0,
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 11,
  },
  accountTierCardModern: {
    flex: 1,
    minHeight: 62,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: '#173824',
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  accountTierCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountTierCardName: {
    fontFamily: type.bodyMedium,
    fontSize: 12,
    lineHeight: 15,
  },
  accountTierCurrentBadge: {
    minHeight: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    backgroundColor: 'rgba(207,160,85,0.16)',
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTierCurrentText: {
    fontFamily: type.bodyMedium,
    fontSize: 6.5,
    letterSpacing: 1.4,
    color: '#CFA055',
  },
  accountTierCardDescription: {
    fontFamily: type.body,
    fontSize: 8,
    lineHeight: 11,
    color: '#F0EEE7',
    marginTop: 4,
  },
  accountTierCardNote: {
    fontFamily: type.body,
    fontSize: 7.5,
    lineHeight: 10,
    color: '#A9B6AD',
    marginTop: 2,
  },
  accountPersonalList: {
    flex: 1,
    minHeight: 0,
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 12,
  },
  accountPersonalCard: {
    flex: 1,
    minHeight: 58,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    backgroundColor: '#173824',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accountPersonalDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#E6B85F',
    shadowColor: '#E6B85F',
    shadowOpacity: 0.8,
    shadowRadius: 7,
    elevation: 5,
  },
  accountPersonalCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountPersonalLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: '#F2EEE5',
  },
  accountPersonalDetail: {
    fontFamily: type.body,
    fontSize: 10,
    lineHeight: 14,
    color: '#A9B6AD',
  },
  accountPersonalMarker: {
    fontFamily: type.bodyMedium,
    fontSize: 15,
    color: '#CFA055',
  },
  accountPaymentContent: {
    flex: 1,
    minHeight: 0,
    gap: 20,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 14,
  },
  accountPaymentExpanded: {
    flex: 0,
    height: 224,
  },
  accountPrivacyExpanded: {
    flex: 0,
    height: 218,
  },
  accountModernPaymentCard: {
    minHeight: 78,
    borderRadius: 14,
    backgroundColor: '#203F2C',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  accountPaymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#31513B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPaymentCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountPaymentName: {
    fontFamily: type.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: '#F2EEE5',
  },
  accountPaymentExpiry: {
    fontFamily: type.body,
    fontSize: 12,
    lineHeight: 17,
    color: '#A9B6AD',
  },
  accountVisaBadge: {
    minWidth: 53,
    height: 25,
    borderRadius: 5,
    backgroundColor: '#2029A8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountVisaText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: '#FFFFFF',
  },
  accountModernPaymentRemove: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(220,225,216,0.18)',
    backgroundColor: 'rgba(220,225,216,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPaymentConfirmActions: {
    flex: 1.7,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountPaymentCancel: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D1CB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPaymentCancelText: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    letterSpacing: 1,
    color: '#F2EEE5',
  },
  accountPaymentDelete: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    backgroundColor: '#B84137',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountPaymentDeleteText: {
    fontFamily: type.bodyMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  accountAddPayment: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.70)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  accountAddPaymentText: {
    fontFamily: type.bodyMedium,
    fontSize: 14,
    color: '#CFA055',
  },
  accountPrivacyList: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 12,
  },
  accountPrivacyModernCard: {
    flex: 1,
    minHeight: 62,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    backgroundColor: '#173824',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accountPrivacyModernTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    color: '#F2EEE5',
  },
  accountPrivacyModernDetail: {
    fontFamily: type.body,
    fontSize: 9.5,
    lineHeight: 14,
    color: '#A9B6AD',
  },
  accountPrivacySwitch: {
    width: 59,
    height: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.48)',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  accountPrivacySwitchOn: {
    borderColor: 'rgba(207,160,85,0.70)',
  },
  accountPrivacyKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#66736B',
  },
  accountPrivacyKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#D7A64F',
  },
  paymentEntryOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'flex-end',
  },
  paymentEntryBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  paymentEntrySheet: {
    height: '94%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 27,
    paddingTop: 14,
    paddingBottom: 10,
    overflow: 'hidden',
  },
  paymentEntryHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentEntryTitle: {
    fontFamily: type.serif,
    fontSize: 31,
    lineHeight: 38,
    color: '#F2EEE5',
  },
  paymentEntryContent: {
    paddingTop: 21,
    paddingBottom: 14,
    gap: 17,
  },
  paymentEntryIntro: {
    fontFamily: type.body,
    fontSize: 11.5,
    lineHeight: 20,
    color: '#B8C2BA',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  paymentEntryIntroStrong: {
    fontFamily: type.bodyBold,
    color: '#D9DED9',
  },
  paymentMethodTabs: {
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    backgroundColor: '#23462F',
    padding: 5,
    flexDirection: 'row',
  },
  paymentMethodTab: {
    flex: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodTabActive: {
    backgroundColor: '#56653E',
  },
  paymentMethodText: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    color: '#D3D8D3',
  },
  paymentField: {
    gap: 6,
  },
  paymentFieldLabel: {
    fontFamily: type.bodyMedium,
    fontSize: 8.5,
    letterSpacing: 1.5,
    color: '#CFA055',
  },
  paymentFieldInput: {
    height: 49,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.17)',
    backgroundColor: '#0D2F20',
    paddingHorizontal: 13,
    fontFamily: type.body,
    fontSize: 13,
    color: '#F2EEE5',
  },
  paymentEntrySave: {
    height: 53,
    borderRadius: 10,
    backgroundColor: '#D5A452',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentEntrySaveText: {
    fontFamily: type.bodyMedium,
    fontSize: 11,
    letterSpacing: 2.3,
    color: '#092718',
  },
  paymentEntrySecurity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paymentEntrySecurityText: {
    fontFamily: type.body,
    fontSize: 9,
    color: '#A9B6AD',
  },
  inviteGuestOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  inviteGuestSheet: {
    minHeight: 470,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 27,
    paddingTop: 14,
    paddingBottom: 25,
    overflow: 'hidden',
  },
  inviteGuestHeader: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteGuestTitle: {
    fontFamily: type.serif,
    fontSize: 30,
    lineHeight: 37,
    color: '#F2EEE5',
  },
  inviteGuestIntro: {
    fontFamily: type.body,
    fontSize: 12.5,
    lineHeight: 21,
    color: '#E0E4DF',
    textAlign: 'center',
    marginTop: 21,
    marginBottom: 20,
  },
  inviteLinkCard: {
    height: 55,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.38)',
    backgroundColor: '#0D2F20',
    paddingLeft: 13,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inviteLinkText: {
    flex: 1,
    minWidth: 0,
    fontFamily: type.body,
    fontSize: 11,
    color: '#CFA055',
  },
  inviteCopyButton: {
    minWidth: 78,
    height: 31,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.62)',
    backgroundColor: '#344C2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCopyText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#CFA055',
  },
  inviteChannels: {
    height: 68,
    flexDirection: 'row',
    gap: 9,
    marginTop: 20,
  },
  inviteChannelButton: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    backgroundColor: '#0D2F20',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  inviteChannelText: {
    fontFamily: type.body,
    fontSize: 9.5,
    color: '#F2EEE5',
  },
  inviteGuestNote: {
    minHeight: 78,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.24)',
    backgroundColor: '#214D33',
    paddingHorizontal: 14,
    paddingVertical: 11,
    justifyContent: 'center',
    marginTop: 21,
  },
  inviteGuestNoteText: {
    fontFamily: 'EBGaramond_400Regular_Italic',
    fontSize: 12,
    lineHeight: 17,
    color: '#D6D8CB',
  },
  accountModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  accountBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  accountSheet: {
    width: '92%',
    maxWidth: Platform.OS === 'web' ? 392 : undefined,
    height: Platform.OS === 'web' ? '88%' : '86%',
    marginBottom: Platform.OS === 'web' ? 14 : 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    backgroundColor: '#0D2F21',
  },
  accountHandle: {
    position: 'absolute',
    top: 11,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(207,160,85,0.24)',
    zIndex: 2,
  },
  accountHeader: {
    minHeight: 80,
    paddingTop: 25,
    paddingHorizontal: 22,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(207,160,85,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#173F2B',
  },
  accountHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHeaderIconText: {
    fontFamily: type.display,
    fontSize: 22,
    color: '#CFA055',
  },
  accountHeaderCopy: {
    flex: 1,
  },
  accountTitle: {
    fontFamily: type.serif,
    fontSize: 24,
    lineHeight: 27,
    color: '#CFA055',
  },
  accountSubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 1.2,
    color: 'rgba(244,239,228,0.84)',
  },
  accountClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountCloseText: {
    fontFamily: type.body,
    fontSize: 18,
    lineHeight: 20,
    color: '#D8CDAF',
  },
  accountScroll: {
    flex: 1,
    backgroundColor: '#0D2F21',
  },
  accountContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'web' ? 44 : 96,
    gap: 20,
  },
  accountHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    backgroundColor: 'rgba(207,160,85,0.08)',
    padding: 18,
    gap: 8,
  },
  accountHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  accountHeroTier: {
    fontFamily: type.serif,
    fontSize: 15,
    letterSpacing: 6,
    color: '#CFA055',
  },
  accountHeroSince: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(244,239,228,0.68)',
  },
  accountHeroName: {
    marginTop: 8,
    fontFamily: type.serif,
    fontSize: 21,
    lineHeight: 25,
    color: '#F4EFE4',
  },
  accountClientId: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    color: 'rgba(244,239,228,0.70)',
  },
  accountInnerCard: {
    marginTop: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(244,239,228,0.16)',
    backgroundColor: 'rgba(244,239,228,0.06)',
    padding: 16,
    gap: 8,
  },
  accountInnerTier: {
    fontFamily: type.serif,
    fontSize: 17,
    textAlign: 'center',
    letterSpacing: 6,
    color: '#CFA055',
  },
  accountInnerTagline: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1.5,
    color: 'rgba(244,239,228,0.72)',
  },
  accountProgressLabels: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountProgressLabel: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#CFA055',
  },
  accountProgressMiddle: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    color: '#F4EFE4',
  },
  accountProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(244,239,228,0.14)',
    overflow: 'hidden',
  },
  accountProgressFill: {
    width: '42%',
    height: '100%',
    backgroundColor: '#CFA055',
  },
  accountSectionBlock: {
    gap: 12,
  },
  accountSectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountSectionTitle: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 4,
    color: '#D4A84F',
  },
  accountSectionChevron: {
    fontFamily: type.bodyBold,
    fontSize: 14,
    color: '#D4A84F',
  },
  accountSectionContent: {
    gap: 10,
  },
  accountAdvantageCard: {
    minHeight: 72,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.12)',
    backgroundColor: 'rgba(244,239,228,0.035)',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountAdvantageCardActive: {
    borderColor: '#D4A84F',
    backgroundColor: 'rgba(207,160,85,0.06)',
  },
  accountTierBadge: {
    width: 90,
    minHeight: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(207,160,85,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTierBadgeActive: {
    backgroundColor: '#A66E43',
  },
  accountTierBadgeText: {
    fontFamily: type.serif,
    fontSize: 13,
    letterSpacing: 1.4,
    color: '#F4EFE4',
  },
  accountAdvantageCopy: {
    flex: 1,
    gap: 3,
  },
  accountAdvantageDescription: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(244,239,228,0.78)',
  },
  accountAdvantageNote: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 14,
    fontStyle: 'italic',
    color: 'rgba(244,239,228,0.48)',
  },
  accountAdvantageNoteActive: {
    color: '#CFA055',
  },
  accountInfoCard: {
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.16)',
    backgroundColor: 'rgba(244,239,228,0.04)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountInfoGlow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CFA055',
    shadowColor: '#CFA055',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  accountInfoCopy: {
    flex: 1,
    gap: 3,
  },
  accountInfoLabel: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: '#F4EFE4',
  },
  accountInfoDetail: {
    fontFamily: type.bodyMedium,
    fontSize: 10.5,
    lineHeight: 15,
    color: 'rgba(244,239,228,0.70)',
  },
  accountInfoMarker: {
    minWidth: 20,
    textAlign: 'right',
    fontFamily: type.serif,
    fontSize: 13,
    color: '#CFA055',
  },
  accountPaymentCard: {
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.16)',
    backgroundColor: 'rgba(244,239,228,0.04)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  accountPaymentBrand: {
    marginLeft: 'auto',
    fontFamily: type.serif,
    fontSize: 12,
    letterSpacing: 1.6,
    color: '#CFA055',
  },
  accountPaymentRemove: {
    fontFamily: type.body,
    fontSize: 14,
    color: '#B46247',
  },
  accountDashedButton: {
    minHeight: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(207,160,85,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountDashedButtonText: {
    fontFamily: type.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: '#CFA055',
  },
  accountPrivacyCard: {
    minHeight: 64,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.16)',
    backgroundColor: 'rgba(244,239,228,0.04)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountWarningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F39A3D',
    shadowColor: '#F39A3D',
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  accountSwitch: {
    width: 37,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(244,239,228,0.18)',
    backgroundColor: 'rgba(244,239,228,0.08)',
    padding: 2,
    justifyContent: 'center',
  },
  accountSwitchOn: {
    borderColor: '#D4A84F',
    backgroundColor: 'rgba(207,160,85,0.42)',
  },
  accountSwitchKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(244,239,228,0.80)',
  },
  accountSwitchKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#CFA055',
  },
  accountGuestCard: {
    minHeight: 56,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.14)',
    backgroundColor: 'rgba(244,239,228,0.04)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  accountGuestCardOwner: {
    borderColor: '#D4A84F',
  },
  accountGuestInitial: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.20)',
    backgroundColor: 'rgba(207,160,85,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountGuestInitialOwner: {
    backgroundColor: '#C49A45',
  },
  accountGuestInitialText: {
    fontFamily: type.serif,
    fontSize: 14,
    color: '#F4EFE4',
  },
  accountGuestCopy: {
    flex: 1,
  },
  accountGuestName: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    color: '#F4EFE4',
  },
  accountGuestRole: {
    fontFamily: type.bodyBold,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 1.2,
    color: 'rgba(244,239,228,0.58)',
  },
  accountGuestRoleOwner: {
    color: '#CFA055',
  },
  accountGuestStatus: {
    maxWidth: 86,
    fontFamily: type.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: 'right',
  },
  accountGuestOnline: {
    color: '#7EEA7A',
  },
  accountGuestOffline: {
    color: '#E6B44C',
  },
  accountGuestFootnote: {
    fontFamily: type.display,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    fontStyle: 'italic',
    color: 'rgba(244,239,228,0.62)',
  },
  arrivalModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  formalitiesModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  formalitiesSheet: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#164A31',
    paddingHorizontal: 21,
    paddingTop: 10,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  formalitiesHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formalitiesTitle: {
    fontFamily: type.serif,
    fontSize: 28,
    lineHeight: 34,
    color: '#F2EEE5',
  },
  formalitiesIntro: {
    fontFamily: type.body,
    fontSize: 11,
    lineHeight: 18,
    color: '#B8C2BA',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 15,
    paddingHorizontal: 8,
  },
  formalitiesAlert: {
    minHeight: 70,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.34)',
    backgroundColor: '#0D2F20',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formalitiesAlertIcon: {
    width: 39,
    height: 39,
    borderRadius: 10,
    backgroundColor: 'rgba(207,160,85,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formalitiesAlertCopy: {
    flex: 1,
  },
  formalitiesAlertTitle: {
    fontFamily: type.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: '#F2EEE5',
  },
  formalitiesAlertText: {
    fontFamily: type.body,
    fontSize: 9.5,
    lineHeight: 14,
    color: '#CFA055',
  },
  formalitiesScroll: {
    flex: 1,
    marginTop: 14,
  },
  formalitiesList: {
    gap: 12,
    paddingBottom: 20,
  },
  formalitiesCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.28)',
    backgroundColor: '#0D2F20',
    padding: 14,
    gap: 10,
  },
  formalitiesCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formalitiesName: {
    fontFamily: type.serif,
    fontSize: 19,
    lineHeight: 24,
    color: '#F2EEE5',
  },
  formalitiesStatus: {
    minHeight: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.45)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formalitiesStatusComplete: {
    borderColor: 'rgba(84,215,134,0.50)',
    backgroundColor: 'rgba(84,215,134,0.10)',
  },
  formalitiesStatusText: {
    fontFamily: type.bodyMedium,
    fontSize: 7,
    letterSpacing: 1.1,
    color: '#CFA055',
  },
  formalitiesStatusTextComplete: {
    color: '#54D786',
  },
  formalitiesDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  formalitiesDetail: {
    flex: 1,
    fontFamily: type.body,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#B8C2BA',
  },
  formalitiesUpdate: {
    minHeight: 42,
    borderRadius: 9,
    backgroundColor: '#D5A452',
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 3,
  },
  formalitiesUpdateText: {
    fontFamily: type.bodyMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#082718',
  },
  arrivalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  arrivalSheet: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 392 : undefined,
    height: '92%',
    marginBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    backgroundColor: '#164A31',
  },
  arrivalHandle: {
    position: 'absolute',
    top: 11,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F0E9DB',
    zIndex: 2,
  },
  arrivalHeader: {
    minHeight: 82,
    paddingTop: 26,
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#164A31',
  },
  arrivalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalHeaderIconText: {
    fontFamily: type.display,
    fontSize: 21,
    color: '#F2EEE5',
  },
  arrivalHeaderCopy: {
    flex: 1,
  },
  arrivalTitle: {
    fontFamily: type.serif,
    fontSize: 24,
    lineHeight: 27,
    color: '#CFA055',
  },
  arrivalSubtitle: {
    fontFamily: type.bodyBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.3,
    color: 'rgba(244,239,228,0.86)',
  },
  arrivalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalCloseText: {
    fontFamily: type.body,
    fontSize: 18,
    lineHeight: 20,
    color: '#D8CDAF',
  },
  arrivalScroll: {
    flex: 1,
    backgroundColor: '#164A31',
  },
  arrivalContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'web' ? 46 : 96,
    gap: 14,
  },
  arrivalIntro: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 2,
    gap: 8,
  },
  arrivalEyebrow: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 0.6,
    color: '#A57924',
  },
  arrivalIntroTitle: {
    fontFamily: type.serif,
    fontSize: 29,
    lineHeight: 35,
    color: '#F2EEE5',
  },
  arrivalIntroAccent: {
    color: '#B9903D',
    fontStyle: 'italic',
  },
  arrivalIntroText: {
    maxWidth: 245,
    fontFamily: type.display,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#A9B6AD',
  },
  arrivalOption: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    backgroundColor: '#0D2F20',
    padding: 16,
    gap: 15,
  },
  arrivalOptionActive: {
    borderColor: '#B68B35',
    borderLeftWidth: 4,
    paddingLeft: 13,
  },
  arrivalOptionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  arrivalOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#B68B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalOptionIconActive: {
    backgroundColor: 'rgba(207,160,85,0.08)',
  },
  arrivalOptionIconText: {
    fontFamily: type.display,
    fontSize: 22,
    color: '#A57924',
  },
  arrivalOptionCopy: {
    flex: 1,
    gap: 2,
  },
  arrivalOptionTitle: {
    fontFamily: type.serif,
    fontSize: 21,
    lineHeight: 25,
    color: '#F2EEE5',
  },
  arrivalOptionSubtitle: {
    maxWidth: 180,
    fontFamily: type.bodyBold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 3,
    color: '#A9B6AD',
  },
  arrivalExpanded: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(207,160,85,0.25)',
    paddingTop: 14,
    gap: 14,
  },
  arrivalField: {
    gap: 6,
  },
  arrivalFieldLabel: {
    fontFamily: type.bodyBold,
    fontSize: 9,
    letterSpacing: 4,
    color: '#CFA055',
  },
  arrivalSelectRow: {
    minHeight: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(207,160,85,0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  arrivalFieldValue: {
    flex: 1,
    fontFamily: type.serif,
    fontSize: 16,
    lineHeight: 22,
    color: '#F2EEE5',
  },
  arrivalSelectChevron: {
    fontFamily: type.bodyBold,
    fontSize: 15,
    color: '#B68B35',
  },
  arrivalTextInput: {
    minHeight: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(207,160,85,0.30)',
    padding: 0,
    fontFamily: type.serif,
    fontSize: 17,
    color: '#F2EEE5',
  },
  arrivalMiniPanel: {
    minHeight: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.30)',
    backgroundColor: '#173824',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  arrivalMiniField: {
    flex: 1,
    gap: 6,
  },
  arrivalMiniValue: {
    minHeight: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(207,160,85,0.30)',
    padding: 0,
    fontFamily: type.serif,
    fontSize: 17,
    color: '#F2EEE5',
  },
  arrivalClock: {
    marginBottom: 8,
    fontFamily: type.display,
    fontSize: 16,
    color: '#B68B35',
  },
  trainDropdown: {
    borderWidth: 1,
    borderColor: '#9E895F',
    backgroundColor: '#173824',
  },
  trainOption: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  trainOptionActive: {
    backgroundColor: '#2368D8',
  },
  trainOptionText: {
    fontFamily: type.body,
    fontSize: 12,
    color: '#F2EEE5',
  },
  trainOptionTextActive: {
    color: '#FFFFFF',
  },
  arrivalCarNote: {
    fontFamily: type.display,
    fontSize: 14,
    lineHeight: 21,
    fontStyle: 'italic',
    color: '#A9B6AD',
  },
  arrivalFootnote: {
    paddingHorizontal: 10,
    fontFamily: type.display,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#B8C2BA',
  },
  arrivalConfirm: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#D5A452',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    shadowColor: '#6E4D17',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  arrivalConfirmText: {
    fontFamily: type.bodyBold,
    fontSize: 12,
    letterSpacing: 3,
    color: '#082718',
  },
});
