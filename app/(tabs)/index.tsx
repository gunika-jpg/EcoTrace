import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Planet from '../../components/Planet';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [squadSavings, setSquadSavings] = useState(0);
  const [globalImpact, setGlobalImpact] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prof, logsData, questsData, squadData, globalData, userQuestsData] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('carbon_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(5),
        supabase.from('quests').select('*').eq('is_active', true).limit(4),
        supabase.from('squad_members').select('squads(total_savings)').eq('user_id', user.id),
        supabase.from('carbon_logs').select('carbon_value'),
        supabase.from('user_quests').select('quest_id').eq('user_id', user.id).eq('status', 'completed'),
      ]);

      if (prof.data) setProfile(prof.data);
      if (logsData.data) setLogs(logsData.data);
      if (questsData.data) setQuests(questsData.data);
      if (squadData.data) {
        const total = squadData.data.reduce((sum: number, m: any) => sum + (m.squads?.total_savings || 0), 0);
        setSquadSavings(total);
      }
      if (globalData.data) {
        const total = globalData.data.reduce((sum: number, r: any) => sum + (r.carbon_value || 0), 0);
        setGlobalImpact(parseFloat(total.toFixed(1)));
      }
      if (userQuestsData.data) {
        setCompletedQuests(new Set(userQuestsData.data.map((q: any) => q.quest_id)));
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  }

  async function completeQuest(quest: any) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (completedQuests.has(quest.id)) {
        Alert.alert('Already Done!', `You already completed "${quest.title}" this week! 🌱`);
        return;
      }

      // Mark quest as complete
      await supabase.from('user_quests').upsert({
        user_id: user.id,
        quest_id: quest.id,
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        week_start: new Date().toISOString().split('T')[0],
      });

      // Log carbon saving
      await supabase.from('carbon_logs').insert({
        user_id: user.id,
        item_name: quest.title,
        carbon_value: quest.carbon_saving,
        category: 'other',
        source: 'quest',
      });

      // Update user score
      const newScore = (profile?.total_carbon_score || 0) + quest.carbon_saving;
      await supabase.from('users').update({ total_carbon_score: newScore }).eq('id', user.id);

      setCompletedQuests(prev => new Set([...prev, quest.id]));
      Alert.alert('Quest Complete! 🎉', `+${quest.points} points earned!\n-${quest.carbon_saving} kg CO₂ saved!`);
      await init();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not complete quest. Try again.');
    }
  }

  const score = profile?.total_carbon_score || 0;
  const planetStatus: 'good' | 'neutral' | 'bad' = score > 50 ? 'good' : score > 20 ? 'neutral' : 'bad';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9E75" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.name || 'Eco Warrior'} 👋</Text>
          <Text style={styles.headerSub}>Your planet is looking {planetStatus} today.</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Planet Card */}
      <View style={styles.planetCard}>
        <Planet health={planetStatus} />
        <Text style={styles.planetStatus}>Status: {planetStatus.toUpperCase()}</Text>
        <Text style={styles.planetScore}>{score.toFixed(1)} kg CO₂ saved</Text>
        <View style={styles.progressBg}>
          <View style={[
            styles.progressFill,
            { width: `${Math.min((score / 100) * 100, 100)}%`,
              backgroundColor: planetStatus === 'good' ? '#1D9E75' : '#EF9F27' }
          ]} />
        </View>
        <Text style={styles.progressLabel}>Goal: 100kg CO₂</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile?.weekly_carbon_score?.toFixed(1) || '0'}</Text>
          <Text style={styles.statLabel}>Weekly (kg)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{logs.length}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
      </View>

      {/* Quests */}
      <Text style={styles.sectionTitle}>Active Quests 🌿</Text>
      <Text style={styles.sectionHint}>Tap a quest to mark it complete</Text>
      {quests.map(q => {
        const done = completedQuests.has(q.id);
        return (
          <TouchableOpacity
            key={q.id}
            style={[styles.questCard, done && styles.questCardDone]}
            onPress={() => completeQuest(q)}
            activeOpacity={0.7}
          >
            <Text style={styles.questEmoji}>{q.icon || '🌱'}</Text>
            <View style={styles.questInfo}>
              <Text style={[styles.questTitle, done && styles.questTitleDone]}>{q.title}</Text>
              <Text style={styles.questDesc}>{q.description}</Text>
              {done && <Text style={styles.questDoneLabel}>✓ Completed this week</Text>}
            </View>
            <View style={[styles.questPoints, done && styles.questPointsDone]}>
              <Text style={[styles.questPts, done && styles.questPtsDone]}>+{q.points}p</Text>
              <Text style={styles.questCo2}>-{q.carbon_saving}kg</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Community Pool */}
      <View style={styles.poolCard}>
        <Text style={styles.poolTitle}>🌳 Global Impact</Text>
        <Text style={styles.poolDesc}>EcoTrace community savings</Text>
        <Text style={styles.poolNum}>{globalImpact} kg CO₂</Text>
        <Text style={styles.poolDesc}>All users combined carbon saved</Text>
        <View style={styles.ngoCard}>
          <Text style={styles.ngoName}>🤝 SankalpTaru Foundation</Text>
          <Text style={styles.ngoDesc}>Verified tree-planting NGO · 1 tree per 20 kg CO₂ saved</Text>
          <Text style={styles.ngoDesc}>Trees funded: {Math.floor(globalImpact / 20)} 🌳</Text>
        </View>
      </View>

      {/* Recent Logs */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {logs.length > 0 ? (
        logs.map(log => (
          <View key={log.id} style={styles.logRow}>
            <Text style={styles.logName}>{log.item_name}</Text>
            <Text style={styles.logVal}>-{log.carbon_value} kg</Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No scans yet. Try syncing a bill!</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5faf8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1D9E75' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  signOutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  signOutText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  planetCard: { backgroundColor: '#fff', margin: 16, borderRadius: 24, padding: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  planetStatus: { fontSize: 16, fontWeight: '700', color: '#1a2e25', marginBottom: 4 },
  planetScore: { fontSize: 13, color: '#6b8c7d', marginBottom: 16 },
  progressBg: { width: '100%', height: 10, backgroundColor: '#e8f0ec', borderRadius: 5 },
  progressFill: { height: 10, borderRadius: 5 },
  progressLabel: { fontSize: 11, color: '#aaa', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#d4e4dc' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1D9E75' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#444', paddingHorizontal: 16, marginTop: 24, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHint: { fontSize: 12, color: '#999', paddingHorizontal: 16, marginBottom: 10 },
  questCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#d4e4dc' },
  questCardDone: { backgroundColor: '#f0faf5', borderColor: '#1D9E75' },
  questEmoji: { fontSize: 26, marginRight: 15 },
  questInfo: { flex: 1 },
  questTitle: { fontSize: 15, fontWeight: '600', color: '#1a2e25' },
  questTitleDone: { color: '#1D9E75' },
  questDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  questDoneLabel: { fontSize: 11, color: '#1D9E75', marginTop: 4, fontWeight: '600' },
  questPoints: { backgroundColor: '#e8f5f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  questPointsDone: { backgroundColor: '#1D9E75' },
  questPts: { fontSize: 13, fontWeight: '700', color: '#1D9E75' },
  questPtsDone: { color: '#fff' },
  questCo2: { fontSize: 10, color: '#aaa', marginTop: 2 },
  poolCard: { backgroundColor: '#1a2e25', margin: 16, borderRadius: 24, padding: 25 },
  poolTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  poolDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  poolNum: { fontSize: 36, fontWeight: '800', color: '#1D9E75', marginVertical: 10 },
  ngoCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginTop: 14 },
  ngoName: { fontSize: 13, fontWeight: '600', color: '#fff' },
  ngoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#d4e4dc' },
  logName: { fontSize: 14, color: '#333' },
  logVal: { fontSize: 14, fontWeight: '700', color: '#E8593C' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 10 }
});
