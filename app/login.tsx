import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name } } });
        if (error) throw error;
      }
      router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌍</Text>
      <Text style={styles.title}>EcoTrace</Text>
      <Text style={styles.sub}>Track your planet footprint</Text>

      <View style={styles.toggle}>
        <TouchableOpacity style={[styles.tab, mode==='login' && styles.tabActive]} onPress={() => setMode('login')}>
          <Text style={[styles.tabText, mode==='login' && styles.tabTextActive]}>Log In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, mode==='signup' && styles.tabActive]} onPress={() => setMode('signup')}>
          <Text style={[styles.tabText, mode==='signup' && styles.tabTextActive]}>Sign Up</Text>
        </TouchableOpacity>
      </View>

      {mode === 'signup' && (
        <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
      )}
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>}
      </TouchableOpacity>
    </View>
  );
}

const G = '#1D9E75';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf9', alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a2e25' },
  sub: { fontSize: 14, color: '#6b8c7d', marginBottom: 32 },
  toggle: { flexDirection: 'row', backgroundColor: '#e8f0ec', borderRadius: 12, padding: 4, marginBottom: 20, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#6b8c7d', fontWeight: '500' },
  tabTextActive: { color: G, fontWeight: '600' },
  input: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d4e4dc', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 12 },
  error: { color: 'red', fontSize: 13, marginBottom: 10 },
  btn: { width: '100%', backgroundColor: G, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});