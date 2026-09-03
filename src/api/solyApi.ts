import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'soly_mobile_token';
const PUSH_TOKEN_KEY = 'soly_mobile_push_token';

export const SOLY_API_URL = (
  process.env.EXPO_PUBLIC_SOLY_API_URL ?? 'https://solyvents.fr/wp/wp-json/soly-mobile/v1'
).replace(/\/$/, '');

export type SolyUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  role?: 'client' | 'staff' | 'driver';
  permissions?: string[];
  client: {
    id: number;
    code: string;
    source: 'crm';
  };
  provider?: { id: number; code: string; name: string; category: string };
  loyalty?: {
    level?: string;
    level_name?: string;
    points_24m?: number;
    next_threshold_points?: number;
    majordome_remaining_today?: number | null;
    majordome_limit?: number | null;
    availability?: string;
    benefits?: Record<string, unknown>;
  };
};

export type SolyBootstrap = {
  brand: { name: string; tagline: string };
  settings: {
    city: string;
    currency: string;
    apiVersion: string;
    googleMapsApiKey?: string;
    googleMapsConfigured?: boolean;
    openaiConfigured?: boolean;
  };
  updatedAt: string;
};

export type SolyStay = {
  id: number;
  code: string;
  status: string;
  city: string;
  arrivalDate: string;
  departureDate: string;
  guests: number;
  totalAmount: number;
  days: Array<Record<string, unknown>>;
  roadbook: Record<string, unknown>;
  notifications: Array<{ id: number; title: string; status: string; priority: string; created_at: string }>;
  driver?: {
    id: number;
    code: string;
    name: string;
    company: string;
    email: string;
    phone: string;
    vehicle: string;
    plate: string;
    chatRequestId: number;
  } | null;
  arrival?: {
    mode: string;
    label: string;
    reference: string;
    time: string;
  };
  formalities?: {
    total: number;
    completed: number;
    pending: number;
    deadline: string;
    daysLeft: number | null;
    travelers: Array<{ name: string; status: 'complete' | 'pending' | 'review'; passport: string; visa: string }>;
  };
  updatedAt: string;
};

export type SolyExplorerGuide = {
  district: string;
  city: string;
  note: string;
  companions?: Array<Record<string, unknown>>;
  sections: Array<{
    title: string;
    subtitle: string;
    activities: Array<{
      title: string;
      category: string;
      description: string;
      distance: string;
      eta: string;
      latitude: number;
      longitude: number;
      distanceMeters?: number;
    }>;
  }>;
  generatedAt?: string;
  source?: string;
  userLocation?: {
    latitude: number | null;
    longitude: number | null;
  };
};

export type SolyConciergeRequest = {
  id: number;
  code: string;
  status: string;
  priority: string;
  title: string;
  message: string;
  scheduledDate: string;
  slot: string;
  slotLabel: string;
  channel?: string;
  providerId?: number;
  stayCode: string;
  stayId: number;
  client: {
    id: number;
    code: string;
    name: string;
    email: string;
    phone: string;
  };
  messages: SolyConciergeMessage[];
  createdAt: string;
  updatedAt: string;
};

export type SolyConciergeMessage = {
  id: string;
  sender: 'client' | 'staff' | 'driver';
  senderId: number;
  senderName: string;
  message: string;
  createdAt: string;
};

export type SolyAdminStay = {
  id: number;
  code: string;
  bookingId: number;
  status: string;
  arrivalDate: string;
  departureDate: string;
  guests: number;
  totalAmount: number;
  city: string;
  paymentStatus: string;
  paidAmount: number;
  hotelStatus: string;
  hotelAmount: number;
  requestCount: number;
  adults: number;
  children: number;
  rooms: number;
  nights: number;
  accommodation: string;
  accommodationBudget: string;
  arrivalMode: string;
  vehicle: string;
  occasion: string;
  programDays: number;
  client: { id: number; code: string; name: string; email: string; phone: string };
  driver?: { id: number; name: string; phone: string };
  notes: string;
  updatedAt: string;
};

export type SolyAdminDashboard = {
  stats: { openRequests: number; stays: number; clients: number };
  requests: SolyConciergeRequest[];
  stays: SolyAdminStay[];
  updatedAt: string;
};

