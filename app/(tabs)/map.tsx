import { StyleSheet, Text, View } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Green Map</Text>
      <Text style={styles.subtitle}>Eco-friendly spots in Delhi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#854F0B' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10 },
});