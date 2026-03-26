import { StyleSheet, Text, View } from 'react-native';

export default function SyncScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carbon-Sync</Text>
      <Text style={styles.subtitle}>Upload receipts to track footprint</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9F6' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#085041' },
  subtitle: { fontSize: 16, color: '#444', marginTop: 10 },
});