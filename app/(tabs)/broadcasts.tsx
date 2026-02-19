import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Radio, CheckCircle, Clock, Plus } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'

type Broadcast = {
  id: string
  naam: string
  bericht: string
  status: string
  verzonden_aan: number
  created_at: string
}

export default function BroadcastsScreen() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [naam, setNaam] = useState('')
  const [bericht, setBericht] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setBroadcasts(data as Broadcast[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!naam.trim() || !bericht.trim()) {
      Alert.alert('Vul alle velden in')
      return
    }
    setSaving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const { data, error } = await supabase.from('broadcasts').insert({
      naam: naam.trim(),
      bericht: bericht.trim(),
      status: 'concept',
    }).select().single()

    if (data) {
      setBroadcasts(prev => [data as Broadcast, ...prev])
      setNaam('')
      setBericht('')
      setShowForm(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setSaving(false)
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header action */}
        <TouchableOpacity
          onPress={() => {
            setShowForm(!showForm)
            Haptics.selectionAsync()
          }}
          style={styles.addButton}
        >
          <Plus color="#000" size={20} />
          <Text style={styles.addButtonText}>Nieuwe broadcast</Text>
        </TouchableOpacity>

        {/* Form */}
        {showForm && (
          <Animated.View entering={FadeInDown.springify()} style={styles.form}>
            <Text style={styles.formTitle}>Nieuwe broadcast campagne</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Campagnenaam</Text>
              <TextInput
                value={naam}
                onChangeText={setNaam}
                placeholder="Bijv. Zomeraanbieding 2024"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bericht</Text>
              <TextInput
                value={bericht}
                onChangeText={setBericht}
                placeholder="Hoi {{naam}}! We hebben een aanbieding..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={[styles.input, styles.inputMulti]}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.hint}>Gebruik {'{{naam}}'} voor de naam van de klant</Text>
            </View>
            <TouchableOpacity
              onPress={create}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <Text style={styles.saveButtonText}>Opslaan als concept</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* List */}
        {loading ? (
          <ActivityIndicator color="#25d366" style={{ marginTop: 40 }} />
        ) : broadcasts.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <Radio color="rgba(255,255,255,0.15)" size={48} />
            <Text style={styles.emptyTitle}>Nog geen broadcasts</Text>
            <Text style={styles.emptySubtitle}>Maak je eerste campagne aan</Text>
          </View>
        ) : (
          broadcasts.map((bc, i) => (
            <Animated.View
              key={bc.id}
              entering={FadeInDown.delay(i * 60).springify()}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardNaam}>{bc.naam}</Text>
                <View style={[styles.statusBadge, bc.status === 'verzonden' && styles.statusBadgeGreen]}>
                  {bc.status === 'verzonden'
                    ? <CheckCircle color="#25d366" size={12} />
                    : <Clock color="rgba(255,255,255,0.4)" size={12} />
                  }
                  <Text style={[styles.statusText, bc.status === 'verzonden' && styles.statusTextGreen]}>
                    {bc.status === 'concept' ? 'Concept' : bc.status === 'verzonden' ? 'Verzonden' : bc.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardBericht} numberOfLines={2}>{bc.bericht}</Text>
              {bc.verzonden_aan > 0 && (
                <Text style={styles.cardStats}>{bc.verzonden_aan} ontvangers</Text>
              )}
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#06060f' },
  scroll: { padding: 16, paddingBottom: 120 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25d366',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: { color: '#000', fontWeight: '700', fontSize: 16 },
  form: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  formTitle: { color: '#fff', fontWeight: '700', fontSize: 17, marginBottom: 16 },
  inputGroup: { marginBottom: 14 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputMulti: { height: 100, paddingTop: 12 },
  hint: { color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 },
  saveButton: {
    backgroundColor: '#25d366',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: '#000', fontWeight: '700', fontSize: 15 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardNaam: { color: '#fff', fontWeight: '600', fontSize: 15, flex: 1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusBadgeGreen: {
    backgroundColor: 'rgba(37,211,102,0.08)',
    borderColor: 'rgba(37,211,102,0.25)',
  },
  statusText: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  statusTextGreen: { color: '#25d366' },
  cardBericht: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 20 },
  cardStats: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 6 },
})
