import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  loadSolyDriverDashboard,
  replyToSolyConciergeRequest,
  type SolyConciergeRequest,
  type SolyDriverDashboard,
  type SolyDriverStay,
  type SolyUser,
} from '../api/solyApi';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

type Tab = 'missions' | 'messages' | 'profile';
type Props = { token: string; user: SolyUser; onLogout: () => Promise<void> };

const emptyDashboard: SolyDriverDashboard = { provider: { id: 0, code: '', name: '', phone: '' }, stays: [], requests: [], updatedAt: '' };

export function DriverPortal({ token, user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>('missions');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedStay, setSelectedStay] = useState<SolyDriverStay | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<SolyConciergeRequest | null>(null);
  const unread = useUnreadMessages('driver');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const result = await loadSolyDriverDashboard(token);
      setDashboard(result);
      setSelectedRequest((current) => current ? result.requests.find((item) => item.id === current.id) ?? current : null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos missions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load(true);
    const timer = setInterval(() => void load(true), 20000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <SafeAreaProvider>
      <LinearGradient colors={['#031B0D', '#0B3421', '#041C10']} style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#031B0D" />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>ESPACE CHAUFFEUR</Text>
              <Text style={styles.title}>Bonjour, {firstName(user.name)}</Text>
              <Text style={styles.subtitle}>{dashboard.provider.name || user.provider?.name || 'Prestataire Transport SOLÝ'}</Text>
            </View>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user.name)}</Text><View style={styles.online} /></View>
          </View>

          <View style={styles.summary}>
            <Summary icon="luggage" value={dashboard.stays.length} label="Missions" />
            <Summary icon="forum" value={dashboard.requests.length} label="Conversations" />
            <Summary icon="notifications-active" value={unread.countUnread(dashboard.requests)} label="Non lus" />
          </View>

          {error ? <View style={styles.error}><MaterialIcons name="error-outline" size={18} color="#F0B4A9" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></TouchableOpacity></View> : null}

          <View style={styles.shell}>
            <View style={styles.shellHeader}>
              <View><Text style={styles.sectionEyebrow}>{tab === 'missions' ? 'FEUILLE DE ROUTE' : tab === 'messages' ? 'ÉCHANGES CLIENTS' : 'COMPTE APP'}</Text><Text style={styles.sectionTitle}>{tab === 'missions' ? 'Mes séjours assignés' : tab === 'messages' ? 'Messages' : 'Mon profil chauffeur'}</Text></View>
              <TouchableOpacity onPress={() => void load()} style={styles.refresh}>{refreshing ? <ActivityIndicator size="small" color="#B78A38" /> : <MaterialIcons name="refresh" size={21} color="#B78A38" />}</TouchableOpacity>
            </View>
            {loading ? <View style={styles.loading}><ActivityIndicator color="#CFA055" /><Text style={styles.muted}>Synchronisation SOLÝ…</Text></View> : tab === 'missions' ? (
              <MissionList stays={dashboard.stays} refreshing={refreshing} onRefresh={() => void load()} onOpen={setSelectedStay} />
            ) : tab === 'messages' ? (
              <MessageList requests={dashboard.requests} refreshing={refreshing} onRefresh={() => void load()} countUnreadFor={unread.countUnreadFor} onOpen={(request) => { unread.markRequestSeen(request); setSelectedRequest(request); }} />
            ) : (
              <DriverProfile user={user} provider={dashboard.provider} updatedAt={dashboard.updatedAt} onLogout={onLogout} />
            )}
          </View>

          <View style={styles.nav}>
            <Nav icon="route" label="Missions" active={tab === 'missions'} onPress={() => setTab('missions')} />
            <Nav icon="forum" label="Messages" active={tab === 'messages'} badge={unread.countUnread(dashboard.requests)} onPress={() => setTab('messages')} />
            <Nav icon="badge" label="Profil" active={tab === 'profile'} onPress={() => setTab('profile')} />
          </View>

          <MissionDetails stay={selectedStay} onClose={() => setSelectedStay(null)} />
          <DriverChat token={token} request={selectedRequest} user={user} onClose={() => setSelectedRequest(null)} onUpdated={(updated) => {
            unread.markRequestSeen(updated);
            setSelectedRequest(updated);
            setDashboard((current) => ({ ...current, requests: current.requests.map((item) => item.id === updated.id ? updated : item) }));
          }} />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

function Summary({ icon, value, label }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; value: number; label: string }) {
  return <View style={styles.summaryCard}><MaterialIcons name={icon} size={18} color="#CFA055" /><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function MissionList({ stays, refreshing, onRefresh, onOpen }: { stays: SolyDriverStay[]; refreshing: boolean; onRefresh: () => void; onOpen: (stay: SolyDriverStay) => void }) {
  return <ScrollView style={styles.list} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CFA055" />}>
    {!stays.length ? <Empty icon="event-busy" title="Aucune mission assignée" copy="Vos prochains séjours apparaîtront ici après assignation par SOLÝ." /> : null}
    {stays.map((stay) => <TouchableOpacity key={stay.id} onPress={() => onOpen(stay)} activeOpacity={0.78} style={styles.card}>
      <View style={styles.cardTop}><View><Text style={styles.code}>{stay.code}</Text><Text style={styles.client}>{stay.client.name || 'Client SOLÝ'}</Text></View><View style={styles.status}><Text style={styles.statusText}>ASSIGNÉ</Text></View></View>
      <View style={styles.detailsRow}><Detail icon="calendar-today" label="DATES" value={`${date(stay.arrivalDate)} → ${date(stay.departureDate)}`} /><Detail icon="people-outline" label="VOYAGEURS" value={String(stay.guests)} /></View>
      <View style={styles.detailsRow}><Detail icon="location-on" label="DESTINATION" value={stay.city || 'À confirmer'} /><Detail icon="view-agenda" label="PROGRAMME" value={`${stay.days.length} jour(s)`} /></View>
      <View style={styles.cardFooter}><Text style={styles.open}>OUVRIR LA FEUILLE DE ROUTE</Text><MaterialIcons name="arrow-forward-ios" size={14} color="#B78A38" /></View>
    </TouchableOpacity>)}
  </ScrollView>;
}

function MessageList({ requests, refreshing, onRefresh, onOpen, countUnreadFor }: { requests: SolyConciergeRequest[]; refreshing: boolean; onRefresh: () => void; onOpen: (request: SolyConciergeRequest) => void; countUnreadFor: (request: SolyConciergeRequest) => number }) {
  return <ScrollView style={styles.list} contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CFA055" />}>
    {!requests.length ? <Empty icon="mark-chat-read" title="Aucun message" copy="Les conversations des séjours qui vous sont assignés apparaîtront ici." /> : null}
    {requests.map((request) => { const pending = countUnreadFor(request); const last = request.messages[request.messages.length - 1]; return <TouchableOpacity key={request.id} onPress={() => onOpen(request)} style={styles.card}>
      <View style={styles.cardTop}><View style={styles.messageIdentity}><Text style={styles.client}>{request.client.name || 'Client SOLÝ'}</Text><Text style={styles.meta}>{request.stayCode} · {request.slotLabel}</Text></View>{pending ? <View style={styles.badge}><Text style={styles.badgeText}>{pending}</Text></View> : null}</View>
      <Text numberOfLines={2} style={styles.messagePreview}>{last?.message || request.message}</Text><Text style={styles.open}>OUVRIR LE CHAT</Text>
    </TouchableOpacity>; })}
  </ScrollView>;
}

function MissionDetails({ stay, onClose }: { stay: SolyDriverStay | null; onClose: () => void }) {
  if (!stay) return null;
  return <Modal animationType="slide" visible onRequestClose={onClose}><LinearGradient colors={['#031B0D', '#0B3421']} style={styles.modalRoot}><SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
    <View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.close}><MaterialIcons name="arrow-back" size={21} color="#F1EBDD" /></TouchableOpacity><View><Text style={styles.modalEyebrow}>FEUILLE DE ROUTE</Text><Text style={styles.modalTitle}>{stay.code}</Text></View></View>
    <ScrollView contentContainerStyle={styles.modalContent}>
      <Section title="Client"><Line label="Nom" value={stay.client.name || 'Client SOLÝ'} /><Line label="Téléphone" value={stay.client.phone || 'Non renseigné'} /><Line label="Voyageurs" value={String(stay.guests)} /></Section>
      <View style={styles.quickActions}>{stay.client.phone ? <TouchableOpacity style={styles.quickButton} onPress={() => void Linking.openURL(`tel:${stay.client.phone}`)}><MaterialIcons name="phone" size={18} color="#082719" /><Text style={styles.quickText}>APPELER</Text></TouchableOpacity> : null}{stay.client.phone ? <TouchableOpacity style={styles.quickButton} onPress={() => void Linking.openURL(`https://wa.me/${stay.client.phone.replace(/\D/g, '')}`)}><MaterialIcons name="chat" size={18} color="#082719" /><Text style={styles.quickText}>WHATSAPP</Text></TouchableOpacity> : null}</View>
      <Section title="Séjour"><Line label="Destination" value={stay.city || 'À confirmer'} /><Line label="Arrivée" value={longDate(stay.arrivalDate)} /><Line label="Départ" value={longDate(stay.departureDate)} /><Line label="Mode d’arrivée" value={stay.arrivalMode || 'À confirmer'} /></Section>
      <Section title="Programme"><Line label="Jours disponibles" value={String(stay.days.length)} />{stay.days.map((day, index) => <Line key={index} label={`Jour ${index + 1}`} value={dayLabel(day)} />)}{!stay.days.length ? <Text style={styles.sectionEmpty}>Programme en cours de préparation par SOLÝ.</Text> : null}</Section>
    </ScrollView>
  </SafeAreaView></LinearGradient></Modal>;
}

