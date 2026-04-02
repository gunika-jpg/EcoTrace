import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScannedItem {
  id: string;
  name: string;
  carbonScore: number;
  category: 'High' | 'Medium' | 'Low';
}

interface BillResult {
  bill_type: string;
  billing_period: string;
  usage_amount: number;
  usage_unit: string;
  bill_amount_inr: number;
  carbon_kg: number;
  vs_india_average: string;
  energy_leaks: { issue: string; period: string; impact: string }[];
  savings_plan: { action: string; saves_inr_per_month: number; saves_co2_kg_per_month: number; difficulty: string }[];
  projected_annual_saving_inr: number;
  projected_annual_co2_saving_kg: number;
}

const RECEIPT_PROMPT = `You are a carbon footprint calculator for grocery receipts.
Extract every food/grocery item from this receipt.
For each item estimate carbon footprint in kg CO2.
Classify each as High (above 5kg), Medium (1.5-5kg), or Low (below 1.5kg).
Respond ONLY with this JSON format, no other text:
{
  "items": [
    { "name": "item name", "carbonScore": 2.4, "category": "High" }
  ],
  "total_carbon_kg": 11.2
}`;

const BILL_PROMPT = `You are an energy analyst for Indian households.
Look at this electricity or water bill image and:
1. Extract the monthly usage (kWh for electricity, kiloliters for water)
2. Compare to Indian average (electricity: 90 kWh/month, water: 5 kL/month)
3. Identify any unusual spikes or energy leaks
4. Calculate carbon footprint (India grid: 0.82 kg CO2 per kWh)
5. Give a 3-step savings plan

Respond ONLY with this exact JSON format, no other text:
{
  "bill_type": "electricity",
  "billing_period": "March 2025",
  "usage_amount": 245,
  "usage_unit": "kWh",
  "bill_amount_inr": 1840,
  "carbon_kg": 200.9,
  "vs_india_average": "35% above average",
  "energy_leaks": [
    { "issue": "describe the spike", "period": "when", "impact": "extra cost or CO2" }
  ],
  "savings_plan": [
    { "action": "specific action", "saves_inr_per_month": 200, "saves_co2_kg_per_month": 15, "difficulty": "easy" }
  ],
  "projected_annual_saving_inr": 2400,
  "projected_annual_co2_saving_kg": 180
}`;

