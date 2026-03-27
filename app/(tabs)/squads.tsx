import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, ScrollView, RefreshControl
} from 'react-native';
import { supabase } from '@/lib/supabase';

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

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) await fetchMySquads(user.id);
    setLoading(false);
  }

  async function fetchMySquads(userId: string) {
    const { data } = await supabase
      .from('squad_members')
      .select('*, squads(*)')
      .eq('user_id', userId);
    if (data) setMySquads(data);
  }

  async function fetchLeaderboard(squadId: string) {
    const { data } = await supabase
      .from('squad_members')
      .select('*, users(name, email, total_carbon_score)')
      .eq('squad_id', squadId)
      .order('weekly_contribution', { ascending: false });
    if (data) setLeaderboard(data);
  }

  async function openLeaderboard(squad: any) {
    setActiveSquad(squad);
    await fetchLeaderboard(squad.id);
    setView('leaderboard');

    // Live updates via Supabase Realtime
    supabase
      .channel(`squad-${squad.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'squad_members',
        filter: `squad_id=eq.${squad.id}`
      }, () => fetchLeaderboard(squad.id))
      .subscribe();
  }

  async function createSquad() {
    setError('');
    if (!squadName.trim()) { setError('Please enter a squad name.'); return; }
    try {
      const { data: squad, error: e } = await supabase
        .from('squads')
        .insert({ name: squadName.trim(), description: squadDesc.trim(), created_by: user.id })
        .select().single();
      if (e) throw e;
      await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id, role: 'admin' });
      setSuccess(`Squad "${squad.name}" created! Invite code: ${squad.invite_code}`);
      setSquadName(''); setSquadDesc('');
      await fetchMySquads(user.id);
      setView('home');
    } catch (e: any) { setError(e.message); }
  }

  async function joinSquad() {
    setError('');
    if (!inviteCode.trim()) { setError('Please enter an invite code.'); return; }
    try {
      const { data: squad, error: e } = await supabase
        .from('squads').select('*').eq('invite_code', inviteCode.trim()).single();
      if (e) throw new Error('Squad not found. Check your invite code.');
      await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id });
      setSuccess(`Joined "${squad.name}" successfully!`);
      setInviteCode('');
      await fetchMySquads(user.id);
      setView('home');
    } catch (e: any) { setError(e.message); }
  }

  async function onRefresh() {
    setRefreshing(true);
    if (user) await fetchMySquads(user.id);
    if (activeSquad && view === 'leaderboard') await fetchLeaderboard(activeSquad.id);
    setRefreshing(false);
  }

  const MEDAL = ['🥇', '🥈', '🥉'];

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#3C3489" />
    </View>
  );

  // ── LEADERBOARD VIEW ──
  if (view === 'leaderboard') return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView('home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeSquad?.name}</Text>
        <Text style={styles.headerSub}>Live Leaderboard • updates in real time</Text>
      </View>

      {/* Squad stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{leaderboard.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{activeSquad?.total_savings?.toFixed(1) || '0'}</Text>
          <Text style={styles.statLabel}>kg CO₂ saved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{activeSquad?.trees_funded || '0'}</Text>
          <Text style={styles.statLabel}>Trees funded</Text>
        </View>
      </View>

      {/* Invite code */}
      <View style={styles.inviteBox}>
        <Text style={styles.inviteLabel}>Invite code</Text>
        <Text style={styles.inviteCode}>{activeSquad?.invite_code}</Text>
        <Text style={styles.inviteHint}>Share this with friends to join your squad</Text>
      </View>

      {/* Leaderboard */}
      <Text style={styles.sectionTitle}>This week's rankings</Text>
      {leaderboard.map((member, i) => (
        <View key={member.id} style={[styles.memberRow, i === 0 && styles.memberFirst]}>
          <Text style={styles.rank}>{MEDAL[i] || `#${i + 1}`}</Text>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {member.users?.name || member.users?.email?.split('@')[0] || 'Member'}
              {member.role === 'admin' && <Text style={styles.adminBadge}> 👑</Text>}
            </Text>
            <Text style={styles.memberScore}>{member.weekly_contribution || 0} kg saved this week</Text>
          </View>
          <Text style={styles.totalScore}>{member.users?.total_carbon_score?.toFixed(1) || '0'} kg</Text>
        </View>
      ))}

      {leaderboard.length === 0 && (
        <Text style={styles.empty}>No members yet. Share the invite code!</Text>
      )}
    </ScrollView>
  );

  // ── CREATE SQUAD VIEW ──
  if (view === 'create') return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView('home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a Squad</Text>
      </View>
      <View style={styles.formWrap}>
        <Text style={styles.label}>Squad name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Green Warriors Delhi" value={squadName} onChangeText={setSquadName} />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={[styles.input, { height: 80 }]} placeholder="What's your squad about?" value={squadDesc} onChangeText={setSquadDesc} multiline />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.btnPurple} onPress={createSquad}>
          <Text style={styles.btnText}>Create Squad</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── JOIN SQUAD VIEW ──
  if (view === 'join') return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView('home')}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join a Squad</Text>
      </View>
      <View style={styles.formWrap}>
        <Text style={styles.label}>Enter invite code</Text>
        <TextInput style={styles.input} placeholder="e.g. a1b2c3d4" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.btnPurple} onPress={joinSquad}>
          <Text style={styles.btnText}>Join Squad</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ── HOME VIEW ──
  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Squads 👥</Text>
        <Text style={styles.headerSub}>Team up and compete for the top spot</Text>
      </View>

      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setError(''); setView('create'); }}>
          <Text style={styles.actionEmoji}>➕</Text>
          <Text style={styles.actionLabel}>Create Squad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setError(''); setView('join'); }}>
          <Text style={styles.actionEmoji}>🔗</Text>
          <Text style={styles.actionLabel}>Join Squad</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Your Squads</Text>

      {mySquads.length === 0 && (
        <Text style={styles.empty}>You're not in any squad yet. Create or join one!</Text>
      )}

      {mySquads.map((m) => (
        <TouchableOpacity key={m.id} style={styles.squadCard} onPress={() => openLeaderboard(m.squads)}>
          <View style={styles.squadCardLeft}>
            <Text style={styles.squadName}>{m.squads?.name}</Text>
            <Text style={styles.squadDesc}>{m.squads?.description || 'Tap to view leaderboard'}</Text>
            <Text style={styles.squadMeta}>
              {m.role === 'admin' ? '👑 Admin' : '👤 Member'} · Code: {m.squads?.invite_code}
            </Text>
          </View>
          <Text style={styles.squadArrow}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const P = '#3C3489';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f7ff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 24, backgroundColor: '#EEEDFE', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: P },
  headerSub: { fontSize: 13, color: '#6b6aad', marginTop: 4 },
  back: { fontSize: 14, color: P, marginBottom: 8, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e0dfff' },
  statNum: { fontSize: 20, fontWeight: '700', color: P },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  inviteBox: { marginHorizontal: 16, backgroundColor: '#EEEDFE', borderRadius: 12, padding: 14, marginBottom: 16 },
  inviteLabel: { fontSize: 11, color: '#6b6aad', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteCode: { fontSize: 24, fontWeight: '700', color: P, letterSpacing: 2, marginVertical: 4 },
  inviteHint: { fontSize: 12, color: '#6b6aad' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#444', paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#efefff' },
  memberFirst: { borderColor: '#FFD700', borderWidth: 2 },
  rank: { fontSize: 22, width: 36 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1a1a2e' },
  adminBadge: { fontSize: 12 },
  memberScore: { fontSize: 12, color: '#888', marginTop: 2 },
  totalScore: { fontSize: 13, fontWeight: '600', color: P },
  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, padding: 32 },
  actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#e0dfff' },
  actionEmoji: { fontSize: 28, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: P },
  squadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e0dfff' },
  squadCardLeft: { flex: 1 },
  squadName: { fontSize: 16, fontWeight: '700', color: P },
  squadDesc: { fontSize: 13, color: '#777', marginTop: 2 },
  squadMeta: { fontSize: 12, color: '#aaa', marginTop: 6 },
  squadArrow: { fontSize: 24, color: '#ccc' },
  formWrap: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
  errorText: { color: 'red', fontSize: 13, marginBottom: 10 },
  btnPurple: { backgroundColor: P, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successBox: { backgroundColor: '#E1F5EE', borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  successText: { color: '#085041', fontSize: 13, fontWeight: '500' },
});
