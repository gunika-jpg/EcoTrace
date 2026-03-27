import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '@/lib/supabase';

const CATEGORY_COLORS: Record<string, { color: string; emoji: string; label: string }> = {
  zero_waste_store:  { color: '#1D9E75', emoji: '♻️', label: 'Zero Waste Store' },
  ev_charging:       { color: '#3B8BD4', emoji: '⚡', label: 'EV Charging' },
  compost_bin:       { color: '#85B559', emoji: '🌱', label: 'Compost Bin' },
  ewaste_dropoff:    { color: '#E8593C', emoji: '📱', label: 'E-Waste Drop-off' },
  organic_market:    { color: '#EF9F27', emoji: '🥦', label: 'Organic Market' },
  repair_cafe:       { color: '#9B59B6', emoji: '🔧', label: 'Repair Café' },
};

type Location = {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  description: string;
  verified: boolean;
};

export default function MapScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const { data, error } = await supabase
        .from('map_locations')
        .select('*')
        .order('verified', { ascending: false });
      if (!error && data) setLocations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = activeFilter
    ? locations.filter(l => l.category === activeFilter)
    : locations;

  const mapHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; }
    #map { width: 100vw; height: 100vh; }
    .custom-pin {
      width: 36px; height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .pin-emoji {
      transform: rotate(45deg);
      font-size: 16px;
      line-height: 1;
    }
    .popup-title { font-size: 14px; font-weight: 600; color: #1a2e25; margin-bottom: 4px; }
    .popup-cat { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; display: inline-block; margin-bottom: 6px; }
    .popup-desc { font-size: 12px; color: #555; line-height: 1.5; }
    .popup-verified { font-size: 11px; color: #1D9E75; margin-top: 4px; font-weight: 500; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const map = L.map('map').setView([28.6139, 77.2090], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  const locations = ${JSON.stringify(filtered)};
  const colors = ${JSON.stringify(CATEGORY_COLORS)};

  locations.forEach(loc => {
    const cat = colors[loc.category] || { color: '#888', emoji: '📍', label: loc.category };

    const iconHtml = \`
      <div class="custom-pin" style="background:\${cat.color}">
        <span class="pin-emoji">\${cat.emoji}</span>
      </div>\`;

    const icon = L.divIcon({
      html: iconHtml,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });

    const popupContent = \`
      <div style="min-width:180px; padding:4px">
        <div class="popup-title">\${loc.name}</div>
        <span class="popup-cat" style="background:\${cat.color}22; color:\${cat.color}">\${cat.emoji} \${cat.label}</span>
        <div class="popup-desc">\${loc.description || ''}</div>
        \${loc.address ? \`<div class="popup-desc" style="margin-top:4px">📍 \${loc.address}</div>\` : ''}
        \${loc.verified ? '<div class="popup-verified">✓ Verified location</div>' : ''}
      </div>\`;

    L.marker([loc.lat, loc.lng], { icon })
      .bindPopup(popupContent)
      .addTo(map);
  });
</script>
</body>
</html>`;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Loading eco spots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        <Text
          style={[styles.chip, !activeFilter && styles.chipActive]}
          onPress={() => setActiveFilter(null)}
        >
          All ({locations.length})
        </Text>
        {Object.entries(CATEGORY_COLORS).map(([key, val]) => {
          const count = locations.filter(l => l.category === key).length;
          if (count === 0) return null;
          return (
            <Text
              key={key}
              style={[styles.chip, activeFilter === key && styles.chipActive, activeFilter === key && { borderColor: val.color }]}
              onPress={() => setActiveFilter(activeFilter === key ? null : key)}
            >
              {val.emoji} {count}
            </Text>
          );
        })}
      </View>

      {/* Map */}
      {Platform.OS === 'web' ? (
        <iframe
          srcDoc={mapHTML}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
        />
      ) : (
        <WebView
          source={{ html: mapHTML }}
          style={styles.map}
          originWhitelist={['*']}
          javaScriptEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5faf8' },
  loadingText: { marginTop: 12, color: '#1D9E75', fontSize: 14 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 6,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8f0ec',
  },
  chip: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d4e4dc',
    color: '#444',
    backgroundColor: '#f5faf8',
    overflow: 'hidden',
  },
  chipActive: {
    backgroundColor: '#1D9E75',
    color: '#fff',
    borderColor: '#1D9E75',
  },
  map: { flex: 1 },
});
