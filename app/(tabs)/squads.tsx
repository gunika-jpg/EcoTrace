import { StyleSheet, Text, View } from 'react-native';

export default function SquadsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Social Squads</Text>
      <Text style={styles.subtitle}>Compete with friends for the top spot!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEEDFE' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#3C3489' },
  subtitle: { fontSize: 16, color: '#444', marginTop: 10 },
});