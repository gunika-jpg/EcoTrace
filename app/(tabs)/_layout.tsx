import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#1D9E75', 
      headerTitleAlign: 'center',
      tabBarStyle: { height: 60, paddingBottom: 10 }
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <FontAwesome name="home" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="carbon-sync"
        options={{ title: 'Sync', tabBarIcon: ({ color }) => <FontAwesome name="leaf" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ title: 'Map', tabBarIcon: ({ color }) => <FontAwesome name="map" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="squads"
        options={{ title: 'Squads', tabBarIcon: ({ color }) => <FontAwesome name="users" size={24} color={color} /> }}
      />
      <Tabs.Screen
        name="certs"
        options={{ title: 'Badges', tabBarIcon: ({ color }) => <FontAwesome name="trophy" size={24} color={color} /> }}
      />
    </Tabs>
  );
}