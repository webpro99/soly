import React from 'react';
import { StyleSheet, View } from 'react-native';

type MapMarker = {
  title: string;
  latitude: number;
  longitude: number;
  label?: string;
};

const cityCenters: Record<string, { latitude: number; longitude: number }> = {
  marrakech: { latitude: 31.6295, longitude: -7.9811 },
  casablanca: { latitude: 33.5899, longitude: -7.6039 },
  rabat: { latitude: 34.0209, longitude: -6.8416 },
  paris: { latitude: 48.8647, longitude: 2.3376 },
};

export function RealMap({
  city,
  markers = [],
  userLocation,
}: {
  dark?: boolean;
  withCompanions?: boolean;
  city?: string;
  markers?: MapMarker[];
  apiKey?: string;
  userLocation?: { latitude: number | null; longitude: number | null };
  // Le web n a pas le conflit de scroll natif : la prop existe pour garder la
  // meme signature que la version native.
  onInteractionChange?: (active: boolean) => void;
}) {
  const fallback = cityCenters[cityKey(city)] ?? cityCenters.marrakech;
  const firstMarker = markers.find((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
  const center = userLocation?.latitude != null && userLocation?.longitude != null
    ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
    : firstMarker ?? fallback;
  const url = `https://www.google.com/maps?q=${encodeURIComponent(`${center.latitude},${center.longitude}`)}&z=14&output=embed`;
  const iframe = React.createElement('iframe', {
    src: url,
    title: `Google Maps · ${city || 'SOLÝ'}`,
    loading: 'lazy',
    allowFullScreen: true,
    referrerPolicy: 'no-referrer-when-downgrade',
    style: { width: '100%', height: '100%', border: 0 },
  });

  return <View style={styles.map}>{iframe}</View>;
}

function cityKey(city?: string) {
  const normalized = (city ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized.includes('casablanca')) return 'casablanca';
  if (normalized.includes('rabat')) return 'rabat';
  if (normalized.includes('paris')) return 'paris';
  return 'marrakech';
}

const styles = StyleSheet.create({
  map: {
    height: 238,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.32)',
    overflow: 'hidden',
    backgroundColor: '#0C3823',
  },
});
