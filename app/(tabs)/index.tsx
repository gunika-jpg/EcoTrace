import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';

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
  const planetState = score > 50 ? '🌍' : score > 20 ? '🌎' : '🌏';
  const planetMsg = score > 50 ? 'Flourishing' : score > 20 ? 'Recovering' : 'Needs care';
  const planetColor = score > 50 ? '#1D9E75' : score > 20 ? '#EF9F27' : '#E8593C';

  async function signOut() { await supabase.auth.signOut(); }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name || 'Eco Warrior'} 👋</Text>
          <Text style={styles.headerSub}>Your planet is watching</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Planet Avatar */}
      <View style={styles.planetCard}>
        <Text style={styles.planetEmoji}>{planetState}</Text>
        <Text style={styles.planetStatus} numberOfLines={1}>Planet Status: <Text style={{ color: planetColor }}>{planetMsg}</Text></Text>
        <Text style={styles.planetScore}>{score.toFixed(1)} kg CO₂ saved total</Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(score, 100)}%`, backgroundColor: planetColor }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.min(score, 100).toFixed(0)}/100 kg to next level</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile?.weekly_carbon_score?.toFixed(1) || '0'}</Text>
          <Text style={styles.statLabel}>kg this week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{logs.length}</Text>
          <Text style={styles.statLabel}>scans done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{Math.floor(squadSavings / 20)}</Text>
          <Text style={styles.statLabel}>trees funded</Text>
        </View>
      </View>

      {/* Green Quests */}
      <Text style={styles.sectionTitle}>Green Quests 🌿</Text>
      {quests.map(q => (
        <View key={q.id} style={styles.questCard}>
          <Text style={styles.questEmoji}>{q.icon}</Text>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{q.title}</Text>
            <Text style={styles.questDesc}>{q.description}</Text>
          </View>
          <View style={styles.questPoints}>
            <Text style={styles.questPts}>{q.points}pts</Text>
            <Text style={styles.questCo2}>-{q.carbon_saving}kg</Text>
          </View>
        </View>
      ))}

      {/* Community Carbon Pool */}
      <View style={styles.poolCard}>
        <Text style={styles.poolTitle}>🌳 Community Carbon Pool</Text>
        <Text style={styles.poolDesc}>Your squads have collectively saved</Text>
        <Text style={styles.poolNum}>{squadSavings.toFixed(1)} kg CO₂</Text>
        <Text style={styles.poolDesc}>funding <Text style={{ fontWeight: '700', color: '#1D9E75' }}>{Math.floor(squadSavings / 20)} trees</Text> via SankalpTaru NGO</Text>
        <View style={styles.ngoCard}>
          <Text style={styles.ngoName}>🤝 SankalpTaru Foundation</Text>
          <Text style={styles.ngoDesc}>Verified tree-planting NGO · 1 tree per 20 kg CO₂ saved</Text>
        </View>
      </View>

      {/* Recent activity */}
      {logs.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {logs.map(log => (
            <View key={log.id} style={styles.logRow}>
              <Text style={styles.logName}>{log.item_name}</Text>
              <Text style={styles.logVal}>{log.carbon_value} kg CO₂</Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5faf8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 28, backgroundColor: '#1D9E75' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  signOutText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  planetCard: { backgroundColor: '#fff', margin: 16, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#d4e4dc' },
  planetEmoji: { fontSize: 64, marginBottom: 8 },
  planetStatus: { fontSize: 16, fontWeight: '600', color: '#1a2e25', marginBottom: 4 },
  planetScore: { fontSize: 13, color: '#6b8c7d', marginBottom: 12 },
  progressBg: { width: '100%', height: 8, backgroundColor: '#e8f0ec', borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: '#aaa', marginTop: 6 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#d4e4dc' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#1D9E75' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', paddingHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d4e4dc' },
  questEmoji: { fontSize: 24, marginRight: 12 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 14, fontWeight: '600', color: '#1a2e25' },
  questDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  questPoints: { alignItems: 'flex-end' },
  questPts: { fontSize: 13, fontWeight: '700', color: '#1D9E75' },
  questCo2: { fontSize: 11, color: '#aaa' },
  poolCard: { backgroundColor: '#1a2e25', margin: 16, borderRadius: 20, padding: 20 },
  poolTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  poolDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  poolNum: { fontSize: 32, fontWeight: '700', color: '#1D9E75', marginVertical: 6 },
  ngoCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 14 },
  ngoName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  ngoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#d4e4dc' },
  logName: { fontSize: 13, color: '#333' },
  logVal: { fontSize: 13, fontWeight: '600', color: '#E8593C' },
});
