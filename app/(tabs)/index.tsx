import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated'
import { supabase, type Conversation } from '../../src/lib/supabase'

function ConversationItem({ item, index }: { item: Conversation; index: number }) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const onPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(`/gesprek/${item.id}`)
  }

  const onPressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 400, damping: 25 })
  }

  const onPressOut = () => {
    scale.value = withSpring(1, { stiffness: 400, damping: 25 })
  }

  const naam = item.contact?.naam || item.contact?.telefoon || 'Onbekend'
  const initials = naam[0]?.toUpperCase() || '?'

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()} style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={styles.conversationItem}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Content */}
        <View style={styles.conversationContent}>
          <View style={styles.conversationRow}>
            <Text style={styles.conversationNaam} numberOfLines={1}>{naam}</Text>
            {item.last_message_at && (
              <Text style={styles.conversationTijd}>
                {new Date(item.last_message_at).toLocaleTimeString('nl-NL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
          <Text style={styles.conversationPreview} numberOfLines={1}>
            Tik om gesprek te openen
          </Text>
          {item.labels.length > 0 && (
            <View style={styles.labels}>
              {item.labels.slice(0, 2).map(label => (
                <View key={label} style={styles.label}>
                  <Text style={styles.labelText}>{label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Unread indicator */}
        <View style={styles.unreadDot} />
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function InboxScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'open' | 'gesloten'>('open')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('status', filter)
      .order('last_message_at', { ascending: false })
      .limit(50)

    if (data) setConversations(data as Conversation[])
    setLoading(false)
    setRefreshing(false)
  }, [filter])

  useEffect(() => {
    load()

    // Supabase Realtime
    const channel = supabase
      .channel('inbox-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        load()
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [filter, load])

  const filtered = conversations.filter(c =>
    !search ||
    c.contact?.naam?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.telefoon.includes(search)
  )

  const onRefresh = () => {
    setRefreshing(true)
    load()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#25d366" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Zoeken..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={styles.searchInput}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['open', 'gesloten'] as const).map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => {
              setFilter(f)
              Haptics.selectionAsync()
            }}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'open' ? 'Open' : 'Gesloten'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ConversationItem item={item} index={index} />
        )}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#25d366"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'open' ? 'Je bent helemaal bij!' : 'Geen gesloten gesprekken'}
            </Text>
            <Text style={styles.emptySubtitle}>
              Nieuwe berichten verschijnen hier automatisch
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06060f' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: 'rgba(37,211,102,0.12)',
    borderColor: 'rgba(37,211,102,0.3)',
  },
  filterTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  filterTabTextActive: { color: '#25d366' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  emptyList: { flex: 1 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6c4fd4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  conversationContent: { flex: 1 },
  conversationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conversationNaam: { color: '#fff', fontWeight: '600', fontSize: 15, flex: 1 },
  conversationTijd: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  conversationPreview: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
  labels: { flexDirection: 'row', gap: 6, marginTop: 6 },
  label: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  labelText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25d366',
  },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { color: 'rgba(255,255,255,0.25)', fontSize: 14, marginTop: 8, textAlign: 'center' },
})