function DriverChat({ token, request, user, onClose, onUpdated }: { token: string; request: SolyConciergeRequest | null; user: SolyUser; onClose: () => void; onUpdated: (request: SolyConciergeRequest) => void }) {
  const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [error, setError] = useState('');
  if (!request) return null;
  const send = async () => { const message = draft.trim(); if (!message || sending) return; setSending(true); setError(''); try { const updated = await replyToSolyConciergeRequest(token, request.id, message, { sender: 'driver', senderName: user.name }); setDraft(''); onUpdated(updated); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Message non envoyé.'); } finally { setSending(false); } };
  return <Modal animationType="slide" visible onRequestClose={onClose}><LinearGradient colors={['#031B0D', '#0B3421']} style={styles.modalRoot}><SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
    <View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.close}><MaterialIcons name="arrow-back" size={21} color="#F1EBDD" /></TouchableOpacity><View style={styles.messageIdentity}><Text style={styles.modalTitle}>{request.client.name || 'Client SOLÝ'}</Text><Text style={styles.modalEyebrow}>{request.stayCode} · CHAT CHAUFFEUR</Text></View></View>
    <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>{request.messages.map((message) => { const mine = message.sender === 'driver' && message.senderId === user.id; return <View key={message.id} style={[styles.chatRow, mine && styles.chatRowMine]}><View style={[styles.bubble, mine && styles.bubbleMine]}><Text style={[styles.author, mine && styles.authorMine]}>{mine ? 'VOUS' : message.senderName || (message.sender === 'staff' ? 'SOLÝ' : request.client.name)}</Text><Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.message}</Text></View></View>; })}</ScrollView>
    {error ? <Text style={styles.chatError}>{error}</Text> : null}<View style={styles.composer}><TextInput multiline maxLength={2000} value={draft} onChangeText={setDraft} placeholder="Écrire au client…" placeholderTextColor="#7E8F85" style={styles.input} /><TouchableOpacity disabled={!draft.trim() || sending} onPress={() => void send()} style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}>{sending ? <ActivityIndicator size="small" color="#082719" /> : <MaterialIcons name="send" size={21} color="#082719" />}</TouchableOpacity></View>
  </SafeAreaView></LinearGradient></Modal>;
}

