import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Planet from '../../components/Planet'; // Keeping your Day 2 Planet component

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [squadSavings, setSquadSavings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { init(); }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: prof }, { data: logsData }, { data: questsData }, { data: squadData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('carbon_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(5),
      supabase.from('quests').select('*').eq('is_active', true).limit(4),
      supabase.from('squad_members').select('squads(total_savings)').eq('user_id', user.id),
    ]);

    if (prof) setProfile(prof);
    if (logsData) setLogs(logsData);
    if (questsData) setQuests(questsData);
    if (squadData) {
      const total = squadData.reduce((sum: number, m: any) => sum + (m.squads?.total_savings || 0), 0);
      setSquadSavings(total);
    }
  }

  async function onRefresh() { setRefreshing(true); await init(); setRefreshing(false); }

  const score = profile?.total_carbon_score || 0;
  // Map Supabase score to your Planet health states
  const planetStatus: 'good' | 'neutral' | 'bad' = score > 50 ? 'good' : score > 20 ? 'neutral' : 'bad';
  const planetColor = score > 50 ? '#1D9E75' : score > 20 ? '#EF9F27' : '#E8593C';

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name || 'Eco Warrior'} 👋</Text>
          <Text style={styles.subtext}>Your planet is looking {planetStatus} today.</Text>
        </View>
      </View>

      {/* Your Day 2 Planet Component - Now driven by real data! */}
      <View style={styles.planetSection}>
        <Planet health={planetStatus} />
        <Text style={styles.planetScore}>{score.toFixed(1)} kg CO₂ saved total</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <MetricCard label="Weekly" value={profile?.weekly_carbon_score?.toFixed(1) || '0'} unit="kg" color="#1D9E75" />
        <MetricCard label="Scans" value={logs.length.toString()} unit="done" color="#EF9F27" />
      </View>

      {/* Green Quests */}
      <Text style={styles.sectionTitle}>Active Quests 🌿</Text>
      {quests.map(q => (
        <View key={q.id} style={styles.questCard}>
          <Text style={styles.questEmoji}>{q.icon}</Text>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{q.title}</Text>
            <Text style={styles.questDesc}>{q.description}</Text>
          </View>
          <View style={styles.questPoints}>
            <Text style={styles.questPts}>{q.points}pts</Text>
          </View>
        </View>
      ))}

      {/* Community Section */}
      <View style={styles.poolCard}>
        <Text style={styles.poolTitle}>🌳 Community Pool</Text>
        <Text style={styles.poolNum}>{squadSavings.toFixed(1)} kg CO₂</Text>
        <Text style={styles.poolDesc}>Funding {Math.floor(squadSavings / 20)} trees via SankalpTaru NGO</Text>
      </View>

      <View style={{ height: 40 }} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { marginTop: 50, paddingHorizontal: 20, marginBottom: 10 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  subtext: { fontSize: 16, color: '#666' },
  planetSection: { alignItems: 'center', marginVertical: 10 },
  planetScore: { fontSize: 14, color: '#888', marginTop: -10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20 },
  card: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 16, width: '48%', borderWidth: 1, borderColor: '#EEE' },
  cardLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  cardValue: { fontSize: 20, fontWeight: 'bold' },
  cardUnit: { fontSize: 12, fontWeight: 'normal' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, marginTop: 30, marginBottom: 15 },
  questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10, borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#EEE' },
  questEmoji: { fontSize: 24, marginRight: 12 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 15, fontWeight: '600' },
  questDesc: { fontSize: 12, color: '#888' },
  questPoints: { alignItems: 'flex-end' },
  questPts: { fontSize: 14, fontWeight: 'bold', color: '#1D9E75' },
  poolCard: { backgroundColor: '#1a2e25', margin: 20, borderRadius: 20, padding: 20 },
  poolTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  poolNum: { fontSize: 28, fontWeight: 'bold', color: '#1D9E75', marginVertical: 5 },
  poolDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
});