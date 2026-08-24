import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { companions } from '../data/soly';
import { scenes } from '../theme';
import { MapPin } from './SolyPrimitives';

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

const companionPositions = [
  { name: 'Camille', x: '28%', y: '42%' },
  { name: 'Nassim', x: '62%', y: '36%' },
  { name: 'Elena', x: '48%', y: '64%' },
];

const fallbackMarkerPositions = ['34%', '50%', '66%', '42%', '58%', '74%'];

export function RealMap({
  dark = false,
  withCompanions = false,
  city,
  markers = [],
}: {
  dark?: boolean;
  withCompanions?: boolean;
  city?: string;
  markers?: MapMarker[];
}) {
  const scene = dark ? scenes.editorial : scenes.immersive;
  const center = cityCenters[cityKey(city)] ?? cityCenters.marrakech;
  const tiles = tileUrls(center.latitude, center.longitude, 14);

  return (
    <View style={[styles.map, { backgroundColor: dark ? '#11100F' : '#0C3823', borderColor: scene.border }]}>
      <View style={styles.osmTileGrid}>
        {tiles.map((tile) => (
          <Image key={tile} source={{ uri: tile }} resizeMode="cover" style={styles.osmTile} />
        ))}
      </View>
      <View style={styles.mapScrim} />
      <View style={styles.mainPin}>
        <MapPin scene={scene} label="VO" pulse />
      </View>
      {markers.slice(0, 6).map((marker, index) => (
        <View
          key={marker.title}
          style={[
            styles.activityPin,
            {
              left: (fallbackMarkerPositions[index] ?? '50%') as `${number}%`,
              top: (fallbackMarkerPositions[(index + 2) % fallbackMarkerPositions.length] ?? '50%') as `${number}%`,
            },
          ]}
        >
          <MapPin scene={scene} label={marker.label ?? '•'} />
        </View>
      ))}
      {withCompanions
        ? companionPositions.map((marker) => {
            const person = companions.find((item) => item.name === marker.name);

            return (
              <View key={marker.name} style={[styles.companionPin, { left: marker.x as `${number}%`, top: marker.y as `${number}%` }]}>
                <MapPin scene={scene} label={person?.initials.slice(0, 1) ?? marker.name.slice(0, 1)} pulse={person?.status === 'en ligne'} />
              </View>
            );
          })
        : null}
    </View>
  );
}

function cityKey(city?: string) {
  const normalized = (city ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('casablanca')) return 'casablanca';
  if (normalized.includes('rabat')) return 'rabat';
  if (normalized.includes('paris')) return 'paris';
  return 'marrakech';
}

function tileUrls(latitude: number, longitude: number, zoom: number) {
  const n = 2 ** zoom;
  const x = Math.floor(((longitude + 180) / 360) * n);
  const latRad = (latitude * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

  return [
    `https://a.basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y}.png`,
    `https://b.basemaps.cartocdn.com/dark_all/${zoom}/${x + 1}/${y}.png`,
    `https://c.basemaps.cartocdn.com/dark_all/${zoom}/${x}/${y + 1}.png`,
    `https://d.basemaps.cartocdn.com/dark_all/${zoom}/${x + 1}/${y + 1}.png`,
  ];
}

const styles = StyleSheet.create({
  map: {
    height: 220,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(8,28,18,0.22)',
  },
  mainPin: {
    position: 'absolute',
    left: '52%',
    top: '48%',
  },
  activityPin: {
    position: 'absolute',
  },
  companionPin: {
    position: 'absolute',
  },
});
