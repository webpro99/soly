import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
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
}: {
  dark?: boolean;
  withCompanions?: boolean;
  city?: string;
  markers?: MapMarker[];
  apiKey?: string;
  userLocation?: { latitude: number | null; longitude: number | null };
}) {
  const scene = dark ? scenes.editorial : scenes.immersive;
  const validMarkers = markers.filter(isValidMarker);
  const fallbackCenter = cityCenters[cityKey(city)] ?? cityCenters.marrakech;
  const center = isValidCoordinates(userLocation) ? userLocation : validMarkers[0] ?? fallbackCenter;
  const cleanKey = apiKey.trim();
  const source = useMemo(() => {
    if (!cleanKey) {
      const query = encodeURIComponent(`${center.latitude},${center.longitude}`);
      return { uri: `https://www.google.com/maps?q=${query}&z=14&output=embed` };
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

  return (
    <View style={[styles.map, { backgroundColor: dark ? '#11100F' : '#0C3823', borderColor: scene.border }]}>
      <WebView
        source={source}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        style={styles.webView}
      />
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

  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body,#map{width:100%;height:100%;margin:0;padding:0;background:#0b2417}.gm-style-cc{display:none}</style></head>
<body><div id="map"></div><script>
const config=${config};
window.initMap=function(){
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
};
</script><script async defer src="https://maps.googleapis.com/maps/api/js?key=${encodedKey}&callback=initMap"></script></body></html>`;
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
});