export type SolyDriverStay = {
  id: number;
  code: string;
  status: string;
  arrivalDate: string;
  departureDate: string;
  guests: number;
  city: string;
  arrivalMode: string;
  client: { id: number; code: string; name: string; email: string; phone: string };
  days: Array<Record<string, unknown>>;
  roadbook: Record<string, unknown>;
  assignedAt: string;
};

export type SolyDriverDashboard = {
  provider: { id: number; code: string; name: string; phone: string };
  stays: SolyDriverStay[];
  requests: SolyConciergeRequest[];
  updatedAt: string;
};

type AuthResponse = { token: string; user: SolyUser };

async function storageGet(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storageSet(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function storageDelete(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function pushTokenGet(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(PUSH_TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

async function pushTokenSet(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(PUSH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

async function pushTokenDelete(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(PUSH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${SOLY_API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Serveur SOLY indisponible. Vérifiez votre connexion.');
  }

  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? String(body.message) : 'Une erreur est survenue.';
    throw new Error(message);
  }
  return body as T;
}

export async function restoreSolySession(): Promise<{ token: string; user: SolyUser } | null> {
  const token = await storageGet();
  if (!token) return null;
  try {
    const user = await apiRequest<SolyUser>('/me', {}, token);
    return { token, user };
  } catch {
    await storageDelete();
    return null;
  }
}

export async function loginSoly(email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  await storageSet(result.token);
  return result;
}

export async function logoutSoly(token: string | null): Promise<void> {
  try {
    const pushToken = await pushTokenGet();
    if (token) {
      await apiRequest<null>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      }, token);
    }
  } finally {
    await Promise.all([storageDelete(), pushTokenDelete()]);
  }
}

export function loadSolyBootstrap(): Promise<SolyBootstrap> {
  return apiRequest<SolyBootstrap>('/bootstrap');
}

export function loadSolyStay(token: string): Promise<SolyStay> {
  return apiRequest<SolyStay>('/stay', {}, token);
}

export function loadSolyExplorer(token: string, input: { city?: string; latitude?: number; longitude?: number }): Promise<SolyExplorerGuide> {
  const query = new URLSearchParams();
  if (input.city) query.set('city', input.city);
  if (Number.isFinite(input.latitude)) query.set('latitude', String(input.latitude));
  if (Number.isFinite(input.longitude)) query.set('longitude', String(input.longitude));
  return apiRequest<SolyExplorerGuide>(`/explorer?${query.toString()}`, {}, token);
}

export type SolyPaymentMethod = { type: string; paypalEmail: string; updatedAt: string };

/**
 * Seule l adresse PayPal est transmise : elle identifie le beneficiaire sans
 * qu aucun identifiant de paiement ne transite ni ne soit conserve.
 */
export function saveSolyPaymentMethod(token: string, paypalEmail: string): Promise<SolyPaymentMethod> {
  return apiRequest('/me/payment', { method: 'POST', body: JSON.stringify({ type: 'paypal', paypalEmail }) }, token);
}

export async function registerSolyPushToken(token: string, pushToken: string, platform: string): Promise<{ registered: boolean }> {
  const result = await apiRequest<{ registered: boolean }>('/push/register', { method: 'POST', body: JSON.stringify({ token: pushToken, platform }) }, token);
  if (result.registered) await pushTokenSet(pushToken);
  return result;
}

export function createSolyConciergeRequest(
  token: string,
  input: { message: string; scheduledDate: string; day: string; slot: string },
): Promise<SolyConciergeRequest> {
  return apiRequest('/requests', { method: 'POST', body: JSON.stringify(input) }, token);
}

export function loadSolyConciergeRequests(token: string): Promise<{ requests: SolyConciergeRequest[] }> {
  return apiRequest('/requests', {}, token);
}

export function replyToSolyConciergeRequest(
  token: string,
  requestId: number,
  message: string,
  identity?: { sender?: 'staff' | 'driver'; senderName?: string },
): Promise<SolyConciergeRequest> {
  return apiRequest(`/requests/${requestId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, ...identity }),
  }, token);
}

export function loadSolyAdminDashboard(token: string): Promise<SolyAdminDashboard> {
  return apiRequest('/admin/dashboard', {}, token);
}

export function loadSolyDriverDashboard(token: string): Promise<SolyDriverDashboard> {
  return apiRequest('/driver/dashboard', {}, token);
}