function DriverProfile({ user, provider, updatedAt, onLogout }: { user: SolyUser; provider: SolyDriverDashboard['provider']; updatedAt: string; onLogout: () => Promise<void> }) {
  return <ScrollView style={styles.list} contentContainerStyle={styles.profile}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials(user.name)}</Text></View><Text style={styles.profileName}>{user.name}</Text><Text style={styles.profileRole}>CHAUFFEUR · PRESTATAIRE SOLÝ</Text><Section title="Accès"><Line label="Prestataire" value={provider.name || user.provider?.name || 'SOLÝ'} /><Line label="Code CRM" value={provider.code || user.provider?.code || '—'} /><Line label="Email" value={user.email} /><Line label="Synchronisation" value={updatedAt ? dateTime(updatedAt) : 'Temps réel'} /></Section><TouchableOpacity onPress={() => void onLogout()} style={styles.logout}><MaterialIcons name="logout" size={18} color="#A34D41" /><Text style={styles.logoutText}>SE DÉCONNECTER</Text></TouchableOpacity></ScrollView>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.section}><Text style={styles.sectionLabel}>{title}</Text>{children}</View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={styles.line}><Text style={styles.lineLabel}>{label}</Text><Text selectable style={styles.lineValue}>{value}</Text></View>; }
