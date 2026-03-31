import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function Planet({ status }: { status: 'excellent' | 'good' | 'neutral' | 'poor' }) {
  // 1. Setup the Animation Value
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 2. Create a smooth up-and-down loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const colors = {
    excellent: { water: '#4A90E2', land: '#2D5A27' },
    good: { land: '#2D5A27', water: '#4A90E2' },
    neutral: { land: '#8B9A65', water: '#7BA7BC' },
    poor: { land: '#5C5C5C', water: '#A9A9A9' },
  };

  // Safety check: Default to 'neutral' if status is undefined
  const safeStatus = status || 'neutral';
  const theme = colors[safeStatus as keyof typeof colors] || colors.neutral;

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Svg height="160" width="160" viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="48" fill={theme.water} />
          <Path
            d="M30,20 Q40,10 50,20 T70,30 T50,60 T20,40 Z"
            fill={theme.land}
          />
          <Path
            d="M60,70 Q75,60 85,75 T70,90 T50,80 Z"
            fill={theme.land}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}


