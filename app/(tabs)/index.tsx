import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Planet from '../../components/Planet';

export default function HomeScreen() {
  // Toggle health manually for now to test Day 2 visual states
  const [status, setStatus] = useState<'good' | 'neutral' | 'bad'>('good');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Gunika!</Text>
        <Text style={styles.subtext}>Your planet is looking {status} today.</Text>
      </View>

      <Planet health={status} />

      <View style={styles.statsRow}>
        <MetricCard label="Footprint" value="12.4" unit="kg" color="#1D9E75" />
        <MetricCard label="Daily Goal" value="85" unit="%" color="#EF9F27" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Quests</Text>
        <ProgressBar label="No Plastic Bags" progress={0.7} color="#1D9E75" />
        <ProgressBar label="Public Transport" progress={0.3} color="#3C3489" />
      </View>

      {/* Test Buttons - Remove after Day 2 */}
      <View style={styles.testButtons}>
        <TouchableOpacity onPress={() => setStatus('good')} style={[styles.btn, {backgroundColor: '#2D5A27'}]}><Text style={styles.btnText}>Good</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setStatus('bad')} style={[styles.btn, {backgroundColor: '#5C5C5C'}]}><Text style={styles.btnText}>Bad</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function MetricCard({ label, value, unit, color }: any) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}<Text style={styles.cardUnit}> {unit}</Text></Text>
    </View>
  );
}

function ProgressBar({ label, progress, color }: any) {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { marginTop: 40, marginBottom: 10 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  subtext: { fontSize: 16, color: '#666' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  card: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 16, width: '48%', borderSize: 1, borderColor: '#EEE' },
  cardLabel: { fontSize: 14, color: '#888', marginBottom: 5 },
  cardValue: { fontSize: 24, fontWeight: 'bold' },
  cardUnit: { fontSize: 14, fontWeight: 'normal' },
  section: { marginTop: 30 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  progressContainer: { marginBottom: 15 },
  progressLabel: { fontSize: 14, marginBottom: 5 },
  track: { height: 10, backgroundColor: '#EEE', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%' },
  testButtons: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 40, marginBottom: 40 },
  btn: { padding: 10, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' }
});