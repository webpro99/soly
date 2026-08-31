import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  loadSolyAdminDashboard,
  replyToSolyConciergeRequest,
  type SolyAdminDashboard,
  type SolyAdminStay,
  type SolyConciergeRequest,
  type SolyUser,
} from '../api/solyApi';

type AdminTab = 'requests' | 'stays' | 'profile';

type Props = {
  token: string;
  user: SolyUser;
  onLogout: () => Promise<void>;
};

const emptyDashboard: SolyAdminDashboard = {
  stats: { openRequests: 0, stays: 0, clients: 0 },
  requests: [],
  stays: [],
  updatedAt: '',
};

export function AdminPortal({ token, user, onLogout }: Props) {
  const [tab, setTab] = useState<AdminTab>('requests');
  const [dashboard, setDashboard] = useState<SolyAdminDashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<SolyConciergeRequest | null>(null);
  const [selectedStay, setSelectedStay] = useState<SolyAdminStay | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const result = await loadSolyAdminDashboard(token);
      setDashboard(result);
      setSelectedRequest((current) => current ? result.requests.find((item) => item.id === current.id) ?? current : null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger le CRM.');
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
            <View>
              <Text style={styles.eyebrow}>ESPACE ÉQUIPE</Text>
              <Text style={styles.title}>SOLÝ Majordome</Text>
              <Text style={styles.subtitle}>Bonjour, {firstName(user.name)}</Text>
            </View>
            <View style={styles.staffAvatar}>
              <Text style={styles.staffAvatarText}>{initials(user.name)}</Text>
              <View style={styles.onlineDot} />
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard icon="forum" value={dashboard.stats.openRequests} label="Demandes" />
            <StatCard icon="luggage" value={dashboard.stats.stays} label="Séjours" />
            <StatCard icon="people-outline" value={dashboard.stats.clients} label="Clients" />
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <MaterialIcons name="error-outline" size={18} color="#F0B4A9" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.contentShell}>
            <View style={styles.contentHeader}>
              <View>
                <Text style={styles.contentEyebrow}>{tab === 'requests' ? 'CONCIERGERIE' : tab === 'stays' ? 'OPÉRATIONS' : 'COMPTE SOLÝ'}</Text>
                <Text style={styles.contentTitle}>{tab === 'requests' ? 'Demandes clients' : tab === 'stays' ? 'Réservations & séjours' : 'Profil administrateur'}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.72} onPress={() => void load()} style={styles.refreshButton}>
                {refreshing ? <ActivityIndicator size="small" color="#B78A38" /> : <MaterialIcons name="refresh" size={21} color="#B78A38" />}
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loading}><ActivityIndicator color="#CFA055" /><Text style={styles.loadingText}>Synchronisation CRM…</Text></View>
            ) : tab === 'requests' ? (
              <RequestList dashboard={dashboard} refreshing={refreshing} onRefresh={() => void load()} onOpen={setSelectedRequest} />
            ) : tab === 'stays' ? (
              <StayList stays={dashboard.stays} refreshing={refreshing} onRefresh={() => void load()} onOpen={setSelectedStay} />
            ) : (
              <Profile user={user} dashboard={dashboard} onLogout={onLogout} />
            )}
          </View>

          <View style={styles.nav}>
            <NavButton icon="forum" label="Demandes" active={tab === 'requests'} badge={dashboard.stats.openRequests} onPress={() => setTab('requests')} />
            <NavButton icon="luggage" label="Séjours" active={tab === 'stays'} onPress={() => setTab('stays')} />
            <NavButton icon="admin-panel-settings" label="Profil SOLÝ" active={tab === 'profile'} onPress={() => setTab('profile')} />
          </View>

          <RequestChat
            token={token}
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onUpdated={(updated) => {
              setSelectedRequest(updated);
              setDashboard((current) => ({
                ...current,
                requests: current.requests.map((item) => item.id === updated.id ? updated : item),
              }));
            }}
          />
          <StayDetails stay={selectedStay} onClose={() => setSelectedStay(null)} />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

