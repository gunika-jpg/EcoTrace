import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type ClimateBackdropProps = {
  variant?: 'forest' | 'ocean';
};

export default function ClimateBackdrop({ variant = 'forest' }: ClimateBackdropProps) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftA, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, {
          toValue: 1,
          duration: 5600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftB, {
          toValue: 0,
          duration: 5600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [driftA, driftB, pulse]);

  const palette =
    variant === 'ocean'
      ? {
          gradient: ['#EAF8FF', '#F2FFFB', '#E9F2FF'] as const,
          blobA: '#8DD7FF',
          blobB: '#9BE9D0',
        }
      : {
          gradient: ['#FFF4DE', '#EFFFF6', '#EAF1FF'] as const,
          blobA: '#A7EBCD',
          blobB: '#BED2FF',
        };

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <LinearGradient colors={palette.gradient} style={StyleSheet.absoluteFillObject} />

      <Animated.View
        style={[
          styles.blob,
          styles.blobTop,
          { backgroundColor: palette.blobA },
          {
            transform: [
              { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
              { translateX: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobBottom,
          { backgroundColor: palette.blobB },
          {
            transform: [
              { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
              { translateX: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.glowDot,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.42,
  },
  blobTop: {
    width: 290,
    height: 290,
    right: -100,
    top: -80,
  },
  blobBottom: {
    width: 250,
    height: 250,
    left: -110,
    bottom: 90,
  },
  glowDot: {
    position: 'absolute',
    top: 18,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4FD8AA',
  },
});
