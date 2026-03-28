import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const BADGES = [
  { id: '1', title: 'Carbon Killer', desc: 'Saved 10kg CO₂', icon: 'leaf', color: '#4CAF50', locked: false },
  { id: '2', title: 'Tree Planter', desc: 'Funded 5 Trees', icon: 'bonfire', color: '#FF9800', locked: false },
  { id: '3', title: 'Plastic Free', desc: '7 Day Streak', icon: 'water', color: '#2196F3', locked: true },
  { id: '4', title: 'Eco Warrior', desc: 'Top 10% Squad', icon: 'shield-checkmark', color: '#9C27B0', locked: true },
  { id: '5', title: 'Earth Hero', desc: '1 Month Green', icon: 'globe', color: '#E91E63', locked: true },
  { id: '6', title: 'Solar Soul', desc: 'Daylight King', icon: 'sunny', color: '#FFEB3B', locked: true },
];

export default function CertsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  // --- FIX: Define the logged-in user here ---
  // In a real app, you would get this from Firebase Auth or a UserContext
  const currentUser = {
    name: "Pooja", // This will dynamically change based on the login
  };

  const onShare = async () => {
    try {
      await Share.share({
        // Updated to use dynamic name in sharing too
        message: `${currentUser.name} just earned the ${selectedBadge?.title} certificate on EcoTrace! 🌿 Join me in saving the planet! #EcoTrace #GreenCert`,
      });
    } catch (error: any) {
      Alert.alert("Sharing Error", error.message);
    }
  };

  const renderBadge = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      style={[styles.badgeCard, item.locked && styles.lockedCard]}
      onPress={() => {
        if (!item.locked) {
          setSelectedBadge(item);
          setModalVisible(true);
        }
      }}
    >
      <View style={[styles.iconCircle, { backgroundColor: item.locked ? '#E0E0E0' : `${item.color}15` }]}>
        <Ionicons 
          name={item.icon as any} 
          size={38} 
          color={item.locked ? '#999' : item.color} 
        />
      </View>
      <Text style={[styles.badgeTitle, item.locked && styles.lockedText]}>{item.title}</Text>
      <Text style={styles.badgeDesc}>{item.locked ? 'Locked' : item.desc}</Text>
      
      {item.locked && (
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={10} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Badge Vault 🏆</Text>
          <Text style={styles.headerSub}>Turn your green habits into rewards</Text>
          
          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Current Progress</Text>
              <Text style={styles.progressValue}>2 / 6 Unlocked</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '33.3%' }]} />
            </View>
          </View>
        </View>

        <FlatList
          data={BADGES}
          numColumns={2}
          renderItem={renderBadge}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContainer}
        />
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <View style={[styles.modalRibbon, {backgroundColor: selectedBadge?.color}]}>
                <Ionicons name="ribbon" size={60} color="white" />
             </View>
             <Text style={styles.modalTitle}>Official Certificate</Text>
             <Text style={styles.modalDesc}>
               {/* FIX: Using the dynamic currentUser.name */}
               This certifies that <Text style={{fontWeight: 'bold'}}>{currentUser.name}</Text> has achieved the status of <Text style={{fontWeight: 'bold'}}>{selectedBadge?.title}</Text>.
             </Text>
             
             <View style={styles.buttonRow}>
               <TouchableOpacity 
                 style={[styles.shareBtn, {borderColor: selectedBadge?.color}]} 
                 onPress={onShare}
               >
                 <Ionicons name="share-social" size={20} color={selectedBadge?.color} style={{marginRight: 8}} />
                 <Text style={[styles.shareBtnText, {color: selectedBadge?.color}]}>Share</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 style={[styles.closeBtn, {backgroundColor: selectedBadge?.color}]} 
                 onPress={() => setModalVisible(false)}
               >
                 <Text style={styles.closeBtnText}>Done</Text>
               </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  headerSection: { padding: 25, paddingTop: 60, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 3 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  headerSub: { fontSize: 15, color: '#666', marginTop: 5 },
  progressCard: { marginTop: 20, backgroundColor: '#1B5E20', borderRadius: 20, padding: 20 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressLabel: { color: '#E8F5E9', fontSize: 14 },
  progressValue: { color: '#fff', fontWeight: 'bold' },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  progressFill: { height: '100%', backgroundColor: '#81C784', borderRadius: 10 },
  listContainer: { padding: 15 },
  badgeCard: { 
    flex: 1, 
    margin: 10, 
    padding: 20, 
    backgroundColor: '#fff', 
    borderRadius: 25, 
    alignItems: 'center', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  lockedCard: { backgroundColor: '#F2F2F2', elevation: 0 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  badgeTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  badgeDesc: { fontSize: 12, color: '#888', marginTop: 4 },
  lockedText: { color: '#999' },
  lockBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#999', padding: 5, borderRadius: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center' },
  modalRibbon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginTop: -80, elevation: 10 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, color: '#1B5E20' },
  modalDesc: { fontSize: 16, textAlign: 'center', color: '#555', marginVertical: 20, lineHeight: 24 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  shareBtn: { flex: 1, flexDirection: 'row', marginRight: 10, borderWidth: 2, borderRadius: 30, justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  shareBtnText: { fontWeight: 'bold', fontSize: 16 },
  closeBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 30, paddingVertical: 15 },
  closeBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});