function StatCard({ icon, value, label }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={18} color="#CFA055" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RequestList({ dashboard, refreshing, onRefresh, onOpen }: { dashboard: SolyAdminDashboard; refreshing: boolean; onRefresh: () => void; onOpen: (request: SolyConciergeRequest) => void }) {
  const requests = useMemo(() => dashboard.requests.filter((item) => !['closed', 'resolved'].includes(item.status)), [dashboard.requests]);
  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CFA055" />}
      showsVerticalScrollIndicator={false}
    >
      {!requests.length ? <EmptyState icon="done-all" title="Aucune demande ouverte" copy="Les nouvelles sollicitations apparaîtront automatiquement ici." /> : null}
      {requests.map((request) => {
        const last = request.messages[request.messages.length - 1];
        return (
          <TouchableOpacity key={request.id} activeOpacity={0.78} onPress={() => onOpen(request)} style={styles.requestCard}>
            <View style={styles.requestTop}>
              <View style={styles.clientAvatar}><Text style={styles.clientAvatarText}>{initials(request.client.name || 'Client')}</Text></View>
              <View style={styles.requestIdentity}>
                <Text numberOfLines={1} style={styles.requestClient}>{request.client.name || 'Client CRM'}</Text>
                <Text numberOfLines={1} style={styles.requestMeta}>{request.stayCode || 'Sans séjour'} · {request.code}</Text>
              </View>
              <StatusChip status={request.status} />
            </View>
            <Text numberOfLines={2} style={styles.requestMessage}>{last?.message || request.message}</Text>
            <View style={styles.requestFooter}>
              <View style={styles.requestWhen}><MaterialIcons name="schedule" size={14} color="#78877E" /><Text style={styles.requestWhenText}>{request.scheduledDate} · {request.slotLabel}</Text></View>
              <View style={styles.replyAction}><MaterialIcons name="chat" size={16} color="#CFA055" /><Text style={styles.replyActionText}>RÉPONDRE</Text></View>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function StayList({ stays, refreshing, onRefresh, onOpen }: { stays: SolyAdminStay[]; refreshing: boolean; onRefresh: () => void; onOpen: (stay: SolyAdminStay) => void }) {
  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#CFA055" />}
      showsVerticalScrollIndicator={false}
    >
      {!stays.length ? <EmptyState icon="luggage" title="Aucun séjour" copy="Les réservations synchronisées apparaîtront ici." /> : null}
      {stays.map((stay) => (
        <TouchableOpacity key={stay.id} activeOpacity={0.78} onPress={() => onOpen(stay)} style={styles.stayCard}>
          <View style={styles.stayTop}>
            <View>
              <Text style={styles.stayCode}>{stay.code}</Text>
              <Text style={styles.stayClient}>{stay.client.name || stay.client.email || 'Client à compléter'}</Text>
            </View>
            <StatusChip status={stay.status} />
          </View>
          <View style={styles.stayDetailsRow}>
            <MiniDetail icon="calendar-today" label="DATES" value={`${shortDate(stay.arrivalDate)} → ${shortDate(stay.departureDate)}`} />
            <MiniDetail icon="people-outline" label="VOYAGEURS" value={String(stay.guests)} />
          </View>
          <View style={styles.stayDetailsRow}>
            <MiniDetail icon="payments" label="TOTAL" value={money(stay.totalAmount)} />
            <MiniDetail icon="forum" label="DEMANDES" value={String(stay.requestCount)} />
          </View>
          <View style={styles.stayFooter}>
            <Text style={styles.stayCity}>{stay.city || 'Destination non renseignée'}</Text>
            <MaterialIcons name="arrow-forward-ios" size={15} color="#B78A38" />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function Profile({ user, dashboard, onLogout }: { user: SolyUser; dashboard: SolyAdminDashboard; onLogout: () => Promise<void> }) {
  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{initials(user.name)}</Text></View>
        <Text style={styles.profileName}>{user.name}</Text>
        <Text style={styles.profileRole}>PROFIL SOLÝ · ADMINISTRATEUR</Text>
      </View>
      <View style={styles.profileCard}>
        <ProfileLine icon="mail-outline" label="Email" value={user.email} />
        <ProfileLine icon="verified-user" label="Accès" value="Demandes · réponses · séjours" />
        <ProfileLine icon="sync" label="Synchronisation" value={dashboard.updatedAt ? `Mise à jour ${dateTime(dashboard.updatedAt)}` : 'Temps réel'} />
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={() => void onLogout()} style={styles.logoutButton}>
        <MaterialIcons name="logout" size={19} color="#E2B2AA" />
        <Text style={styles.logoutText}>SE DÉCONNECTER</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function RequestChat({ token, request, onClose, onUpdated }: { token: string; request: SolyConciergeRequest | null; onClose: () => void; onUpdated: (request: SolyConciergeRequest) => void }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  if (!request) return null;

  const send = async () => {
    const clean = draft.trim();
    if (!clean || sending) return;
    setSending(true);
    setError('');
    try {
      const updated = await replyToSolyConciergeRequest(token, request.id, clean);
      setDraft('');
      onUpdated(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Réponse non envoyée.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal animationType="slide" visible transparent={false} onRequestClose={onClose}>
      <LinearGradient colors={['#031B0D', '#0B3421', '#041C10']} style={styles.modalRoot}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.modalSafe}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}><MaterialIcons name="arrow-back" size={22} color="#EDE7DC" /></TouchableOpacity>
            <View style={styles.chatHeaderCopy}>
              <Text numberOfLines={1} style={styles.chatTitle}>{request.client.name || 'Client CRM'}</Text>
              <Text numberOfLines={1} style={styles.chatSubtitle}>{request.stayCode || request.code} · {request.slotLabel}</Text>
            </View>
            <StatusChip status={request.status} />
          </View>
          <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatMessages} showsVerticalScrollIndicator={false}>
            <View style={styles.chatContext}>
              <Text style={styles.chatContextLabel}>DEMANDE INITIALE</Text>
              <Text style={styles.chatContextText}>{request.message}</Text>
              <Text style={styles.chatContextMeta}>{request.scheduledDate} · {request.slotLabel} · {request.code}</Text>
            </View>
            {request.messages.map((message) => {
              const staff = message.sender === 'staff';
              return (
                <View key={message.id} style={[styles.chatRow, staff ? styles.chatRowStaff : styles.chatRowClient]}>
                  <View style={[styles.chatBubble, staff ? styles.chatBubbleStaff : styles.chatBubbleClient]}>
                    <Text style={[styles.chatAuthor, staff && styles.chatAuthorStaff]}>{staff ? 'SOLÝ' : message.senderName || request.client.name}</Text>
                    <Text style={[styles.chatMessage, staff && styles.chatMessageStaff]}>{message.message}</Text>
                    <Text style={[styles.chatTime, staff && styles.chatTimeStaff]}>{dateTime(message.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {error ? <Text style={styles.chatError}>{error}</Text> : null}
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
              placeholder="Répondre au client…"
              placeholderTextColor="#7E8F85"
              style={styles.composerInput}
            />
            <TouchableOpacity disabled={!draft.trim() || sending} activeOpacity={0.78} onPress={() => void send()} style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}>
              {sending ? <ActivityIndicator size="small" color="#082719" /> : <MaterialIcons name="send" size={21} color="#082719" />}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function StayDetails({ stay, onClose }: { stay: SolyAdminStay | null; onClose: () => void }) {
  if (!stay) return null;
  return (
    <Modal animationType="slide" visible transparent onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.sheetBackdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View><Text style={styles.sheetEyebrow}>RÉSERVATION #{stay.bookingId}</Text><Text style={styles.sheetTitle}>{stay.code}</Text></View>
            <TouchableOpacity onPress={onClose} style={styles.sheetClose}><MaterialIcons name="close" size={22} color="#87948C" /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent}>
            <DetailSection title="Client">
              <DetailLine label="Nom" value={stay.client.name || 'Non renseigné'} />
              <DetailLine label="Email" value={stay.client.email || '—'} />
              <DetailLine label="Téléphone" value={stay.client.phone || '—'} />
              <DetailLine label="Code CRM" value={stay.client.code || '—'} />
            </DetailSection>
            <DetailSection title="Séjour">
              <DetailLine label="Destination" value={stay.city || '—'} />
              <DetailLine label="Arrivée" value={longDate(stay.arrivalDate)} />
              <DetailLine label="Départ" value={longDate(stay.departureDate)} />
              <DetailLine label="Voyageurs" value={String(stay.guests)} />
              <DetailLine label="Adultes / enfants" value={`${stay.adults || stay.guests} / ${stay.children || 0}`} />
              <DetailLine label="Jours programmés" value={String(stay.programDays || 0)} />
              <DetailLine label="Occasion" value={stay.occasion || '—'} />
              <DetailLine label="Statut" value={stay.status || '—'} />
            </DetailSection>
            <DetailSection title="Hébergement & mobilité">
              <DetailLine label="Hébergement" value={stay.accommodation || 'À confirmer'} />
              <DetailLine label="Budget hébergement" value={stay.accommodationBudget || '—'} />
              <DetailLine label="Chambres / nuits" value={`${stay.rooms || 0} / ${stay.nights || 0}`} />
              <DetailLine label="Mode d’arrivée" value={stay.arrivalMode || '—'} />
              <DetailLine label="Véhicule" value={stay.vehicle || 'Sélection automatique'} />
            </DetailSection>
            <DetailSection title="Finance & opérations">
              <DetailLine label="Montant total" value={money(stay.totalAmount)} />
              <DetailLine label="Montant payé" value={money(stay.paidAmount)} />
              <DetailLine label="Reste à régler" value={money(Math.max(0, stay.totalAmount - stay.paidAmount))} />
              <DetailLine label="Paiement" value={stay.paymentStatus || 'En attente'} />
              <DetailLine label="Hébergement" value={stay.hotelStatus || 'À confirmer'} />
              <DetailLine label="Devis hôtel" value={money(stay.hotelAmount)} />
              <DetailLine label="Demandes SOLÝ" value={String(stay.requestCount)} />
            </DetailSection>
            {stay.notes ? <DetailSection title="Notes"><Text style={styles.notes}>{stay.notes}</Text></DetailSection> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const answered = normalized === 'answered' || normalized === 'resolved';
  const closed = normalized === 'closed';
  return <View style={[styles.statusChip, answered && styles.statusChipAnswered, closed && styles.statusChipClosed]}><Text style={[styles.statusText, answered && styles.statusTextAnswered, closed && styles.statusTextClosed]}>{answered ? 'RÉPONDU' : closed ? 'CLOS' : normalized === 'paid' ? 'PAYÉ' : 'OUVERT'}</Text></View>;
}

function NavButton({ icon, label, active, badge, onPress }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; active: boolean; badge?: number; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.78} onPress={onPress} style={styles.navButton}>
      <View style={[styles.navIcon, active && styles.navIconActive]}>
        <MaterialIcons name={icon} size={21} color={active ? '#CFA055' : '#6E7E75'} />
        {badge ? <View style={styles.navBadge}><Text style={styles.navBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      </View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MiniDetail({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return <View style={styles.miniDetail}><MaterialIcons name={icon} size={16} color="#B78A38" /><View><Text style={styles.miniDetailLabel}>{label}</Text><Text numberOfLines={1} style={styles.miniDetailValue}>{value}</Text></View></View>;
}

function EmptyState({ icon, title, copy }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; title: string; copy: string }) {
  return <View style={styles.empty}><MaterialIcons name={icon} size={34} color="#B78A38" /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text></View>;
}

function ProfileLine({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; value: string }) {
  return <View style={styles.profileLine}><MaterialIcons name={icon} size={19} color="#B78A38" /><View style={styles.profileLineCopy}><Text style={styles.profileLineLabel}>{label}</Text><Text style={styles.profileLineValue}>{value}</Text></View></View>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.detailSection}><Text style={styles.detailSectionTitle}>{title}</Text>{children}</View>;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailLine}><Text style={styles.detailLabel}>{label}</Text><Text selectable style={styles.detailValue}>{value}</Text></View>;
}

function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'SOLÝ'; }
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'SY'; }
function money(value: number) { return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value || 0)} €`; }
function shortDate(value: string) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value || '—' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
function longDate(value: string) { const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value || '—' : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function dateTime(value: string) { const normalized = value.includes('T') ? value : value.replace(' ', 'T'); const date = new Date(normalized); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

const styles = StyleSheet.create({
  root: { flex: 1 }, safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: '#CFA055', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 2.5 },
  title: { color: '#F2EBDD', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 30, marginTop: 3 },
  subtitle: { color: '#8EA096', fontFamily: 'Jost_400Regular', fontSize: 12, marginTop: 1 },
  staffAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(207,160,85,.5)', backgroundColor: '#103C27', alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { color: '#D8B46B', fontFamily: 'Jost_700Bold', fontSize: 13 }, onlineDot: { position: 'absolute', right: 1, bottom: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#62B779', borderWidth: 2, borderColor: '#062214' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  statCard: { flex: 1, minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(207,160,85,.18)', backgroundColor: 'rgba(12,48,31,.72)', padding: 11 },
  statValue: { color: '#F2EBDD', fontFamily: 'Marcellus_400Regular', fontSize: 19, marginTop: 4 }, statLabel: { color: '#819188', fontFamily: 'Jost_500Medium', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  errorCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(226,125,108,.36)', backgroundColor: 'rgba(104,39,31,.28)', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  errorText: { flex: 1, color: '#EFCBC4', fontFamily: 'Jost_400Regular', fontSize: 11 }, retry: { color: '#F2C16A', fontFamily: 'Jost_700Bold', fontSize: 9 },
  contentShell: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F4EFE5', overflow: 'hidden' },
  contentHeader: { paddingHorizontal: 20, paddingTop: 19, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E4D9C5' },
  contentEyebrow: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 2.2 }, contentTitle: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 25, marginTop: 2 },
  refreshButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#DECDAF', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF8F1' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }, loadingText: { color: '#69776F', fontFamily: 'Jost_400Regular', fontSize: 12 },
  list: { flex: 1 }, listContent: { padding: 14, paddingBottom: 30, gap: 10 },
  requestCard: { borderRadius: 16, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', padding: 13 }, requestTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0B3A25', alignItems: 'center', justifyContent: 'center' }, clientAvatarText: { color: '#D9B66D', fontFamily: 'Jost_700Bold', fontSize: 10 },
  requestIdentity: { flex: 1 }, requestClient: { color: '#0A2C1B', fontFamily: 'Jost_700Bold', fontSize: 13 }, requestMeta: { color: '#829087', fontFamily: 'Jost_400Regular', fontSize: 9, marginTop: 2 },
  requestMessage: { color: '#36473E', fontFamily: 'Jost_400Regular', fontSize: 12, lineHeight: 18, marginTop: 11 }, requestFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEE5D6' },
  requestWhen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }, requestWhenText: { color: '#78877E', fontFamily: 'Jost_400Regular', fontSize: 9 }, replyAction: { flexDirection: 'row', gap: 5, alignItems: 'center' }, replyActionText: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: .7 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: '#F2E5C9' }, statusChipAnswered: { backgroundColor: '#DDEDE2' }, statusChipClosed: { backgroundColor: '#E7E7E4' }, statusText: { color: '#A16F17', fontFamily: 'Jost_700Bold', fontSize: 7.5, letterSpacing: .6 }, statusTextAnswered: { color: '#31754A' }, statusTextClosed: { color: '#677169' },
  stayCard: { borderRadius: 17, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', padding: 14 }, stayTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, stayCode: { color: '#B17E2B', fontFamily: 'Jost_700Bold', fontSize: 10, letterSpacing: 1 }, stayClient: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 21, marginTop: 3 },
  stayDetailsRow: { flexDirection: 'row', gap: 8, marginTop: 11 }, miniDetail: { flex: 1, minHeight: 52, borderRadius: 11, backgroundColor: '#F5F0E7', padding: 9, flexDirection: 'row', gap: 7, alignItems: 'center' }, miniDetailLabel: { color: '#8C958F', fontFamily: 'Jost_700Bold', fontSize: 7, letterSpacing: .8 }, miniDetailValue: { color: '#25372D', fontFamily: 'Jost_500Medium', fontSize: 10, marginTop: 2 }, stayFooter: { marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#EEE5D6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, stayCity: { color: '#6D7B73', fontFamily: 'Jost_400Regular', fontSize: 10 },
  nav: { minHeight: 70, flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(207,160,85,.22)', backgroundColor: '#041D10', paddingHorizontal: 8, paddingTop: 7 }, navButton: { flex: 1, alignItems: 'center', gap: 3 }, navIcon: { width: 35, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: 'rgba(207,160,85,.13)' }, navLabel: { color: '#718078', fontFamily: 'Jost_500Medium', fontSize: 8 }, navLabelActive: { color: '#D2AE65' }, navBadge: { position: 'absolute', right: -5, top: -4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: '#B85545', alignItems: 'center', justifyContent: 'center' }, navBadgeText: { color: '#FFF', fontFamily: 'Jost_700Bold', fontSize: 7 },
  empty: { alignItems: 'center', paddingVertical: 55, paddingHorizontal: 30 }, emptyTitle: { color: '#173528', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22, marginTop: 10 }, emptyCopy: { color: '#7C8981', fontFamily: 'Jost_400Regular', textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 5 },
  profileContent: { padding: 18, paddingBottom: 35 }, profileHero: { alignItems: 'center', paddingVertical: 20 }, profileAvatar: { width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: '#CFA055', backgroundColor: '#0A3521', alignItems: 'center', justifyContent: 'center' }, profileAvatarText: { color: '#D8B46B', fontFamily: 'Jost_700Bold', fontSize: 19 }, profileName: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 27, marginTop: 10 }, profileRole: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 1.7, marginTop: 3 }, profileCard: { borderRadius: 16, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', paddingHorizontal: 14 }, profileLine: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: '#EEE5D6' }, profileLineCopy: { flex: 1 }, profileLineLabel: { color: '#8B958F', fontFamily: 'Jost_500Medium', fontSize: 9 }, profileLineValue: { color: '#24372D', fontFamily: 'Jost_500Medium', fontSize: 11, marginTop: 2 }, logoutButton: { minHeight: 52, borderRadius: 14, marginTop: 15, borderWidth: 1, borderColor: '#D9AFA8', backgroundColor: '#FFF7F5', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, logoutText: { color: '#A34D41', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 1.2 },
  modalRoot: { flex: 1 }, modalSafe: { flex: 1 }, chatHeader: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(207,160,85,.22)' }, modalClose: { width: 39, height: 39, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(207,160,85,.26)', alignItems: 'center', justifyContent: 'center' }, chatHeaderCopy: { flex: 1 }, chatTitle: { color: '#F2EBDD', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 22 }, chatSubtitle: { color: '#82948A', fontFamily: 'Jost_400Regular', fontSize: 9 }, chatScroll: { flex: 1 }, chatMessages: { padding: 14, gap: 9, paddingBottom: 20 }, chatContext: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(207,160,85,.28)', backgroundColor: 'rgba(207,160,85,.08)', padding: 12, marginBottom: 7 }, chatContextLabel: { color: '#CFA055', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 1.5 }, chatContextText: { color: '#E9E3D7', fontFamily: 'Jost_400Regular', fontSize: 11.5, lineHeight: 18, marginTop: 5 }, chatContextMeta: { color: '#7F9187', fontFamily: 'Jost_400Regular', fontSize: 8.5, marginTop: 7 }, chatRow: { flexDirection: 'row' }, chatRowStaff: { justifyContent: 'flex-end' }, chatRowClient: { justifyContent: 'flex-start' }, chatBubble: { maxWidth: '86%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 }, chatBubbleStaff: { backgroundColor: '#CFA055', borderBottomRightRadius: 4 }, chatBubbleClient: { backgroundColor: '#123A28', borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', borderBottomLeftRadius: 4 }, chatAuthor: { color: '#D9B76F', fontFamily: 'Jost_700Bold', fontSize: 8, marginBottom: 4 }, chatAuthorStaff: { color: '#17301F' }, chatMessage: { color: '#F1ECE2', fontFamily: 'Jost_400Regular', fontSize: 12, lineHeight: 18 }, chatMessageStaff: { color: '#092617' }, chatTime: { color: '#788A80', fontFamily: 'Jost_400Regular', fontSize: 7.5, marginTop: 5 }, chatTimeStaff: { color: '#426049' }, chatError: { color: '#F0B4A9', fontFamily: 'Jost_500Medium', fontSize: 10, paddingHorizontal: 15, paddingBottom: 6 }, composer: { minHeight: 72, borderTopWidth: 1, borderTopColor: 'rgba(207,160,85,.2)', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'flex-end', gap: 9 }, composerInput: { flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(207,160,85,.25)', backgroundColor: '#0A2E1D', color: '#F1ECE2', fontFamily: 'Jost_400Regular', fontSize: 12, paddingHorizontal: 13, paddingVertical: 11 }, sendButton: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#CFA055', alignItems: 'center', justifyContent: 'center' }, sendButtonDisabled: { opacity: .45 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' }, sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,18,9,.62)' }, sheet: { height: '88%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#F4EFE5', paddingTop: 8, overflow: 'hidden' }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#CFC4B2', alignSelf: 'center', marginBottom: 7 }, sheetHeader: { paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E3D8C5' }, sheetEyebrow: { color: '#B78A38', fontFamily: 'Jost_700Bold', fontSize: 8, letterSpacing: 1.5 }, sheetTitle: { color: '#0A2C1B', fontFamily: 'CormorantGaramond_600SemiBold', fontSize: 27, marginTop: 2 }, sheetClose: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#DDD2C0', alignItems: 'center', justifyContent: 'center' }, sheetContent: { padding: 15, paddingBottom: 35, gap: 12 }, detailSection: { borderRadius: 15, borderWidth: 1, borderColor: '#E0D3BC', backgroundColor: '#FFFCF6', paddingHorizontal: 13, paddingBottom: 3 }, detailSectionTitle: { color: '#B17E2B', fontFamily: 'Jost_700Bold', fontSize: 9, letterSpacing: 1.3, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EEE5D6' }, detailLine: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 15, borderBottomWidth: 1, borderBottomColor: '#F1E9DC' }, detailLabel: { color: '#7B8880', fontFamily: 'Jost_400Regular', fontSize: 10 }, detailValue: { flex: 1, textAlign: 'right', color: '#1F3428', fontFamily: 'Jost_500Medium', fontSize: 10.5 }, notes: { color: '#35483D', fontFamily: 'Jost_400Regular', fontSize: 11, lineHeight: 17, paddingVertical: 12 },
});
