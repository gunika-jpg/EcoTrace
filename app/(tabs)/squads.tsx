import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function SquadsScreen() {
  const [user, setUser] = useState<any>(null);
  const [mySquads, setMySquads] = useState<any[]>([]);
  const [activeSquad, setActiveSquad] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'home' | 'create' | 'join' | 'leaderboard'>('home');
  const [squadName, setSquadName] = useState('');
  const [squadDesc, setSquadDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    init();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshData();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [activeSquad, view]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) await refreshData(user.id);
    setLoading(false);
  }

  async function refreshData(userId = user?.id) {
    if (!userId) return;
    const { data: squadsData } = await supabase
      .from('squad_members')
      .select('*, squads(*)')
      .eq('user_id', userId);
    if (squadsData) setMySquads(squadsData);
    if (activeSquad && view === 'leaderboard') {
      await fetchLeaderboard(activeSquad.id);
    }
  }

  async function fetchLeaderboard(squadId: string) {
    // We pull the user's REAL score from the 'users' join
    const { data, error } = await supabase
      .from('squad_members')
      .select('*, users!inner(name, email, total_carbon_score)')
      .eq('squad_id', squadId)
      .order('weekly_contribution', { ascending: false });
    
    if (data) {
      setLeaderboard(data);
    }
  }

  async function openLeaderboard(squad: any) {
    setActiveSquad(squad);
    await fetchLeaderboard(squad.id);
    setView('leaderboard');
  }

  const handleShare = async (code: string) => {
    try {
      await Share.share({ message: `Join my Squad on CarbonSync! Code: ${code}` });
    } catch (e) { console.log(e); }
  };

  async function createSquad() {
    if (!squadName.trim()) { setError('Enter a name'); return; }
    try {
      const { data: squad, error: e } = await supabase
        .from('squads')
        .insert({ name: squadName.trim(), description: squadDesc.trim(), created_by: user.id })
        .select().single();
      if (e) throw e;
      await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id, role: 'admin' });
      await refreshData();
      setView('home');
    } catch (e: any) { setError(e.message); }
  }

  async function joinSquad() {
    if (!inviteCode.trim()) { setError('Enter code'); return; }
    try {
      const { data: squad, error: e } = await supabase.from('squads').select('*').eq('invite_code', inviteCode.trim()).single();
      if (e) throw new Error('Squad not found');
      await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id });
      await refreshData();
      setView('home');
    } catch (e: any) { setError(e.message); }
  }

  const MEDAL = ['🥇', '🥈', '🥉'];
  // Find max score for the progress bar scaling
  const maxScore = Math.max(...leaderboard.map(m => m.users?.total_carbon_score || 0), 1);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  if (view === 'leaderboard') return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshData()} />}>
      <View style={styles.headerGradient}>
        <TouchableOpacity onPress={() => setView('home')}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitleLarge}>{activeSquad?.name}</Text>
        <Text style={styles.headerSubLight}>Live Rankings</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statNum}>{leaderboard.length}</Text><Text style={styles.statLabel}>Members</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, {color: '#10B981'}]}>{activeSquad?.total_savings?.toFixed(1) || '0'}</Text><Text style={styles.statLabel}>kg Total</Text></View>
        <TouchableOpacity style={[styles.statCard, {backgroundColor: '#EEF2FF'}]} onPress={() => refreshData()}><Text style={{fontSize: 18}}>🔄</Text><Text style={styles.statLabel}>Sync</Text></TouchableOpacity>
      </View>

      <View style={styles.leaderboardSection}>
        {leaderboard.map((member, i) => {
          // KEY CHANGE: Use users.total_carbon_score if weekly_contribution is 0
          const displayScore = member.users?.total_carbon_score || 0;
          
          return (
            <View key={member.id} style={[styles.rankRow, i === 0 && styles.rankRowGold]}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>{MEDAL[i] || i + 1}</Text></View>
              <View style={styles.rankMain}>
                <Text style={styles.rankName}>
                  {member.users?.name || 'Member'}
                  {member.role === 'admin' && <Text style={{fontSize: 12}}> 👑</Text>}
                </Text>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${(displayScore / maxScore) * 100}%` }]} />
                </View>
              </View>
              <View style={styles.rankValue}>
                  <Text style={styles.valAmount}>{displayScore.toFixed(1)}</Text>
                  <Text style={styles.valUnit}>kg</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshData()} />}>
      <View style={styles.homeHeader}>
        <Text style={styles.welcomeText}>CarbonSync</Text>
        <Text style={styles.homeTitle}>Social Squads</Text>
      </View>

      <View style={styles.mainActions}>
        <TouchableOpacity style={[styles.heroBtn, { backgroundColor: '#4F46E5' }]} onPress={() => setView('create')}><Text style={styles.heroBtnText}>+ Create</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.heroBtn, { backgroundColor: '#10B981' }]} onPress={() => setView('join')}><Text style={styles.heroBtnText}>🔗 Join</Text></TouchableOpacity>
      </View>

      <Text style={styles.listHeader}>Your Squads</Text>
      {mySquads.map((m) => (
        <TouchableOpacity key={m.id} style={styles.squadListItem} onPress={() => openLeaderboard(m.squads)}>
          <View style={styles.squadIconBox}><Text style={styles.squadIconText}>{m.squads?.name?.charAt(0)}</Text></View>
          <View style={styles.squadMainInfo}>
            <Text style={styles.squadTitleText}>{m.squads?.name}</Text>
            <Text style={styles.codeTag}>Code: {m.squads?.invite_code} • {m.role}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { backgroundColor: '#4F46E5', padding: 24, paddingTop: 40, borderBottomLeftRadius: 30 },
  headerTitleLarge: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  headerSubLight: { color: '#C7D2FE', fontSize: 14 },
  backText: { color: '#FFF', marginBottom: 10, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginTop: -30, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 5 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  leaderboardSection: { padding: 20 },
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 12, elevation: 1 },
  rankRowGold: { borderColor: '#FDE047', borderWidth: 2 },
  rankBadge: { width: 40 },
  rankText: { fontSize: 18, fontWeight: '700', color: '#9CA3AF' },
  rankMain: { flex: 1 },
  rankName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  progressBg: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 10, marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#4F46E5', borderRadius: 10 },
  rankValue: { alignItems: 'flex-end', marginLeft: 10 },
  valAmount: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  valUnit: { fontSize: 10, color: '#9CA3AF' },
  homeHeader: { padding: 24, paddingTop: 50 },
  welcomeText: { color: '#6366f1', fontWeight: '700' },
  homeTitle: { fontSize: 32, fontWeight: '800', color: '#111827' },
  mainActions: { flexDirection: 'row', gap: 15, paddingHorizontal: 24, marginBottom: 25 },
  heroBtn: { flex: 1, padding: 20, borderRadius: 20, alignItems: 'center' },
  heroBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  listHeader: { fontSize: 18, fontWeight: '700', paddingHorizontal: 24, marginBottom: 15 },
  squadListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 24, marginBottom: 12, padding: 16, borderRadius: 20 },
  squadIconBox: { width: 50, height: 50, backgroundColor: '#EEF2FF', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  squadIconText: { fontSize: 22, fontWeight: '800', color: '#4F46E5' },
  squadMainInfo: { flex: 1, marginLeft: 15 },
  squadTitleText: { fontSize: 16, fontWeight: '700' },
  codeTag: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  chevron: { fontSize: 24, color: '#D1D5DB' },
});