export default function CarbonSyncScreen() {
  const [mode, setMode] = useState<'receipt' | 'bill'>('receipt');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScannedItem[]>([]);
  const [billResult, setBillResult] = useState<BillResult | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is needed for scanning!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResults([]);
      setBillResult(null);
      if (mode === 'receipt') {
        startReceiptScan(result.assets[0].uri);
      } else {
        startBillScan(result.assets[0].uri);
      }
    }
  };

  const getBase64 = async (imageUri: string): Promise<string> => {
    if (imageUri.startsWith('data:')) {
      return imageUri.split(',')[1];
    } else if (imageUri.startsWith('blob:')) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
    } else {
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      return await readAsStringAsync(imageUri, { encoding: 'base64' });
    }
  };

  const callGemini = async (base64: string, prompt: string) => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: base64 } },
              { text: prompt }
            ]
          }]
        })
      }
    );
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) {
      throw new Error('Gemini error: ' + JSON.stringify(data.error));
    }
    const rawText = data.candidates[0].content.parts[0].text;
    return JSON.parse(rawText.replace(/```json|```/g, '').trim());
  };

  const startReceiptScan = async (imageUri: string) => {
    setLoading(true);
    try {
      const base64 = await getBase64(imageUri);
      const parsed = await callGemini(base64, RECEIPT_PROMPT);
      const mappedItems = parsed.items.map((item: any, index: number) => ({
        id: String(index + 1),
        name: item.name,
        carbonScore: item.carbonScore,
        category: item.category as 'High' | 'Medium' | 'Low'
      }));
      setResults(mappedItems);
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to scan receipt. Please try again.');
    }
    setLoading(false);
  };

  const startBillScan = async (imageUri: string) => {
    setLoading(true);
    try {
      const base64 = await getBase64(imageUri);
      const parsed = await callGemini(base64, BILL_PROMPT);
      setBillResult(parsed);
    } catch (error) {
      console.error('Bill scan error:', error);
      Alert.alert('Error', 'Failed to analyze bill. Please try again.');
    }
    setLoading(false);
  };

  const deleteItem = (id: string) => {
    setResults(prev => prev.filter(item => item.id !== id));
  };

  const totalImpact = results.reduce((sum, item) => sum + item.carbonScore, 0).toFixed(1);

  const logReceiptData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Error', 'Please log in first!'); return; }

      for (const item of results) {
        await supabase.from('carbon_logs').insert({
          user_id: user.id,
          item_name: item.name,
          carbon_value: item.carbonScore,
          category: 'grocery',
          source: 'Gemini AI',
          raw_data: JSON.stringify(item),
        });
      }

      const { data: profile } = await supabase
        .from('users')
        .select('total_carbon_score, total_carbon_tracked')
        .eq('id', user.id)
        .single();

      const newScore = (profile?.total_carbon_score || 0) + parseFloat(totalImpact);
      const newTracked = (profile?.total_carbon_tracked || 0) + parseFloat(totalImpact);

      await supabase.from('users').update({
        total_carbon_score: newScore,
        total_carbon_tracked: newTracked,
      }).eq('id', user.id);

      Alert.alert('Success', 'Saved! Pull down on Home to refresh 🌱');
    } catch (err) {
      Alert.alert('Error', 'Could not save. Try again.');
    }
  };

  const logBillData = async () => {
  if (!billResult) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'Please log in first!');
      return;
    }

    // 1. Save bill data to carbon_logs
    await supabase.from('carbon_logs').insert({
      user_id: user.id,
      item_name: `${billResult.bill_type} bill - ${billResult.billing_period}`,
      carbon_value: billResult.carbon_kg,
      category: 'energy',
      source: 'Electricity Bill Scanner',
      raw_data: JSON.stringify(billResult),
    });

    // 2. Calculate prevented carbon from savings plan
    const totalPreventedCO2 = billResult.savings_plan.reduce(
      (sum: number, step: any) => sum + (step.saves_co2_kg_per_month || 0),
      0
    );

    // 3. Get current user stats
    const { data: billProfile } = await supabase
      .from('users')
      .select('total_carbon_tracked, total_carbon_prevented, total_carbon_score')
      .eq('id', user.id)
      .single();

    // 4. Update user stats
    await supabase.from('users').update({
      total_carbon_tracked: (billProfile?.total_carbon_tracked || 0) + billResult.carbon_kg,
      total_carbon_prevented: (billProfile?.total_carbon_prevented || 0) + totalPreventedCO2,
      total_carbon_score: (billProfile?.total_carbon_score || 0) + billResult.carbon_kg,
    }).eq('id', user.id);

    // 5. Try to save bill analysis (if table exists)
    try {
      await supabase.from('bill_analysis').insert({
        user_id: user.id,
        bill_type: billResult.bill_type,
        billing_period: billResult.billing_period,
        usage_amount: billResult.usage_amount,
        carbon_kg: billResult.carbon_kg,
        potential_savings_co2: totalPreventedCO2,
        potential_savings_inr: billResult.projected_annual_saving_inr,
        analyzed_at: new Date().toISOString(),
      });
    } catch (tableError) {
      console.log('Bill analysis table not available yet');
    }

    Alert.alert(
      'Success! 🎉',
      `✅ Bill Data Saved!\n\n📊 Carbon Tracked: ${billResult.carbon_kg.toFixed(1)} kg\n💚 Potential Savings: ${totalPreventedCO2.toFixed(1)} kg\n\nPull down on Home to see the updates!`
    );

    // Reset form
    setBillResult(null);
    setImage(null);
  } catch (err) {
    console.error('Error logging bill:', err);
    Alert.alert('Error', 'Could not save bill data. Try again.');
  }
};

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'receipt' && styles.toggleActive]}
          onPress={() => { setMode('receipt'); setImage(null); setResults([]); setBillResult(null); }}
        >
          <Text style={[styles.toggleText, mode === 'receipt' && styles.toggleTextActive]}>🧾 Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'bill' && styles.toggleActive]}
          onPress={() => { setMode('bill'); setImage(null); setResults([]); setBillResult(null); }}
        >
          <Text style={[styles.toggleText, mode === 'bill' && styles.toggleTextActive]}>⚡ Bill</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.header}>Carbon-Sync 📸</Text>
      <Text style={styles.subHeader}>
        {mode === 'receipt' ? 'Upload a grocery receipt' : 'Upload your electricity or water bill'}
      </Text>

      <TouchableOpacity style={styles.uploadZone} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="camera-outline" size={50} color="#1D9E75" />
            <Text style={styles.uploadText}>
              {mode === 'receipt' ? 'Tap to Scan Receipt' : 'Tap to Upload Bill'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text style={styles.loadingText}>
            {mode === 'receipt' ? 'AI is analyzing items...' : 'AI is analyzing your bill...'}
          </Text>
        </View>
      )}

      {/* RECEIPT RESULTS */}
      {mode === 'receipt' && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemScore}>{item.carbonScore} kg CO₂</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.tag, item.category === 'High' ? styles.tagRed : item.category === 'Medium' ? styles.tagYellow : styles.tagGreen]}>
                  <Text style={styles.tagText}>{item.category}</Text>
                </View>
                <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 120, marginTop: 10 }}
          ListEmptyComponent={() => !loading && image ? (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No items found in this scan.</Text>
          ) : null}
        />
      )}

      {/* BILL RESULTS */}
      {mode === 'bill' && billResult && (
        <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.billSummaryCard}>
            <Text style={styles.billType}>{billResult.bill_type.toUpperCase()} BILL</Text>
            <Text style={styles.billPeriod}>{billResult.billing_period}</Text>
            <View style={styles.billStatsRow}>
              <View style={styles.billStat}>
                <Text style={styles.billStatNum}>{billResult.usage_amount}</Text>
                <Text style={styles.billStatLabel}>{billResult.usage_unit}</Text>
              </View>
              <View style={styles.billStat}>
                <Text style={styles.billStatNum}>₹{billResult.bill_amount_inr}</Text>
                <Text style={styles.billStatLabel}>Amount</Text>
              </View>
              <View style={styles.billStat}>
                <Text style={styles.billStatNum}>{billResult.carbon_kg}</Text>
                <Text style={styles.billStatLabel}>kg CO₂</Text>
              </View>
            </View>
            <View style={styles.vsAvgBadge}>
              <Text style={styles.vsAvgText}>📊 {billResult.vs_india_average}</Text>
            </View>
          </View>

          {billResult.energy_leaks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Energy Leaks Detected</Text>
              {billResult.energy_leaks.map((leak, i) => (
                <View key={i} style={styles.leakCard}>
                  <Text style={styles.leakIssue}>{leak.issue}</Text>
                  <Text style={styles.leakMeta}>📅 {leak.period} · {leak.impact}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Your Savings Plan</Text>
            {billResult.savings_plan.map((step, i) => (
              <View key={i} style={styles.savingsCard}>
                <View style={styles.savingsLeft}>
                  <Text style={styles.savingsAction}>{step.action}</Text>
                  <Text style={styles.savingsMeta}>
                    {step.difficulty === 'easy' ? '🟢' : step.difficulty === 'medium' ? '🟡' : '🔴'} {step.difficulty}
                  </Text>
                </View>
                <View style={styles.savingsRight}>
                  <Text style={styles.savingsInr}>₹{step.saves_inr_per_month}/mo</Text>
                  <Text style={styles.savingsCo2}>{step.saves_co2_kg_per_month} kg CO₂</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.annualCard}>
            <Text style={styles.annualTitle}>Annual Potential Savings</Text>
            <Text style={styles.annualInr}>₹{billResult.projected_annual_saving_inr}</Text>
            <Text style={styles.annualCo2}>{billResult.projected_annual_co2_saving_kg} kg CO₂ saved/year</Text>
          </View>

          <TouchableOpacity style={styles.logBillBtn} onPress={logBillData}>
            <Text style={styles.logBillBtnText}>Log Bill Data 🌱</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* RECEIPT SUMMARY CARD */}
      {mode === 'receipt' && results.length > 0 && (
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Bill Impact</Text>
            <Text style={styles.summaryTotal}>{totalImpact} kg CO₂</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={logReceiptData}>
            <Text style={styles.saveBtnText}>Log Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  toggleRow: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 16, marginTop: 40 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: '#fff', elevation: 2 },
  toggleText: { fontSize: 14, color: '#999', fontWeight: '600' },
  toggleTextActive: { color: '#1D9E75' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  subHeader: { fontSize: 14, color: '#666', marginBottom: 16, marginTop: 4 },
  uploadZone: {
    height: 160,
    borderWidth: 2,
    borderColor: '#1D9E75',
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FAF8',
    overflow: 'hidden',
    marginBottom: 10,
  },
  uploadText: { color: '#1D9E75', fontSize: 16, marginTop: 10, fontWeight: '500' },
  previewImage: { width: '100%', height: '100%' },
  loadingBox: { marginTop: 10, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#1D9E75', fontStyle: 'italic' },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 2,
    alignItems: 'center'
  },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemScore: { fontSize: 13, color: '#888' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagRed: { backgroundColor: '#FFEBEE' },
  tagYellow: { backgroundColor: '#FFFDE7' },
  tagGreen: { backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 11, fontWeight: 'bold' },
  deleteBtn: { marginLeft: 15, padding: 5 },
  summaryCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 20,
    backgroundColor: '#1B5E20',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5
  },
  summaryLabel: { color: '#E8F5E9', fontSize: 12 },
  summaryTotal: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveBtnText: { color: '#1B5E20', fontWeight: 'bold' },
  billSummaryCard: { backgroundColor: '#1B5E20', borderRadius: 20, padding: 20, marginBottom: 12 },
  billType: { color: '#A5D6A7', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  billPeriod: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  billStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  billStat: { alignItems: 'center' },
  billStatNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  billStatLabel: { color: '#A5D6A7', fontSize: 11 },
  vsAvgBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8 },
  vsAvgText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1B5E20', marginBottom: 8 },
  leakCard: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#EF9F27' },
  leakIssue: { fontSize: 13, fontWeight: '600', color: '#333' },
  leakMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  savingsCard: { backgroundColor: '#F5FAF8', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsLeft: { flex: 1 },
  savingsAction: { fontSize: 13, fontWeight: '600', color: '#333' },
  savingsMeta: { fontSize: 11, color: '#888', marginTop: 4 },
  savingsRight: { alignItems: 'flex-end' },
  savingsInr: { fontSize: 13, fontWeight: '700', color: '#1B5E20' },
  savingsCo2: { fontSize: 11, color: '#888' },
  annualCard: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  annualTitle: { fontSize: 13, color: '#555', marginBottom: 4 },
  annualInr: { fontSize: 32, fontWeight: '800', color: '#1B5E20' },
  annualCo2: { fontSize: 13, color: '#888', marginTop: 4 },
  logBillBtn: { backgroundColor: '#1B5E20', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  logBillBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});