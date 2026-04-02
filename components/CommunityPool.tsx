import { utilityBills } from '@/lib/db';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface CommunityStats {
  totalEnergyCarbon: number;
  totalPotentialSavings: number;
  totalTreesPlantable: number;
  totalSavingsINR: number;
}

export default function CommunityPool() {
  const [stats, setStats] = useState<CommunityStats>({
    totalEnergyCarbon: 0,
    totalPotentialSavings: 0,
    totalTreesPlantable: 0,
    totalSavingsINR: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const [energyCarbon, savingsData] = await Promise.all([
        utilityBills.getCommunityBillCarbon(),
        utilityBills.getCommunityPotentialSavings(),
      ]);

      setStats({
        totalEnergyCarbon: energyCarbon,
        totalPotentialSavings: savingsData.total_savings_co2,
        totalTreesPlantable: savingsData.trees_that_can_be_planted,
        totalSavingsINR: savingsData.total_savings_inr,
      });
    } catch (error) {
      console.error('Error loading community pool:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await init();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      scrollEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9E75" />}
    >
      {/* Main Community Pool Card */}
      <View style={styles.poolCard}>
        <Text style={styles.poolIcon}>🌳</Text>
        <Text style={styles.poolTitle}>Community Pool</Text>
        
        <View style={styles.mainMetric}>
          <Text style={styles.mainLabel}>Energy Carbon Tracked</Text>
          <Text style={styles.mainValue}>{stats.totalEnergyCarbon.toFixed(1)} kg CO₂</Text>
        </View>

        <View style={styles.divider} />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Potential Savings */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Potential Savings</Text>
            <Text style={styles.statValue}>{stats.totalPotentialSavings.toFixed(1)}</Text>
            <Text style={styles.statUnit}>kg CO₂</Text>
            <View style={styles.savingsAmountBox}>
              <Text style={styles.savingsText}>₹{Math.floor(stats.totalSavingsINR).toLocaleString()}</Text>
            </View>
          </View>

          {/* Trees Plantable */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Trees Funded</Text>
            <Text style={styles.statValue}>{stats.totalTreesPlantable}</Text>
            <Text style={styles.statUnit}>🌱 trees</Text>
            <View style={styles.treePartnerBox}>
              <Text style={styles.partnerText}>SankalpTaru</Text>
            </View>
          </View>
        </View>

        {/* Insights Section */}
        <View style={styles.insightsBox}>
          <Text style={styles.insightsTitle}>💡 Community Impact</Text>
          <View style={styles.insightRow}>
            <Text style={styles.insightText}>
              ✅ The community has tracked {stats.totalEnergyCarbon.toFixed(0)} kg CO₂ from electricity bills
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightText}>
              💚 By following savings plans, we can prevent {stats.totalPotentialSavings.toFixed(0)} kg more CO₂
            </Text>
          </View>
          <View style={styles.insightRow}>
            <Text style={styles.insightText}>
              🌍 This equals planting {stats.totalTreesPlantable} trees through SankalpTaru Foundation partnership
            </Text>
          </View>
        </View>

        {/* NGO Partnership */}
        <View style={styles.ngoCard}>
          <Text style={styles.ngoTitle}>🤝 Partnership</Text>
          <Text style={styles.ngoName}>SankalpTaru Foundation</Text>
          <Text style={styles.ngoDesc}>
            1 tree planted for every 20 kg CO₂ saved through energy efficiency initiatives
          </Text>
          <View style={styles.ngoStats}>
            <View style={styles.ngoStat}>
              <Text style={styles.ngoStatValue}>{stats.totalTreesPlantable}</Text>
              <Text style={styles.ngoStatLabel}>Trees</Text>
            </View>
            <View style={styles.ngoStat}>
              <Text style={styles.ngoStatValue}>{Math.floor(stats.totalSavingsINR / 100)}</Text>
              <Text style={styles.ngoStatLabel}>Contributions</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 0,
  },
  
  poolCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#1D9E75',
  },

  poolIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  poolTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 16,
  },

  mainMetric: {
    marginBottom: 16,
  },

  mainLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  mainValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1D9E75',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },

  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 2,
  },

  statUnit: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },

  savingsAmountBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
  },

  treePartnerBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  partnerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1B5E20',
  },

  insightsBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF9F27',
  },

  insightsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },

  insightRow: {
    marginBottom: 8,
  },

  insightText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
    fontWeight: '500',
  },

  ngoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1D9E75',
  },

  ngoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },

  ngoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 4,
  },

  ngoDesc: {
    fontSize: 11,
    color: '#555',
    lineHeight: 16,
    marginBottom: 12,
  },

  ngoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  ngoStat: {
    alignItems: 'center',
  },

  ngoStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D9E75',
  },

  ngoStatLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});