function Detail({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) { return <View style={styles.detail}><MaterialIcons name={icon} size={16} color="#B78A38" /><View style={styles.messageIdentity}><Text style={styles.detailLabel}>{label}</Text><Text numberOfLines={1} style={styles.detailValue}>{value}</Text></View></View>; }
function Nav({ icon, label, active, badge, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; active: boolean; badge?: number; onPress: () => void }) { return <TouchableOpacity onPress={onPress} style={styles.navButton}><View style={[styles.navIcon, active && styles.navIconActive]}><MaterialIcons name={icon} size={21} color={active ? '#CFA055' : '#6E7E75'} />{badge ? <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge > 9 ? '9+' : badge}</Text></View> : null}</View><Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text></TouchableOpacity>; }
function Empty({ icon, title, copy }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; copy: string }) { return <View style={styles.empty}><MaterialIcons name={icon} size={34} color="#B78A38" /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.muted}>{copy}</Text></View>; }
function firstName(value: string) { return value.trim().split(/\s+/)[0] || 'Chauffeur'; }
function initials(value: string) { return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SY'; }
function date(value: string) { const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value || '—' : parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
function longDate(value: string) { const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.getTime()) ? value || '—' : parsed.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function dateTime(value: string) { const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T')); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('fr-FR'); }
function dayLabel(day: Record<string, unknown>) { const label = day.label ?? day.title ?? day.date ?? day.day; return typeof label === 'string' && label.trim() ? label : 'Programme synchronisé'; }

const styles = StyleSheet.create({
  root: { flex: 1 }, safe: { flex: 1 }, header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerCopy: { flex: 1 }, eyebrow: { color: '#CFA055', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 2.4 }, title: { color: '#F2EBDD', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 29, marginTop: 3 }, subtitle: { color: '#8EA096', fontFamily: 'Jost_400Regular', fontSize: 11, marginTop: 2 }, avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(207,160,85,.5)', backgroundColor: '#103C27', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#D8B46B', fontFamily: 'Jost_700Bold', fontSize: 13 }, online: { position: 'absolute', right: 1, bottom: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#62B779', borderWidth: 2, borderColor: '#062214' },
  summary: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 }, summaryCard: { flex: 1, minHeight: 70, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(207,160,85,.18)', backgroundColor: 'rgba(12,48,31,.72)', padding: 10 }, summaryValue: { color: '#F2EBDD', fontFamily: 'Marcellus_400Regular', fontSize: 18, marginTop: 3 }, summaryLabel: { color: '#819188', fontFamily: 'Jost_500Medium', fontSize: 8, textTransform: 'uppercase', letterSpacing: .8 },
  error: { marginHorizontal: 16, marginBottom: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,125,108,.36)', backgroundColor: 'rgba(104,39,31,.28)', flexDirection: 'row', gap: 8, alignItems: 'center' }, errorText: { flex: 1, color: '#EFCBC4', fontFamily: 'Jost_400Regular', fontSize: 11 }, retry: { color: '#F2C16A', fontFamily: 'Jost_700Bold', fontSize: 9 },
  shell: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F4EFE5', overflow: 'hidden' }, shellHeader: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E4D9C5' }, sectionEyebrow: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 2 }, sectionTitle: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24, marginTop: 2 }, refresh: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#DECDAF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF8F1' }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9 },
  list: { flex: 1 }, listContent: { padding: 14, paddingBottom: 30, gap: 10 }, card: { borderRadius: 16, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', padding: 13 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 }, code: { color: '#B17E2B', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 1 }, client: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 20, marginTop: 3 }, status: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#DDEDE2' }, statusText: { color: '#31754A', fontFamily: 'Jost_700Bold', fontSize: 7, letterSpacing: .6 }, detailsRow: { flexDirection: 'row', gap: 8, marginTop: 10 }, detail: { flex: 1, minHeight: 50, borderRadius: 11, backgroundColor: '#F5F0E7', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 7 }, detailLabel: { color: '#8C958F', fontFamily: 'Jost_700Bold', fontSize: 7, letterSpacing: .7 }, detailValue: { color: '#25372D', fontFamily: 'Jost_500Medium', fontSize: 9.5, marginTop: 2 }, cardFooter: { marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEE5D6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, open: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: .8, marginTop: 10 }, messageIdentity: { flex: 1 }, meta: { color: '#829087', fontFamily: 'Jost_400Regular', fontSize: 9, marginTop: 2 }, messagePreview: { color: '#36473E', fontFamily: 'Jost_400Regular', fontSize: 11, lineHeight: 17, marginTop: 10 }, badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#B85545', alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#FFF', fontFamily: 'Jost_700Bold', fontSize: 8 },
  nav: { minHeight: 70, flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(207,160,85,.22)', backgroundColor: '#041D10', paddingHorizontal: 8, paddingTop: 7 }, navButton: { flex: 1, alignItems: 'center', gap: 3 }, navIcon: { width: 36, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: 'rgba(207,160,85,.13)' }, navLabel: { color: '#718078', fontFamily: 'Jost_500Medium', fontSize: 8 }, navLabelActive: { color: '#D2AE65' }, navBadge: { position: 'absolute', right: -5, top: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#B85545', alignItems: 'center', justifyContent: 'center' }, navBadgeText: { color: '#FFF', fontFamily: 'Jost_700Bold', fontSize: 7 },
  empty: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 28, gap: 8 }, emptyTitle: { color: '#173528', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22 }, muted: { color: '#7C8981', fontFamily: 'Jost_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  modalRoot: { flex: 1 }, modalSafe: { flex: 1 }, modalHeader: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(207,160,85,.22)' }, close: { width: 39, height: 39, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(207,160,85,.26)', alignItems: 'center', justifyContent: 'center' }, modalEyebrow: { color: '#CFA055', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 1.5 }, modalTitle: { color: '#F2EBDD', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 24 }, modalContent: { padding: 14, paddingBottom: 35, gap: 12 }, section: { borderRadius: 15, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', paddingHorizontal: 13, paddingBottom: 3 }, sectionLabel: { color: '#B17E2B', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 1.2, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEE5D6' }, line: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1E9DC' }, lineLabel: { color: '#7B8880', fontFamily: 'Jost_400Regular', fontSize: 10 }, lineValue: { flex: 1, color: '#1F3428', fontFamily: 'Jost_500Medium', fontSize: 10, textAlign: 'right' }, sectionEmpty: { color: '#7B8880', fontFamily: 'Jost_400Regular', fontSize: 10, paddingVertical: 13 }, quickActions: { flexDirection: 'row', gap: 9 }, quickButton: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#CFA055', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, quickText: { color: '#082719', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: .8 },
  chatScroll: { flex: 1 }, chatContent: { padding: 14, gap: 9 }, chatRow: { flexDirection: 'row', justifyContent: 'flex-start' }, chatRowMine: { justifyContent: 'flex-end' }, bubble: { maxWidth: '86%', borderRadius: 16, borderBottomLeftRadius: 4, backgroundColor: '#123A28', padding: 11 }, bubbleMine: { backgroundColor: '#CFA055', borderBottomLeftRadius: 16, borderBottomRightRadius: 4 }, author: { color: '#D9B76F', fontFamily: 'Jost_700Bold', fontSize: 8, marginBottom: 4 }, authorMine: { color: '#17301F' }, bubbleText: { color: '#F1ECE2', fontFamily: 'Jost_400Regular', fontSize: 12, lineHeight: 18 }, bubbleTextMine: { color: '#092617' }, chatError: { color: '#F0B4A9', fontFamily: 'Jost_500Medium', fontSize: 10, paddingHorizontal: 15, paddingBottom: 6 }, composer: { minHeight: 72, padding: 9, flexDirection: 'row', alignItems: 'flex-end', gap: 9 }, input: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(207,160,85,.25)', backgroundColor: '#0A2E1D', color: '#F1ECE2', fontFamily: 'Jost_400Regular', fontSize: 12, padding: 11 }, send: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#CFA055', alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: .45 },
  profile: { padding: 18, paddingBottom: 35, alignItems: 'center', gap: 7 }, profileAvatar: { width: 74, height: 74, borderRadius: 37, backgroundColor: '#0A3521', borderWidth: 2, borderColor: '#CFA055', alignItems: 'center', justifyContent: 'center' }, profileAvatarText: { color: '#D8B46B', fontFamily: 'Jost_700Bold', fontSize: 19 }, profileName: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 27 }, profileRole: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 1.5, marginBottom: 10 }, logout: { width: '100%', minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#D9AFA8', backgroundColor: '#FFF7F5', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, logoutText: { color: '#A34D41', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 1.2 },
});
