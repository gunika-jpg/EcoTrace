import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// 1. IMPORT PLANET (Fixes "Planet not defined")
import Planet from './Planet';

const { width } = Dimensions.get('window');

// 2. DEFINE TYPES (Fixes TypeScript red lines)
interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // 3. DEFINE HANDLENEXT (Fixes "handleNext not defined")
  const handleNext = () => {
    if (activeIndex < 2) {
      scrollRef.current?.scrollTo({ 
        x: (activeIndex + 1) * width, 
        animated: true 
      });
      setActiveIndex(activeIndex + 1);
    } else {
      onFinish();
    }
  };

  if (width === 0) {
    return <View style={[styles.container, { backgroundColor: '#fff' }]} />;
  }

  return (
    <SafeAreaView style={styles.container} onLayout={() => setIsReady(true)}>
      {!isReady ? (
        <View style={styles.loaderContainer}>
           <ActivityIndicator size="large" color="#1B5E20" />
        </View>
      ) : (
        <>
          {/* SKIP BUTTON */}
          <TouchableOpacity style={styles.skipContainer} onPress={onFinish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <ScrollView 
            ref={scrollRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            snapToInterval={width}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
          >
            {/* Slide 1 */}
            <View style={[styles.slide, { width }]}>
              <Planet status="good" />
              <Text style={styles.title}>Heal the Earth</Text>
              <Text style={styles.desc}>Your daily choices affect the planet's health.</Text>
            </View>

            {/* Slide 2 */}
            <View style={[styles.slide, { width }]}>
              <View style={styles.placeholderIcon}><Text style={{fontSize: 50}}>📸</Text></View>
              <Text style={styles.title}>Scan Your Bills</Text>
              <Text style={styles.desc}>Our AI engine analyzes your purchases.</Text>
            </View>

            {/* Slide 3 */}
            <View style={[styles.slide, { width }]}>
              <Text style={{fontSize: 60}}>🏆</Text>
              <Text style={styles.title}>Earn Rewards</Text>
              <Text style={styles.desc}>Collect Green-Certs and share achievements.</Text>
            </View>
          </ScrollView>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={styles.dotContainer}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.dot, activeIndex === i && styles.activeDot]} />
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>{activeIndex === 2 ? "Get Started" : "Next"}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skipContainer: { position: 'absolute', top: 50, right: 30, zIndex: 10, padding: 10 },
  skipText: { fontSize: 16, color: '#999', fontWeight: '600' },
  slide: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20', marginTop: 20, textAlign: 'center' },
  desc: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 15, lineHeight: 24 },
  footer: { position: 'absolute', bottom: 60, width: '100%', alignItems: 'center' },
  dotContainer: { flexDirection: 'row', marginBottom: 25 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0E0E0', marginHorizontal: 4 },
  activeDot: { backgroundColor: '#1B5E20', width: 20 },
  button: { backgroundColor: '#1B5E20', paddingHorizontal: 60, paddingVertical: 18, borderRadius: 35 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  placeholderIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }
});
