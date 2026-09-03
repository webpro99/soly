import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { scenes } from '../theme';

type MapMarker = {
  title: string;
  latitude: number;
  longitude: number;
  label?: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const cityCenters: Record<string, Coordinates> = {
  marrakech: { latitude: 31.6295, longitude: -7.9811 },
  casablanca: { latitude: 33.5899, longitude: -7.6039 },
  rabat: { latitude: 34.0209, longitude: -6.8416 },
  paris: { latitude: 48.8647, longitude: 2.3376 },
};

export function RealMap({
  dark = false,
  city,
  markers = [],
  apiKey = '',
  userLocation,
  onInteractionChange,
}: {
  dark?: boolean;
  withCompanions?: boolean;
  city?: string;
  markers?: MapMarker[];
  apiKey?: string;
  userLocation?: { latitude: number | null; longitude: number | null };
  onInteractionChange?: (active: boolean) => void;
}) {
  const scene = dark ? scenes.editorial : scenes.immersive;
  const validMarkers = useMemo(() => markers.filter(isValidMarker), [markers]);
  const fallbackCenter = cityCenters[cityKey(city)] ?? cityCenters.marrakech;
  const center = isValidCoordinates(userLocation) ? userLocation : validMarkers[0] ?? fallbackCenter;
  const cleanKey = apiKey.trim();
  const source = useMemo(() => {
    if (!cleanKey) {
      return {
        html: googleEmbedHtml(center, dark),
        baseUrl: 'https://www.solyvents.fr',
      };
    }

    return {
      html: googleMapHtml({
        apiKey: cleanKey,
        center,
        dark,
        markers: validMarkers,
        userLocation: isValidCoordinates(userLocation) ? userLocation : undefined,
      }),
      baseUrl: 'https://solyvents.fr',
    };
  }, [center.latitude, center.longitude, cleanKey, dark, validMarkers, userLocation]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    setMapLoading(true);
    setMapError(false);
  }, [source]);

  // La carte vit dans le ScrollView principal de l ecran. Sans ces handlers, le
  // ScrollView intercepte le multi-touch et le pincement fait defiler la page au
  // lieu de zoomer : on lui demande de se taire tant que le doigt est sur la carte.
  const holdParentScroll = () => onInteractionChange?.(true);
  const releaseParentScroll = () => onInteractionChange?.(false);

  return (
    <View
      style={[styles.map, { backgroundColor: dark ? '#11100F' : '#0C3823', borderColor: scene.border }]}
      onTouchStart={holdParentScroll}
      onTouchEnd={releaseParentScroll}
      onTouchCancel={releaseParentScroll}
    >
      <WebView
        source={source}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => <View style={styles.nativeLoader}><ActivityIndicator color="#CFA055" /></View>}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          if (message === 'soly-map-ready' || message === 'soly-map-fallback') setMapLoading(false);
        }}
        onLoadEnd={() => {
          // Le document est charge avant l API Google. Le message JavaScript reste
          // prioritaire, ce delai evite toutefois un masque bloque indefiniment.
          setTimeout(() => setMapLoading(false), 8000);
        }}
        onError={() => {
          setMapLoading(false);
          setMapError(true);
        }}
        onHttpError={() => {
          setMapLoading(false);
          setMapError(true);
        }}
        style={styles.webView}
      />
      {mapLoading ? (
        <View pointerEvents="none" style={styles.mapStatus}>
          <ActivityIndicator color="#CFA055" />
          <Text style={styles.mapStatusText}>Chargement de la carte…</Text>
        </View>
      ) : null}
      {mapError ? (
        <View pointerEvents="none" style={styles.mapError}>
          <Text style={styles.mapErrorText}>Carte momentanément indisponible</Text>
        </View>
      ) : null}
    </View>
  );
}

