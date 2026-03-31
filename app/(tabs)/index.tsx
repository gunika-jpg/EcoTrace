import CommunityPool from '@/components/CommunityPool'; // Ensure this file exists in /components
import Planet from '@/components/Planet';
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

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [totalScans, setTotalScans] = useState(0); 
  const [quests, setQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prof, logsData, scanCount, questsData, userQuestsData] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('carbon_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(5),
        supabase.from('carbon_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('quests').select('*').eq('is_active', true).limit(4),
        supabase.from('user_quests').select('quest_id').eq('user_id', user.id).eq('status', 'completed'),
      ]);

      if (prof.data) setProfile(prof.data);
      if (logsData.data) setLogs(logsData.data);
      if (scanCount.count !== null) setTotalScans(scanCount.count);
      if (questsData.data) setQuests(questsData.data);
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

      await supabase.from('user_quests').upsert({
        user_id: user.id,
        quest_id: quest.id,
        status: 'completed',
        progress: 100,
        completed_at: new Date().toISOString(),
        week_start: new Date().toISOString().split('T')[0],
      });

      await supabase.from('carbon_logs').insert({
        user_id: user.id,
        item_name: quest.title,
        carbon_value: quest.carbon_saving,
        category: 'other',
        source: 'quest',
      });

      const { data: profileData } = await supabase
        .from('users')
        .select('total_carbon_prevented')
        .eq('id', user.id)
        .single();

      const newPrevented = (profileData?.total_carbon_prevented || 0) + quest.carbon_saving;
      await supabase.from('users').update({ total_carbon_prevented: newPrevented }).eq('id', user.id);

      setCompletedQuests(prev => new Set([...prev, quest.id]));
      Alert.alert('Quest Complete! 🎉', `+${quest.points} points earned!\n-${quest.carbon_saving} kg CO₂ prevented!`);
      await init();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not complete quest. Try again.');
    }
  }

  const carbonTracked = profile?.total_carbon_tracked || 0;
  const carbonPrevented = profile?.total_carbon_prevented || 0;
  const netCarbon = carbonTracked - carbonPrevented;
  const monthlyTarget = 156;

  const planetStatus: 'excellent' | 'good' | 'neutral' | 'poor' =
    netCarbon < monthlyTarget * 0.3 ? 'excellent' :
    netCarbon < monthlyTarget * 0.6 ? 'good' :
    netCarbon < monthlyTarget ? 'neutral' :
    'poor';

  const getStatusEmoji = () => {
    switch (planetStatus) {
      case 'excellent': return '🌟';
      case 'good': return '🌱';
      case 'neutral': return '🤔';
      case 'poor': return '💔';
      default: return '🌍';
    }
  };

  const getProgressColor = () => {
    switch (planetStatus) {
      case 'excellent': return '#22C55E';
      case 'good': return '#1D9E75';
      case 'neutral': return '#EF9F27';
      case 'poor': return '#DC2626';
      default: return '#1D9E75';
    }
  };

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
        <Planet status={planetStatus} />
        
        <Text style={styles.planetStatus}>
          Status: {planetStatus.toUpperCase()} {getStatusEmoji()}
        </Text>
        
        <View style={styles.progressBg}>
          <View style={[
            styles.progressFill,
            { 
              width: `${Math.min((netCarbon / monthlyTarget) * 100, 100)}%`,
              backgroundColor: getProgressColor()
            }
          ]} />
        </View>
        <Text style={styles.progressLabel}>Goal: {monthlyTarget.toFixed(0)}kg CO₂/month</Text>
      </View>

      {/* Stats Row - 3 Boxes Layout */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{carbonTracked.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Tracked (kg)</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{carbonPrevented.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Prevented (kg)</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
      </View>

      {/* Active Quests */}
      <Text style={styles.sectionTitle}>🎯 Active Quests</Text>
      <View style={styles.questContainer}>
        {quests.length > 0 ? (
          quests.map((quest) => (
            <TouchableOpacity
              key={quest.id}
              style={[
                styles.questCard,
                completedQuests.has(quest.id) && styles.questCardCompleted
              ]}
              onPress={() => !completedQuests.has(quest.id) && completeQuest(quest)}
              disabled={completedQuests.has(quest.id)}
            >
              <View style={styles.questContent}>
                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={styles.questDesc}>{quest.description}</Text>
              </View>
              <View style={styles.questBadge}>
                {completedQuests.has(quest.id) ? (
                  <>
                    <Text style={styles.questPoints}>✓</Text>
                    <Text style={styles.questSaving}>Done</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.questPoints}>+{quest.points}p</Text>
                    <Text style={styles.questSaving}>-{quest.carbon_saving}kg</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noData}>No active quests today</Text>
        )}
      </View>

      {/* Community Pool Card - Placed exactly below Quests */}
      <CommunityPool />

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {logs.length > 0 ? (
        logs.map(log => (
          <View key={log.id} style={styles.logRow}>
            <Text style={styles.logName}>{log.item_name}</Text>
            <Text style={styles.logVal}>-{log.carbon_value} kg</Text>
          </View>
        ))
      ) : (
        <Text style={styles.noData}>No activity yet. Start scanning bills!</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#1B5E20' },
  headerSub: { fontSize: 14, color: '#666' },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5E9', borderRadius: 8 },
  signOutText: { color: '#1D9E75', fontWeight: '600', fontSize: 12 },
  planetCard: { backgroundColor: '#E8F5E9', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 },
  planetStatus: { fontSize: 18, fontWeight: '700', color: '#1B5E20', marginTop: 12 },
  progressBg: { width: '100%', height: 10, backgroundColor: '#D1F2EB', borderRadius: 5, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabel: { fontSize: 12, color: '#666', marginTop: 8, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#F8F9FA', 
    borderRadius: 16, 
    paddingVertical: 16, 
    paddingHorizontal: 4, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  statNum: { fontSize: 18, fontWeight: 'bold', color: '#1D9E75' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 12, marginTop: 20 },
  questContainer: { marginBottom: 10 },
  questCard: { backgroundColor: '#F0FDF4', borderLeftWidth: 4, borderLeftColor: '#1D9E75', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questCardCompleted: { opacity: 0.6, backgroundColor: '#E8F5E9' },
  questContent: { flex: 1 },
  questTitle: { fontSize: 14, fontWeight: '600', color: '#1B5E20' },
  questDesc: { fontSize: 12, color: '#666', marginTop: 4 },
  questBadge: { backgroundColor: '#1D9E75', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  questPoints: { fontSize: 12, fontWeight: '700', color: '#fff' },
  questSaving: { fontSize: 10, color: '#E8F5E9', marginTop: 2 },
  noData: { color: '#999', textAlign: 'center', paddingVertical: 12 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  logName: { fontSize: 14, color: '#333', fontWeight: '500' },
  logVal: { fontSize: 14, color: '#DC2626', fontWeight: '600' },
});