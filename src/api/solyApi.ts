import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'soly_mobile_token';

export const SOLY_API_URL = (
  process.env.EXPO_PUBLIC_SOLY_API_URL ?? 'https://solyvents.fr/wp/wp-json/soly-mobile/v1'
).replace(/\/$/, '');

export type SolyUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  client: {
    id: number;
    code: string;
    source: 'crm';
  };
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
  settings: { city: string; currency: string; apiVersion: string };
  catalog: {
    services: Array<Record<string, unknown>>;
    eventPackages: Record<string, unknown>;
    vehicleAddons: Array<Record<string, unknown>>;
    securityAddons: Array<Record<string, unknown>>;
    assuranceOptions: Array<Record<string, unknown>>;
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
    }>;
  }>;
  generatedAt?: string;
  source?: string;
};

export type SolyConciergeRequest = {
  id: number;
  code: string;
  status: string;
  message: string;
  scheduledDate: string;
  slot: string;
  slotLabel: string;
  stayCode: string;
  createdAt: string;
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

export async function registerSoly(input: { name: string; email: string; phone: string; password: string }): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim() }),
  });
  await storageSet(result.token);
  return result;
}

export async function logoutSoly(token: string | null): Promise<void> {
  try {
    if (token) await apiRequest<null>('/auth/logout', { method: 'POST' }, token);
  } finally {
    await storageDelete();
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
  if (input.latitude) query.set('latitude', String(input.latitude));
  if (input.longitude) query.set('longitude', String(input.longitude));
  return apiRequest<SolyExplorerGuide>(`/explorer?${query.toString()}`, {}, token);
}

export function registerSolyPushToken(token: string, pushToken: string, platform: string): Promise<{ registered: boolean }> {
  return apiRequest('/push/register', { method: 'POST', body: JSON.stringify({ token: pushToken, platform }) }, token);
}

export function createSolyConciergeRequest(
  token: string,
  input: { message: string; scheduledDate: string; day: string; slot: string },
): Promise<SolyConciergeRequest> {
  return apiRequest('/requests', { method: 'POST', body: JSON.stringify(input) }, token);
}