function googleMapHtml({
  apiKey,
  center,
  dark,
  markers,
  userLocation,
}: {
  apiKey: string;
  center: Coordinates;
  dark: boolean;
  markers: MapMarker[];
  userLocation?: Coordinates;
}) {
  const config = JSON.stringify({ center, dark, markers, userLocation }).replace(/</g, '\\u003c');
  const encodedKey = encodeURIComponent(apiKey);

  const fallbackUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${center.latitude},${center.longitude}`)}&z=14&output=embed`;

  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#0b2417}.gm-style-cc{display:none}iframe{width:100%;height:100%;border:0}</style></head>
<body><div id="map"></div><script>
const config=${config};
let mapResolved=false;
function notify(value){try{window.ReactNativeWebView.postMessage(value)}catch(e){}}
function renderFallback(){
  if(mapResolved)return;
  mapResolved=true;
  const frame=document.createElement('iframe');
  frame.src=${JSON.stringify(fallbackUrl)};
  frame.referrerPolicy='no-referrer-when-downgrade';
  frame.onload=function(){notify('soly-map-fallback')};
  const root=document.getElementById('map');root.innerHTML='';root.appendChild(frame);
  notify('soly-map-fallback');
}
window.gm_authFailure=renderFallback;
setTimeout(renderFallback,7000);
window.initMap=function(){
  if(mapResolved)return;
  const map=new google.maps.Map(document.getElementById('map'),{
    center:{lat:config.center.latitude,lng:config.center.longitude},zoom:14,
    disableDefaultUI:true,zoomControl:true,gestureHandling:'greedy',
    styles:config.dark?[{elementType:'geometry',stylers:[{color:'#173426'}]},{elementType:'labels.text.fill',stylers:[{color:'#d8d2c4'}]},{elementType:'labels.text.stroke',stylers:[{color:'#173426'}]},{featureType:'road',elementType:'geometry',stylers:[{color:'#2a4a39'}]},{featureType:'water',elementType:'geometry',stylers:[{color:'#0a2117'}]}]:[]
  });
  const bounds=new google.maps.LatLngBounds();
  config.markers.forEach(function(item){
    const position={lat:item.latitude,lng:item.longitude};
    const marker=new google.maps.Marker({map,position,title:item.title,label:item.label||undefined});
    const info=new google.maps.InfoWindow({content:'<div style="font:600 13px Arial;color:#173426;padding:2px 4px">'+String(item.title).replace(/[<>&]/g,'')+'</div>'});
    marker.addListener('click',function(){info.open({anchor:marker,map});});
    bounds.extend(position);
  });
  if(config.userLocation){
    const position={lat:config.userLocation.latitude,lng:config.userLocation.longitude};
    new google.maps.Marker({map,position,title:'Votre position',icon:{path:google.maps.SymbolPath.CIRCLE,scale:8,fillColor:'#CFA055',fillOpacity:1,strokeColor:'#fff',strokeWeight:3}});
    bounds.extend(position);
  }
  if(config.markers.length>1){map.fitBounds(bounds,48);}
  google.maps.event.addListenerOnce(map,'idle',function(){mapResolved=true;notify('soly-map-ready')});
};
</script><script async defer onerror="renderFallback()" src="https://maps.googleapis.com/maps/api/js?key=${encodedKey}&callback=initMap"></script></body></html>`;
}

function googleEmbedHtml(center: Coordinates, dark: boolean) {
  const query = encodeURIComponent(`${center.latitude},${center.longitude}`);
  const url = `https://www.google.com/maps?q=${query}&z=14&output=embed`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body,iframe{width:100%;height:100%;margin:0;border:0;background:${dark ? '#0b2417' : '#e8e4da'}}</style></head><body><iframe title="Carte SOLY" src="${url}" onload="window.ReactNativeWebView&&window.ReactNativeWebView.postMessage('soly-map-ready')"></iframe></body></html>`;
}

function isValidMarker(marker: MapMarker) {
  return Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude) && Math.abs(marker.latitude) <= 90 && Math.abs(marker.longitude) <= 180;
}

function isValidCoordinates(value?: { latitude: number | null; longitude: number | null }): value is Coordinates {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) && Math.abs(value.latitude!) <= 90 && Math.abs(value.longitude!) <= 180);
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
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  nativeLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2417',
  },
  mapStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#0B2417',
  },
  mapStatusText: {
    color: '#D4C59A',
    fontSize: 11,
    letterSpacing: 0.7,
  },
  mapError: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B2417',
  },
  mapErrorText: {
    color: '#D4C59A',
    fontSize: 11,
  },
});
