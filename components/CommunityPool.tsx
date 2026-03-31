import { supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function CommunityPool() {
  const [totalPool, setTotalPool] = useState(0);

  useEffect(() => {
    fetchCommunityTotal();
  }, []);

  async function fetchCommunityTotal() {
    // Summing up carbon prevented from ALL users
    const { data } = await supabase
      .from('users')
      .select('total_carbon_prevented');

    if (data) {
      const total = data.reduce((sum, user) => sum + (user.total_carbon_prevented || 0), 0);
      setTotalPool(total);
    }
  }

  // 1 tree funded for every 20kg prevented (standard estimate)
  const treesFunded = Math.floor(totalPool / 20);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.emoji}>🌲</Text>
        <Text style={styles.headerText}>Community Pool</Text>
      </View>
      
      <Text style={styles.poolValue}>{totalPool.toFixed(1)} kg</Text>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Trees funded: <Text style={styles.bold}>{treesFunded}</Text> 🌲
        </Text>
        <Text style={styles.subText}>SankalpTaru Foundation Partnership</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A', // Dark navy background
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: { fontSize: 14, marginRight: 6 },
  headerText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  poolValue: {
    color: '#22C55E', // Bright green for the kg value
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  footer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  footerText: {
    color: '#F8FAFC',
    fontSize: 14,
  },
  bold: { fontWeight: 'bold' },
  subText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
});