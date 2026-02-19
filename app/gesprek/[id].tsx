import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Send } from 'lucide-react-native'
import { supabase, type Message } from '../../src/lib/supabase'

export default function GesprekScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const navigation = useNavigation()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const load = useCallback(async () => {
    const { data: conv } = await supabase
      .from('conversations')
      .select('*, contact:contacts(naam, telefoon)')
      .eq('id', id)
      .single()

    if (conv?.contact) {
      navigation.setOptions({
        title: conv.contact.naam || conv.contact.telefoon || 'Gesprek',
      })
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgs) setMessages(msgs as Message[])
    setLoading(false)
  }, [id, navigation])

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`gesprek-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages(prev => [...prev, newMsg])
        if (newMsg.richting === 'inkomend') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, load])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const inhoud = input.trim()
    setInput('')
    setSending(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: id,
      richting: 'uitgaand',
      type: 'text',
      inhoud,
      status: 'verzonden',
    }).select().single()

    if (msg) {
      setMessages(prev => [...prev, msg as Message])
      await supabase.from('conversations').update({
        last_message_at: new Date().toISOString(),
      }).eq('id', id)

      // Call send API
      await fetch(`${process.env.EXPO_PUBLIC_APP_URL || 'https://wappzakelijk-nl.vercel.app'}/api/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: id, messageId: msg.id, inhoud }),
      }).catch(console.error)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }

    setSending(false)
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#25d366" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 30).springify()}
            style={[
              styles.bubble,
              item.richting === 'uitgaand' ? styles.bubbleUitgaand : styles.bubbleInkomend,
            ]}
          >
            <Text style={[
              styles.bubbleText,
              item.richting === 'uitgaand' ? styles.bubbleTextUitgaand : styles.bubbleTextInkomend,
            ]}>
              {item.inhoud}
            </Text>
            <Text style={[
              styles.bubbleTijd,
              item.richting === 'uitgaand' ? styles.bubbleTijdUitgaand : styles.bubbleTijdInkomend,
            ]}>
              {new Date(item.created_at).toLocaleTimeString('nl-NL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nog geen berichten</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Typ een bericht..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={styles.input}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || sending}
          style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
        >
          {sending
            ? <ActivityIndicator color="#000" size="small" />
            : <Send color="#000" size={20} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06060f' },
  messageList: { padding: 16, paddingBottom: 20 },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  bubbleInkomend: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  bubbleUitgaand: {
    alignSelf: 'flex-end',
    backgroundColor: '#25d366',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextInkomend: { color: 'rgba(255,255,255,0.9)' },
  bubbleTextUitgaand: { color: '#fff' },
  bubbleTijd: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTijdInkomend: { color: 'rgba(255,255,255,0.3)' },
  bubbleTijdUitgaand: { color: 'rgba(255,255,255,0.7)' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(6,6,15,0.95)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#25d366',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  sendButtonDisabled: { opacity: 0.4 },
})
