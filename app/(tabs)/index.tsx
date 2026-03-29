import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Planet from '../../components/Planet';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function HomeScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [quests, setQuests] = useState<any[]>([]);
  const [squadSavings, setSquadSavings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    init(); 
  }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [prof, logsData, questsData, squadData] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('carbon_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(5),
        supabase.from('quests').select('*').eq('is_active', true).limit(4),
        supabase.from('squad_members').select('squads(total_savings)').eq('user_id', user.id),
      ]);

      if (prof.data) setProfile(prof.data);
      if (logsData.data) setLogs(logsData.data);
      if (questsData.data) setQuests(questsData.data);
      if (squadData.data) {
        const total = squadData.data.reduce((sum: number, m: any) => sum + (m.squads?.total_savings || 0), 0);
        setSquadSavings(total);
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

  const score = profile?.total_carbon_score || 0;
  const planetStatus: 'good' | 'neutral' | 'bad' = score > 50 ? 'good' : score > 20 ? 'neutral' : 'bad';
  
  // FIX: Split by space to get the full first name
  const firstName = profile?.name ? profile.name.split(' ')[0] : 'Eco Warrior';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D5A27" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={isWeb ? { alignItems: 'center' } : {}}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2D5A27" />}
    >
      <View style={styles.contentWrapper}>
        {/* Visual Top Background Accent */}
        <View style={styles.topAccent} />

        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {firstName} 👋</Text>
            <Text style={styles.headerSub}>Your impact matters.</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
             <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Main Animated Planet Card */}
        <View style={styles.planetCard}>
          <View style={styles.planetStatusBadge}>
            <View style={[styles.statusDot, { backgroundColor: planetStatus === 'good' ? '#4ADE80' : '#FBBF24' }]} />
            <Text style={styles.planetStatusText}>{planetStatus.toUpperCase()} HEALTH</Text>
          </View>
          
          <View style={styles.planetContainer}>
             <Planet health={planetStatus} />
          </View>

          <Text style={styles.planetScore}>{score.toFixed(1)} <Text style={styles.unit}>kg CO₂ saved</Text></Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBg}>
              <View style={[
                styles.progressFill, 
                { width: `${Math.min((score / 100) * 100, 100)}%`, 
                  backgroundColor: planetStatus === 'good' ? '#2D5A27' : '#8B9D83' }
              ]} />
            </View>
            <Text style={styles.progressLabel}>Daily Goal: 100kg</Text>
          </View>
        </View>

        {/* Stats Quick View */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>WEEKLY</Text>
            <Text style={styles.statNum}>{profile?.weekly_carbon_score?.toFixed(1) || '0'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL SCANS</Text>
            <Text style={styles.statNum}>{logs.length}</Text>
          </View>
        </View>

        {/* Quests Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Quests</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        
        {quests.map(q => (
          <TouchableOpacity key={q.id} style={styles.questCard}>
            <View style={styles.questIconBg}>
              <Text style={styles.questEmoji}>{q.icon || '🌱'}</Text>
            </View>
            <View style={styles.questInfo}>
              <Text style={styles.questTitle}>{q.title}</Text>
              <Text style={styles.questDesc} numberOfLines={1}>{q.description}</Text>
            </View>
            <Text style={styles.questPts}>+{q.points}p</Text>
          </TouchableOpacity>
        ))}

        {/* Community Impact Card */}
        <View style={styles.poolCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.poolTitle}>Global Impact</Text>
            <Text style={styles.poolDesc}>EcoTrace community savings</Text>
          </View>
          <Text style={styles.poolNum}>{squadSavings.toFixed(0)}kg</Text>
        </View>

        <View style={{ height: 100 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFDFA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FBFDFA' },
  
  // Constrains width on Web so it doesn't stretch
  contentWrapper: {
    width: '100%',
    maxWidth: '100%', // Mobile width for Web
    minHeight: '100%',
  },

  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: '#2D5A27', 
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 50,
    paddingBottom: 25,
    zIndex: 10
  },
  greeting: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  
  logoutBtn: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.3)'
  },
  logoutBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  
  planetCard: { 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 20, 
    borderRadius: 32, 
    padding: 24, 
    alignItems: 'center', 
    shadowColor: '#1A2E25',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.12,
    shadowRadius: 25,
    elevation: 10,
  },
  planetStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  planetStatusText: { fontSize: 10, fontWeight: '800', color: '#4A5D4E', letterSpacing: 1 },
  planetContainer: { height: 180, justifyContent: 'center' },
  planetScore: { fontSize: 34, fontWeight: '800', color: '#1A2E25', marginTop: 15 },
  unit: { fontSize: 16, color: '#8B9D83', fontWeight: '400' },
  progressContainer: { width: '100%', marginTop: 20 },
  progressBg: { width: '100%', height: 8, backgroundColor: '#F1F5F0', borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 11, color: '#A0AEC0', marginTop: 8, textAlign: 'center', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 15, paddingHorizontal: 20, marginTop: 25 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#F1F5F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2
  },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#8B9D83', letterSpacing: 1, marginBottom: 6 },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1A2E25' },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    marginTop: 35, 
    marginBottom: 15 
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A2E25' },
  seeAll: { color: '#2D5A27', fontWeight: '700', fontSize: 14 },
  
  questCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 20, 
    marginBottom: 12, 
    borderRadius: 24, 
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F0',
  },
  questIconBg: { 
    width: 52, height: 52, 
    backgroundColor: '#F1F5F0', 
    borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center' 
  },
  questEmoji: { fontSize: 26 },
  questInfo: { flex: 1, marginLeft: 15 },
  questTitle: { fontSize: 16, fontWeight: '700', color: '#1A2E25' },
  questDesc: { fontSize: 13, color: '#8B9D83', marginTop: 2 },
  questPts: { fontSize: 15, fontWeight: '800', color: '#2D5A27', marginLeft: 10 },

  poolCard: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A2E25', 
    margin: 20, 
    borderRadius: 28, 
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  poolTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  poolDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  poolNum: { fontSize: 32, fontWeight: '800', color: '#4ADE80' },
});