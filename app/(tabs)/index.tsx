import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Living Planet Dashboard</Text>
      <Text style={styles.subtitle}>Day 2: Animations coming soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1D9E75' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 10 },
});