import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RealMap } from './RealMap';

export function StayLocatorMap({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;

  return (
    <View style={styles.root}>
      <RealMap
        city="Marrakech"
        markers={[{ title: 'Youssef', latitude: 31.6025, longitude: -7.9811, label: 'Y' }]}
      />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LOCALISATION CHAUFFEUR</Text>
          <Text style={styles.title}>Youssef est à environ 3 km</Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={onClose} style={styles.close}>
          <MaterialIcons name="close" size={22} color="#F3EEE4" />
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Position de démonstration · distance simulée 3 km</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 205,
    marginTop: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.35)',
    overflow: 'hidden',
    backgroundColor: '#0A2C1B',
  },
  header: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    minHeight: 66,
    borderRadius: 14,
    backgroundColor: 'rgba(4,30,12,0.92)',
    paddingHorizontal: 15,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: 'Jost_500Medium',
    fontSize: 8,
    letterSpacing: 1.8,
    color: '#CFA055',
  },
  title: {
    fontFamily: 'Jost_500Medium',
    fontSize: 13,
    color: '#F3EEE4',
    marginTop: 3,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(207,160,85,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(4,30,12,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontFamily: 'Jost_500Medium',
    fontSize: 10,
    color: '#F3EEE4',
  },
});
