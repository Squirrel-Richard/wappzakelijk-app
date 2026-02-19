import { Tabs } from 'expo-router'
import { MessageSquare, Radio, CreditCard } from 'lucide-react-native'
import { View, Platform } from 'react-native'
import { BlurView } from 'expo-blur'

function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        tint="dark"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
    )
  }
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(6, 6, 15, 0.95)',
      }}
    />
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#25d366',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarStyle: {
          position: 'absolute',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: TabBarBackground,
        headerStyle: { backgroundColor: '#06060f' },
        headerTintColor: '#ffffff',
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inbox',
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="broadcasts"
        options={{
          title: 'Broadcasts',
          tabBarLabel: 'Broadcast',
          tabBarIcon: ({ color, size }) => (
            <Radio color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="betaallink"
        options={{
          title: 'Betaallink',
          tabBarLabel: 'Betaallink',
          tabBarIcon: ({ color, size }) => (
            <CreditCard color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
