import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScannedItem {
  id: string;
  name: string;
  carbonScore: number; 
  category: 'High' | 'Medium' | 'Low';
}

export default function CarbonSyncScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScannedItem[]>([]);

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
      startFakeScan(); 
    }
  };

  const startFakeScan = () => {
    setLoading(true);
    setTimeout(() => {
      setResults([
        { id: '1', name: 'Organic Almond Milk', carbonScore: 1.2, category: 'Low' },
        { id: '2', name: 'Plastic Bottled Water', carbonScore: 5.4, category: 'Medium' },
        { id: '3', name: 'Imported Red Meat', carbonScore: 24.5, category: 'High' },
      ]);
      setLoading(false);
    }, 2000);
  };

  // 1. DELETE FUNCTION
  const deleteItem = (id: string) => {
    setResults(prev => prev.filter(item => item.id !== id));
  };

  // 2. TOTAL CALCULATION
  const totalImpact = results.reduce((sum, item) => sum + item.carbonScore, 0).toFixed(1);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Carbon-Sync 📸</Text>
      <Text style={styles.subHeader}>Upload a bill to see your impact</Text>
      
      <TouchableOpacity style={styles.uploadZone} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.previewImage} />
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Ionicons name="camera-outline" size={50} color="#1D9E75" />
            <Text style={styles.uploadText}>Tap to Scan Receipt</Text>
          </View>
        )}
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#1D9E75" />
          <Text style={styles.loadingText}>AI is analyzing items...</Text>
        </View>
      )}

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

              {/* DELETE BUTTON */}
              <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100, marginTop: 20 }}
        // 3. EMPTY STATE MESSAGE
        ListEmptyComponent={() => !loading && image && (
          <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>No items left in this scan.</Text>
        )}
      />

      {/* 4. TOTAL SUMMARY CARD (Dikhega tabhi jab items honge) */}
      {results.length > 0 && (
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Bill Impact</Text>
            <Text style={styles.summaryTotal}>{totalImpact} kg CO₂</Text>
          </View>
          <TouchableOpacity 
            style={styles.saveBtn}
            onPress={() => Alert.alert("Success", "Items saved to your Eco-History! 🌱")}
          >
            <Text style={styles.saveBtnText}>Log Data</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20', marginTop: 40 },
  subHeader: { fontSize: 16, color: '#666', marginBottom: 20 },
  uploadZone: {
    height: 180,
    borderWidth: 2,
    borderColor: '#1D9E75',
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FAF8',
    overflow: 'hidden'
  },
  uploadText: { color: '#1D9E75', fontSize: 16, marginTop: 10, fontWeight: '500' },
  previewImage: { width: '100%', height: '100%' },
  loadingBox: { marginTop: 20, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#1D9E75', fontStyle: 'italic' },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    elevation: 2,
    alignItems: 'center'
  },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemScore: { fontSize: 13, color: '#888' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagRed: { backgroundColor: '#FFEBEE' },
  tagYellow: { backgroundColor: '#FFFDE7' },
  tagGreen: { backgroundColor: '#E8F5E9' },
  tagText: { fontSize: 11, fontWeight: 'bold' },
  deleteBtn: { marginLeft: 15, padding: 5 },
  // Summary Card Styles
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
  saveBtnText: { color: '#1B5E20', fontWeight: 'bold' }
});