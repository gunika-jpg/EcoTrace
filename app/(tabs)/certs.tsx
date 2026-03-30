import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

// 1. TEMPLATE: Define the badge requirements here
const BADGE_TEMPLATES = [
  { id: '1', title: 'Carbon Killer', desc: 'Saved 10kg CO₂', icon: 'leaf', color: '#2E7D32', goal: 10 },
  { id: '2', title: 'Tree Planter', desc: 'Funded 5 Trees', icon: 'bonfire', color: '#EF6C00', goal: 5 },
  { id: '3', title: 'Plastic Free', desc: '7 Day Streak', icon: 'water', color: '#1565C0', goal: 7 },
  { id: '4', title: 'Eco Warrior', desc: 'Top 10% Squad', icon: 'shield-checkmark', color: '#7B1FA2', goal: 1 }, // Logic: 1 if in top 10%
  { id: '5', title: 'Earth Hero', desc: '1 Month Green', icon: 'globe', color: '#C2185B', goal: 30 },
  { id: '6', title: 'Solar Soul', desc: 'Daylight King', icon: 'sunny', color: '#FBC02D', goal: 1 },
];

export default function CertsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [userName, setUserName] = useState("Eco Hero");
  const [userStats, setUserStats] = useState({ points: 0, co2_saved: 0, streak: 0 });
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || "Eco Hero");

        // 2. FETCH ACTUAL DATA: Replace 'profiles' with your actual table name
        const { data, error } = await supabase
          .from('profiles')
          .select('points, co2_saved, streak')
          .eq('id', user.id)
          .single();

        // If DB is empty for demo, we use fallback values so badges actually unlock
        const stats = data || { points: 1250, co2_saved: 15, streak: 8 }; 
        setUserStats(stats);

        // 3. LOGIC: Map templates to "unlocked" status based on stats
        const updatedBadges = BADGE_TEMPLATES.map(badge => {
          let isLocked = true;
          if (badge.id === '1') isLocked = stats.co2_saved < 10;
          if (badge.id === '2') isLocked = stats.points < 500; // Example: 500pts = 5 trees
          if (badge.id === '3') isLocked = stats.streak < 7;
          if (badge.id === '4') isLocked = stats.points < 1000; // Top 10% if > 1000pts
          if (badge.id === '5') isLocked = stats.streak < 30;
          if (badge.id === '6') isLocked = false; // Always unlocked for demo

          return { ...badge, locked: isLocked };
        });

        setBadges(updatedBadges);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `🌿 ${userName} just achieved the "${selectedBadge?.title}" milestone on EcoTrace! Join the movement at IIT Delhi.`,
      });
    } catch (error: any) {
      Alert.alert("Sharing Error", error.message);
    }
  };

  const renderBadge = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[styles.badgeCard, item.locked && styles.lockedCard]}
      onPress={() => {
        if (!item.locked) {
          setSelectedBadge(item);
          setModalVisible(true);
        } else {
          Alert.alert("Locked", `You need to reach the requirement for ${item.title} to unlock this certificate.`);
        }
      }}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.locked ? '#F0F0F0' : `${item.color}15` }]}>
        <Ionicons 
          name={item.locked ? 'lock-closed' : item.icon as any} 
          size={32} 
          color={item.locked ? '#BBB' : item.color} 
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.badgeTitle, item.locked && styles.lockedText]}>{item.title}</Text>
        <Text style={styles.badgeDesc} numberOfLines={1}>
            {item.locked ? 'Requirements not met' : item.desc}
        </Text>
      </View>
      {!item.locked && (
        <View style={[styles.statusTag, {backgroundColor: item.color}]}>
          <Text style={styles.statusText}>UNLOCKED</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
      return (
          <View style={styles.center}><ActivityIndicator size="large" color="#1B5E20" /></View>
      );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        <View style={styles.headerArea}>
          <View style={styles.headerTextRow}>
            <View>
              <Text style={styles.headerGreeting}>Your Achievements</Text>
              <Text style={styles.headerTitleMain}>Badge Vault 🏆</Text>
            </View>
            <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{userStats.points.toLocaleString()} pts</Text>
            </View>
          </View>

          <View style={styles.premiumProgressCard}>
            <View style={styles.progressHeader}>
               <Text style={styles.pLabel}>JOURNEY PROGRESS</Text>
               <Text style={styles.pValue}>{badges.filter(b => !b.locked).length} / 6</Text>
            </View>
            <View style={styles.trackBackground}>
               <View style={[styles.trackFill, { width: `${(badges.filter(b => !b.locked).length / 6) * 100}%` }]} />
            </View>
            <Text style={styles.progressHint}>
                {6 - badges.filter(b => !b.locked).length} more badges to become a Legend
            </Text>
          </View>
        </View>

        <View style={styles.gridContainer}>
            <FlatList
                data={badges}
                numColumns={2}
                renderItem={renderBadge}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                columnWrapperStyle={styles.rowGap}
            />
        </View>
      </ScrollView>

      {/* CERTIFICATE MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.certificateFrame}>
            <View style={[styles.certInnerBorder, {borderColor: selectedBadge?.color}]}>
              <View style={[styles.medalCircle, {backgroundColor: selectedBadge?.color}]}>
                <Ionicons name="ribbon-sharp" size={50} color="white" />
              </View>
              
              <Text style={styles.certHeader}>CERTIFICATE OF ACHIEVEMENT</Text>
              <View style={styles.divider} />
              
              <Text style={styles.certSub}>This prestigious award is presented to</Text>
              <Text style={styles.certName}>{userName}</Text>
              
              <Text style={styles.certBody}>
                For extraordinary commitment to environmental sustainability and successfully achieving the EcoTrace milestone:
              </Text>
              <Text style={[styles.certBadgeName, {color: selectedBadge?.color}]}>{selectedBadge?.title}</Text>
              
              <View style={styles.signatureRow}>
                <View style={styles.sigLine}>
                    <Text style={styles.sigText}>EcoTrace Official</Text>
                </View>
                <View style={styles.sigLine}>
                    <Text style={styles.sigText}>{new Date().toLocaleDateString()}</Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#f0f0f0'}]} onPress={() => setModalVisible(false)}>
                  <Text style={[styles.btnTextAction, {color: '#444'}]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: selectedBadge?.color}]} onPress={onShare}>
                  <Ionicons name="share-social" size={20} color="white" style={{marginRight: 8}} />
                  <Text style={[styles.btnTextAction, {color: 'white'}]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBFBFD' },
  headerArea: { padding: 24, paddingTop: 60, backgroundColor: '#FFF' },
  headerTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerGreeting: { fontSize: 14, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitleMain: { fontSize: 32, fontWeight: '800', color: '#1A1A1A' },
  pointsBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pointsText: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
  
  premiumProgressCard: { backgroundColor: '#1B5E20', borderRadius: 24, padding: 24, elevation: 8, shadowColor: '#1B5E20', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  pLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  pValue: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  trackBackground: { height: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 5 },
  trackFill: { height: '100%', backgroundColor: '#A5D6A7', borderRadius: 5 },
  progressHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 12, fontWeight: '500' },

  gridContainer: { padding: 16 },
  rowGap: { justifyContent: 'space-between' },
  badgeCard: { width: (width / 2) - 24, backgroundColor: '#FFF', borderRadius: 28, padding: 20, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  lockedCard: { backgroundColor: '#FAFAFA', borderColor: '#EEE' },
  iconContainer: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  textContainer: { alignItems: 'center' },
  badgeTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436' },
  badgeDesc: { fontSize: 11, color: '#95A5A6', marginTop: 4, textAlign: 'center' },
  lockedText: { color: '#BDC3C7' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 12 },
  statusText: { color: '#FFF', fontSize: 8, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  certificateFrame: { width: '100%', backgroundColor: '#FFF', borderRadius: 12, padding: 10 },
  certInnerBorder: { borderWidth: 2, borderRadius: 8, padding: 20, alignItems: 'center', borderStyle: 'solid' },
  medalCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginTop: -65, elevation: 5, borderWidth: 4, borderColor: '#FFF' },
  certHeader: { fontSize: 18, fontWeight: '900', color: '#1A1A1A', marginTop: 15, letterSpacing: 2 },
  divider: { height: 1, width: '80%', backgroundColor: '#EEE', marginVertical: 15 },
  certSub: { fontSize: 12, color: '#777', fontStyle: 'italic' },
  certName: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginVertical: 10, textDecorationLine: 'underline' },
  certBody: { fontSize: 14, textAlign: 'center', color: '#555', paddingHorizontal: 20, lineHeight: 22 },
  certBadgeName: { fontSize: 22, fontWeight: '800', marginTop: 10 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 30, paddingHorizontal: 10 },
  sigLine: { borderTopWidth: 1, borderColor: '#CCC', width: '40%', alignItems: 'center', paddingTop: 5 },
  sigText: { fontSize: 10, color: '#999', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 30 },
  btnAction: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnTextAction: { fontWeight: '700', fontSize: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});