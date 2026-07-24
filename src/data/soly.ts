import type { SceneName } from '../theme';

export type ModuleKey =
  | 'home'
  | 'stay'
  | 'butler'
  | 'weather'
  | 'companions'
  | 'explore'
  | 'currency'
  | 'sos'
  | 'arrival'
  | 'formalities'
  | 'driver'
  | 'chat'
  | 'account';

export type ModuleItem = {
  key: ModuleKey;
  label: string;
  kicker: string;
  icon: string;
  scene: SceneName;
};

export const modules: ModuleItem[] = [
  { key: 'stay', label: 'Mon Séjour', kicker: 'Programme', icon: '01', scene: 'immersive' },
  { key: 'butler', label: 'SOLÝ', kicker: 'Demander', icon: '02', scene: 'immersive' },
  { key: 'weather', label: 'Atmosphère', kicker: 'Météo', icon: '03', scene: 'immersive' },
  { key: 'companions', label: 'Vos Proches', kicker: 'Groupe', icon: '04', scene: 'immersive' },
  { key: 'explore', label: 'Explorer', kicker: 'Carte', icon: '05', scene: 'editorial' },
  { key: 'currency', label: 'Devises', kicker: 'EUR/MAD', icon: '06', scene: 'transactional' },
];

export const agendaDays = [
  {
    day: 'Jour 1',
    countdown: 'J-2',
    date: '21 mai',
    note: 'Arrivée orchestrée à Marrakech',
    items: [
      { time: '14:20', title: 'Accueil aéroport', place: 'RAK Terminal 1', provider: 'Youssef', status: 'À venir' },
      { time: '16:00', title: 'Installation au riad', place: 'Kasbah', provider: 'Amal', status: 'À venir' },
      { time: '20:30', title: 'Dîner confidentiel', place: 'Médina', provider: 'SOLÝ Tables', status: 'À venir' },
    ],
  },
  {
    day: 'Jour 2',
    countdown: 'J-1',
    date: '22 mai',
    note: 'Jardin, hammam, terrasse au couchant',
    items: [
      { time: '10:15', title: 'Jardin Majorelle', place: 'Rue Yves Saint Laurent', provider: 'Guide privé', status: 'À venir' },
      { time: '15:00', title: 'Hammam signature', place: 'Spa privé', provider: 'Noura', status: 'À venir' },
      { time: '19:10', title: 'Aperitif rooftop', place: 'Hivernage', provider: 'Chauffeur inclus', status: 'À venir' },
    ],
  },
  {
    day: 'Jour 3',
    countdown: 'Départ',
    date: '23 mai',
    note: 'Départ souple selon votre rythme',
    items: [
      { time: '09:30', title: 'Petit-déjeuner prolongé', place: 'Patio privé', provider: 'Riad', status: 'À venir' },
      { time: '12:45', title: 'Transfert aéroport', place: 'Kasbah vers RAK', provider: 'Youssef', status: 'À venir' },
    ],
  },
];

export const weatherDays = [
  { label: "Aujourd'hui", temp: '28°', range: '18° / 31°', wind: '11 km/h', sunset: '20:24', condition: 'Ciel clair', note: 'Conditions parfaites pour Agafay en fin de journée.' },
  { label: 'Demain', temp: '30°', range: '19° / 33°', wind: '9 km/h', sunset: '20:25', condition: 'Lumière sèche', note: 'Prévoir un départ tôt pour profiter de la médina.' },
  { label: 'Départ', temp: '27°', range: '17° / 29°', wind: '14 km/h', sunset: '20:25', condition: 'Brise douce', note: 'Matinée idéale pour un dernier café en terrasse.' },
];

export const companions = [
  { name: 'Camille', initials: 'CA', status: 'en ligne', permissions: 'Programme, chauffeur, demandes', coords: { x: '28%', y: '42%' } },
  { name: 'Nassim', initials: 'NA', status: 'hors ligne', permissions: 'Programme, dépenses', coords: { x: '62%', y: '36%' } },
  { name: 'Elena', initials: 'EL', status: 'en ligne', permissions: 'Programme, documents', coords: { x: '48%', y: '64%' } },
];

export const spots = [
  { title: 'Maison Arabe', category: 'Table feutrée', distance: '7 min', eta: '14 min à pied' },
  { title: 'Dar El Bacha', category: 'Pause culturelle', distance: '11 min', eta: '6 min chauffeur' },
  { title: 'Atelier Akkal', category: 'Céramique', distance: '18 min', eta: '12 min chauffeur' },
];

export const conversations = [
  { title: 'Chauffeur', subtitle: 'Youssef répond en général en moins de 2 min', unread: '2' },
  { title: 'Groupe', subtitle: 'Camille, Nassim, Elena', unread: '1' },
  { title: 'Camille', subtitle: 'Conversation privée', unread: '' },
];

export const loyaltyTiers = [
  { tier: 'Voyageur', access: '1 sollicitation/jour', advantage: 'Adresses choisies' },
  { tier: 'Habitué', access: '2 sollicitations/jour', advantage: 'Reconnaissance + attentions' },
  { tier: 'Hôte', access: '9h-20h', advantage: 'Adresses confidentielles' },
  { tier: 'Ambassadeur', access: '24h/24', advantage: 'Expériences exclusives' },
];
