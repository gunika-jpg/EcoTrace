import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export default function Planet({ health }: { health: 'good' | 'neutral' | 'bad' }) {
  // Map health state to colors
  const colors = {
    good: { land: '#2D5A27', water: '#4A90E2' },     // Lush Green & Blue
    neutral: { land: '#8B9A65', water: '#7BA7BC' },  // Faded
    bad: { land: '#5C5C5C', water: '#A9A9A9' },     // Gray/Polluted
  };

  const theme = colors[health];

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
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
    </View>
  );
}
