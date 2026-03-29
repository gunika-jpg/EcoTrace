import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
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

const BADGES = [
  { id: '1', title: 'Carbon Killer', desc: 'Saved 10kg CO₂', icon: 'leaf', color: '#2E7D32', locked: false },
  { id: '2', title: 'Tree Planter', desc: 'Funded 5 Trees', icon: 'bonfire', color: '#EF6C00', locked: false },
  { id: '3', title: 'Plastic Free', desc: '7 Day Streak', icon: 'water', color: '#1565C0', locked: true },
  { id: '4', title: 'Eco Warrior', desc: 'Top 10% Squad', icon: 'shield-checkmark', color: '#7B1FA2', locked: true },
  { id: '5', title: 'Earth Hero', desc: '1 Month Green', icon: 'globe', color: '#C2185B', locked: true },
  { id: '6', title: 'Solar Soul', desc: 'Daylight King', icon: 'sunny', color: '#FBC02D', locked: true },
];

export default function CertsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [userName, setUserName] = useState("Eco Hero");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Eco Hero";
        setUserName(name);
      }
    };
    fetchUser();
  }, []);

  const onShare = async () => {
    try {
      await Share.share({
        message: `🌿 ${userName} just achieved the "${selectedBadge?.title}" milestone on CarbonSync! Join the movement.`,
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
        <Text style={styles.badgeDesc} numberOfLines={1}>{item.locked ? 'Requirements not met' : item.desc}</Text>
      </View>
      {!item.locked && <View style={[styles.statusTag, {backgroundColor: item.color}]}><Text style={styles.statusText}>UNLOCKED</Text></View>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
        {/* HEADER SECTION */}
        <View style={styles.headerArea}>
          <View style={styles.headerTextRow}>
            <View>
              <Text style={styles.headerGreeting}>Your Achievements</Text>
              <Text style={styles.headerTitleMain}>Badge Vault 🏆</Text>
            </View>
            <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>1,250 pts</Text>
            </View>
          </View>

          <View style={styles.premiumProgressCard}>
            <View style={styles.progressHeader}>
               <Text style={styles.pLabel}>JOURNEY PROGRESS</Text>
               <Text style={styles.pValue}>2 / 6</Text>
            </View>
            <View style={styles.trackBackground}>
               <View style={[styles.trackFill, { width: '33%' }]} />
            </View>
            <Text style={styles.progressHint}>4 more badges to become a Legend</Text>
          </View>
        </View>

        {/* GRID SECTION */}
        <View style={styles.gridContainer}>
            <FlatList
            data={BADGES}
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
                For extraordinary commitment to environmental sustainability and successfully achieving the milestone:
              </Text>
              <Text style={[styles.certBadgeName, {color: selectedBadge?.color}]}>{selectedBadge?.title}</Text>
              
              <View style={styles.signatureRow}>
                <View style={styles.sigLine}>
                    <Text style={styles.sigText}>CarbonSync Official</Text>
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