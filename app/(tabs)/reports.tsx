import { carbonReports } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [user, setUser] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadReports(user.id);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadReports(userId: string) {
    try {
      const [weekly, monthly, daily] = await Promise.all([
        carbonReports.getWeeklySummary(userId),
        carbonReports.getMonthlySummary(userId),
        carbonReports.getDailyBreakdown(userId, 7),
      ]);

      setWeeklyReport(weekly);
      setMonthlyReport(monthly);
      setDailyData(daily);
    } catch (error) {
      console.error('Error loading detailed reports:', error);
      Alert.alert('Error', 'Failed to load reports');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    if (user) await loadReports(user.id);
    setRefreshing(false);
  }

  // FIX 1: null guard added — prevents crash if report hasn't loaded
  async function shareReport() {
    const report = activeTab === 'weekly' ? weeklyReport : monthlyReport;
    if (!report) return;

    const reportType = activeTab === 'weekly' ? 'Weekly' : 'Monthly';
    const message = report.isImprovement
      ? `🌱 My ${reportType} Carbon Report: ${report.percentChange}% lower emissions than last ${reportType.toLowerCase()}! Join EcoTrace and reduce your carbon footprint. 🌍 #EcoWarrior`
      : `📊 My ${reportType} Carbon Report on EcoTrace. Let's work together to reduce emissions! 🌍 #EcoWarrior`;

    try {
      await Share.share({
        message,
        title: `${reportType} Carbon Report`,
        url: 'https://ecotrace.app',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1D9E75" />
      </View>
    );
  }

  const report = activeTab === 'weekly' ? weeklyReport : monthlyReport;
  const reportType = activeTab === 'weekly' ? 'Weekly' : 'Monthly';

  // FIX 2: clean helpers instead of || fallback trick
  const currentValue = activeTab === 'weekly' ? report?.currentWeek : report?.currentMonth;
  const previousValue = activeTab === 'weekly' ? report?.previousWeek : report?.previousMonth;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D9E75" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Carbon Reports</Text>
        <Text style={styles.subtitle}>Track your environmental impact</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
            📅 Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'monthly' && styles.tabActive]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
            📈 Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Report Card */}
      {report ? (
        <>
          <View style={styles.reportCard}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, report.isImprovement ? styles.badgeGood : styles.badgeNeutral]}>
              <Text style={styles.badgeEmoji}>{report.isImprovement ? '🎉' : '📊'}</Text>
              <Text style={styles.badgeText}>
                {report.isImprovement ? 'Great Job!' : 'Keep Going!'}
              </Text>
            </View>

            {/* Main Metric */}
            <View style={styles.mainMetric}>
              <Text style={styles.metricLabel}>Your {reportType} Change</Text>
              <View style={styles.metricRow}>
                <Text style={[styles.percentChange, report.isImprovement ? styles.positive : styles.neutral]}>
                  {report.isImprovement ? '↓' : '→'} {Math.abs(report.percentChange)}%
                </Text>
                <Text style={styles.metricSubtitle}>
                  {report.isImprovement ? 'lower' : 'vs'} last {reportType.toLowerCase()}
                </Text>
              </View>
            </View>

            {/* FIX 2 applied: explicit activeTab check instead of || fallback */}
            <View style={styles.comparisonContainer}>
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>This {reportType}</Text>
                <Text style={styles.comparisonValue}>{currentValue}</Text>
                <Text style={styles.comparisonUnit}>kg CO₂</Text>
              </View>
              <View style={styles.comparisonDivider} />
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonLabel}>Last {reportType}</Text>
                <Text style={styles.comparisonValue}>{previousValue}</Text>
                <Text style={styles.comparisonUnit}>kg CO₂</Text>
              </View>
            </View>

            {/* Share Button */}
            <TouchableOpacity style={styles.shareBtn} onPress={shareReport}>
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareBtnText}>Share Report</Text>
            </TouchableOpacity>
          </View>

          {/* Insights */}
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>💡 Insights</Text>
            {report.isImprovement ? (
              <>
                <View style={styles.insightRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.insightText}>
                    You're doing great! Keep up the sustainable habits.
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Ionicons name="leaf" size={20} color="#10B981" />
                  <Text style={styles.insightText}>
                    Your efforts would plant {Math.floor((currentValue ?? 0) / 20)} trees with SankalpTaru Foundation.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.insightRow}>
                  <Ionicons name="bulb" size={20} color="#EF9F27" />
                  <Text style={styles.insightText}>
                    Your carbon is stable. Try completing more quests to improve!
                  </Text>
                </View>
                <View style={styles.insightRow}>
                  <Ionicons name="help-circle" size={20} color="#EF9F27" />
                  <Text style={styles.insightText}>
                    Use our carbon sync to track your purchases and reduce emissions.
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Daily Breakdown */}
          {activeTab === 'weekly' && dailyData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>📅 Daily Breakdown</Text>
              <View style={styles.chartContainer}>
                {dailyData.map((day, index) => (
                  <View key={index} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(40, (day.value / Math.max(...dailyData.map((d: any) => d.value))) * 150),
                          },
                        ]}
                      />
                      <Text style={styles.barValue}>{day.value.toFixed(1)}</Text>
                    </View>
                    <Text style={styles.dayLabel}>{day.dayName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Comparison Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>🎯 Ways to Improve</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>🚗</Text>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Use Public Transport</Text>
                <Text style={styles.tipDesc}>Reduce emissions by carpooling or using buses</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>🍴</Text>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Eat More Plant-Based</Text>
                <Text style={styles.tipDesc}>Vegetarian meals have lower carbon footprints</Text>
              </View>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipIcon}>💡</Text>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Save Energy</Text>
                <Text style={styles.tipDesc}>Turn off lights and use energy-efficient appliances</Text>
              </View>
            </View>
          </View>
        </>
      ) : (
        // FIX 3: graceful empty state instead of rendering nothing
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyDesc}>Start scanning bills and completing quests to see your carbon report here!</Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  header: { paddingHorizontal: 16, paddingTop: 20, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20, gap: 10 },
  tab: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E5E7EB' },
  tabActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666', textAlign: 'center' },
  tabTextActive: { color: '#FFF' },

  reportCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 16, alignSelf: 'flex-start' },
  badgeGood: { backgroundColor: '#D1FAE5' },
  badgeNeutral: { backgroundColor: '#FEF3C7' },
  badgeEmoji: { fontSize: 16, marginRight: 6 },
  badgeText: { fontWeight: '600', fontSize: 12, color: '#065F46' },

  mainMetric: { marginBottom: 20 },
  metricLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  percentChange: { fontSize: 36, fontWeight: '800' },
  positive: { color: '#10B981' },
  neutral: { color: '#EF9F27' },
  metricSubtitle: { fontSize: 12, color: '#999', paddingBottom: 4 },

  comparisonContainer: { flexDirection: 'row', marginBottom: 20, gap: 12 },
  comparisonBox: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, alignItems: 'center' },
  comparisonDivider: { width: 1, backgroundColor: '#E5E7EB' },
  comparisonLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  comparisonValue: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 2 },
  comparisonUnit: { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },

  shareBtn: { flexDirection: 'row', backgroundColor: '#1D9E75', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  insightsCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1D9E75' },
  insightsTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  insightText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 20 },

  chartCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200 },
  barWrapper: { alignItems: 'center', flex: 1 },
  barContainer: { alignItems: 'center' },
  bar: { width: 30, backgroundColor: '#1D9E75', borderRadius: 6, marginBottom: 4 },
  barValue: { fontSize: 11, fontWeight: '600', color: '#1F2937' },
  dayLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 8, fontWeight: '500' },

  tipsCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: '#1B5E20', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tipIcon: { fontSize: 24, marginRight: 12 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  tipDesc: { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },

  // FIX 3: empty state styles
  emptyState: { marginHorizontal: 16, marginTop: 60, alignItems: 'center', paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1B5E20', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22 },
});
