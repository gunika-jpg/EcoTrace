import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    init();
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        refreshData();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [activeSquad?.id, view]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) await refreshData(user.id);
    setLoading(false);
  }

  async function refreshData(userId = user?.id) {
    if (!userId) return;
    setRefreshing(true);
    const { data: squadsData } = await supabase
      .from('squad_members')
      .select('*, squads(*)')
      .eq('user_id', userId);
    
    if (squadsData) setMySquads(squadsData);
    if (activeSquad && view === 'leaderboard') await fetchLeaderboard(activeSquad.id);
    setRefreshing(false);
  }

  // --- MODIFIED FUNCTION ---
  async function fetchLeaderboard(squadId: string) {
    const { data } = await supabase
      .from('squad_members')
      .select('*, users!inner(name, email, total_carbon_score)')
      .eq('squad_id', squadId)
      // Change: ascending: true puts the lowest carbon score at the top
      .order('users(total_carbon_score)', { ascending: true });
    if (data) setLeaderboard(data);
  }

  async function createSquad() {
    if (!squadName.trim()) { Alert.alert('Error', 'Enter a squad name'); return; }
    setLoading(true);
    try {
      const { data: squad, error: e } = await supabase
        .from('squads')
        .insert({ name: squadName.trim(), description: squadDesc.trim(), created_by: user.id })
        .select().single();
      if (e) throw e;
      
      await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id, role: 'admin' });
      
      setSquadName('');
      setSquadDesc('');
      await refreshData();
      setView('home');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setLoading(false);
  }

  async function joinSquad() {
    if (!inviteCode.trim()) { Alert.alert('Error', 'Enter invite code'); return; }
    setLoading(true);
    try {
      const { data: squad, error: e } = await supabase.from('squads').select('*').eq('invite_code', inviteCode.trim()).single();
      if (e || !squad) throw new Error('Squad not found');
      
      const { error: joinErr } = await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id });
      if (joinErr) throw new Error('Already a member or failed to join');
      
      setInviteCode('');
      await refreshData();
      setView('home');
    } catch (e: any) { Alert.alert('Error', e.message); }
    setLoading(false);
  }

  // UI HELPERS
  const totalSquadKg = leaderboard.reduce((acc, m) => acc + (m.users?.total_carbon_score || 0), 0);
  
  // MODIFIED: We still calculate the max score across the group 
  // so the progress bars show the relative difference between members.
  const maxScore = leaderboard.length > 0 
    ? Math.max(...leaderboard.map(m => m.users?.total_carbon_score || 0), 1) 
    : 1;
    
  const MEDAL = ['🥇', '🥈', '🥉'];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  // --- LEADERBOARD VIEW ---
  if (view === 'leaderboard') return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refreshData()} />}>
      <View style={styles.headerGradient}>
        <TouchableOpacity onPress={() => setView('home')}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitleLarge}>{activeSquad?.name}</Text>
        <Text style={styles.headerSubLight}>Live Rankings</Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}><Text style={styles.statNum}>{leaderboard.length}</Text><Text style={styles.statLabel}>Members</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, {color: '#10B981'}]}>{totalSquadKg.toFixed(1)}</Text><Text style={styles.statLabel}>kg Total</Text></View>
        <TouchableOpacity style={[styles.statCard, {backgroundColor: '#EEF2FF'}]} onPress={() => refreshData()}><Text style={{fontSize: 18}}>🔄</Text><Text style={styles.statLabel}>Sync</Text></TouchableOpacity>
      </View>
      <View style={styles.leaderboardSection}>
        {leaderboard.map((member, i) => (
          <View key={member.id} style={[styles.rankRow, i === 0 && styles.rankRowGold]}>
            <View style={styles.rankBadge}><Text style={styles.rankText}>{MEDAL[i] || i + 1}</Text></View>
            <View style={styles.rankMain}>
              <Text style={styles.rankName}>{member.users?.name || 'Member'}{member.role === 'admin' && ' 👑'}</Text>
              <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${((member.users?.total_carbon_score || 0) / maxScore) * 100}%` }]} /></View>
            </View>
            <View style={styles.rankValue}><Text style={styles.valAmount}>{(member.users?.total_carbon_score || 0).toFixed(1)}</Text><Text style={styles.valUnit}>kg</Text></View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // --- CREATE VIEW ---
  if (view === 'create') return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <TouchableOpacity onPress={() => setView('home')}><Text style={styles.backText}>← Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitleLarge}>Create Squad</Text>
      </View>
      <View style={styles.formPadding}>
        <Text style={styles.label}>Squad Name</Text>
        <TextInput style={styles.input} value={squadName} onChangeText={setSquadName} placeholder="e.g. Eco Warriors" />
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput style={[styles.input, {height: 80}]} value={squadDesc} onChangeText={setSquadDesc} placeholder="What is your goal?" multiline />
        <TouchableOpacity style={styles.submitBtn} onPress={createSquad}><Text style={styles.submitBtnText}>Create Squad</Text></TouchableOpacity>
      </View>
    </View>
  );

  // --- JOIN VIEW ---
  if (view === 'join') return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <TouchableOpacity onPress={() => setView('home')}><Text style={styles.backText}>← Cancel</Text></TouchableOpacity>
        <Text style={styles.headerTitleLarge}>Join Squad</Text>
      </View>
      <View style={styles.formPadding}>
        <Text style={styles.label}>Invite Code</Text>
        <TextInput style={styles.input} value={inviteCode} onChangeText={setInviteCode} placeholder="Enter 8-digit code" autoCapitalize="none" />
        <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#10B981'}]} onPress={joinSquad}><Text style={styles.submitBtnText}>Join Squad</Text></TouchableOpacity>
      </View>
    </View>
  );

  // --- HOME VIEW ---
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
        <TouchableOpacity key={m.id} style={styles.squadListItem} onPress={() => { setActiveSquad(m.squads); fetchLeaderboard(m.squads.id); setView('leaderboard'); }}>
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
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 12 },
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
  formPadding: { padding: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 15, fontSize: 16 },
  submitBtn: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 }
});