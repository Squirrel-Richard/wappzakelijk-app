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
  Clipboard,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { CreditCard, Copy, CheckCircle, Clock, Plus } from 'lucide-react-native'
import { supabase } from '../../src/lib/supabase'

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://wappzakelijk-nl.vercel.app'

type PaymentLink = {
  id: string
  bedrag: number
  omschrijving: string | null
  stripe_payment_link: string | null
  status: string
  created_at: string
}

export default function BetaallinkScreen() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [bedrag, setBedrag] = useState('')
  const [omschrijving, setOmschrijving] = useState('')
  const [telefoon, setTelefoon] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('payment_links')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setLinks(data as PaymentLink[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    const bedragNum = parseFloat(bedrag.replace(',', '.'))
    if (!bedragNum || bedragNum < 0.01 || !omschrijving.trim()) {
      Alert.alert('Vul een geldig bedrag en omschrijving in')
      return
    }

    setSaving(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const res = await fetch(`${APP_URL}/api/betaallinks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bedrag: bedragNum,
          omschrijving: omschrijving.trim(),
          telefoon: telefoon.trim() || undefined,
        }),
      })
      const { paymentLink, error: apiError } = await res.json()

      if (paymentLink) {
        setLinks(prev => [paymentLink, ...prev])
        setBedrag('')
        setOmschrijving('')
        setTelefoon('')
        setShowForm(false)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      } else {
        Alert.alert('Fout', apiError || 'Kon betaallink niet aanmaken')
      }
    } catch (e) {
      Alert.alert('Netwerkfout', 'Controleer je verbinding')
    }

    setSaving(false)
  }

  const copyLink = (url: string, id: string) => {
    Clipboard.setString(url)
    setCopiedId(id)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatEuro = (amount: number) =>
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          onPress={() => {
            setShowForm(!showForm)
            Haptics.selectionAsync()
          }}
          style={styles.addButton}
        >
          <Plus color="#000" size={20} />
          <Text style={styles.addButtonText}>Nieuwe iDEAL betaallink</Text>
        </TouchableOpacity>

        {showForm && (
          <Animated.View entering={FadeInDown.springify()} style={styles.form}>
            <Text style={styles.formTitle}>iDEAL betaallink aanmaken</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bedrag (€)</Text>
              <TextInput
                value={bedrag}
                onChangeText={setBedrag}
                placeholder="25.00"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Omschrijving</Text>
              <TextInput
                value={omschrijving}
                onChangeText={setOmschrijving}
                placeholder="Knipbeurt 15 jan"
                placeholderTextColor="rgba(255,255,255,0.25)"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefoonnummer klant (optioneel)</Text>
              <TextInput
                value={telefoon}
                onChangeText={setTelefoon}
                placeholder="+31612345678"
                placeholderTextColor="rgba(255,255,255,0.25)"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              onPress={create}
              disabled={saving}
              style={styles.saveButton}
            >
              {saving
                ? <ActivityIndicator color="#000" />
                : <><CreditCard color="#000" size={18} /><Text style={styles.saveButtonText}>Betaallink aanmaken</Text></>
              }
            </TouchableOpacity>
            <Text style={styles.stripeNote}>iDEAL betaling via Stripe · Testmodus</Text>
          </Animated.View>
        )}

        {loading ? (
          <ActivityIndicator color="#25d366" style={{ marginTop: 40 }} />
        ) : links.length === 0 && !showForm ? (
          <View style={styles.empty}>
            <CreditCard color="rgba(255,255,255,0.15)" size={48} />
            <Text style={styles.emptyTitle}>Nog geen betaallinks</Text>
            <Text style={styles.emptySubtitle}>Genereer je eerste iDEAL betaallink</Text>
          </View>
        ) : (
          links.map((link, i) => (
            <Animated.View
              key={link.id}
              entering={FadeInDown.delay(i * 60).springify()}
              style={[styles.card, link.status === 'betaald' && styles.cardBetaald]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, link.status === 'betaald' && styles.cardIconGreen]}>
                  <CreditCard color={link.status === 'betaald' ? '#25d366' : 'rgba(255,255,255,0.4)'} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBedrag}>{formatEuro(link.bedrag)}</Text>
                  {link.omschrijving && (
                    <Text style={styles.cardOmschrijving}>{link.omschrijving}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, link.status === 'betaald' && styles.statusBadgeGreen]}>
                  {link.status === 'betaald'
                    ? <CheckCircle color="#25d366" size={12} />
                    : <Clock color="rgba(255,255,255,0.4)" size={12} />
                  }
                  <Text style={[styles.statusText, link.status === 'betaald' && styles.statusTextGreen]}>
                    {link.status === 'open' ? 'Open' : link.status === 'betaald' ? 'Betaald' : link.status}
                  </Text>
                </View>
              </View>

              {link.stripe_payment_link && (
                <TouchableOpacity
                  onPress={() => copyLink(link.stripe_payment_link!, link.id)}
                  style={[styles.copyButton, copiedId === link.id && styles.copyButtonCopied]}
                >
                  {copiedId === link.id
                    ? <><CheckCircle color="#25d366" size={15} /><Text style={[styles.copyButtonText, styles.copyButtonTextCopied]}>Gekopieerd!</Text></>
                    : <><Copy color="rgba(255,255,255,0.5)" size={15} /><Text style={styles.copyButtonText}>Kopieer betaallink</Text></>
                  }
                </TouchableOpacity>
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
  saveButton: {
    backgroundColor: '#25d366',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveButtonText: { color: '#000', fontWeight: '700', fontSize: 15 },
  stripeNote: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  cardBetaald: {
    borderColor: 'rgba(37,211,102,0.2)',
    backgroundColor: 'rgba(37,211,102,0.04)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconGreen: { backgroundColor: 'rgba(37,211,102,0.1)' },
  cardBedrag: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cardOmschrijving: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },
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
  statusText: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  statusTextGreen: { color: '#25d366' },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start',
  },
  copyButtonCopied: {
    backgroundColor: 'rgba(37,211,102,0.08)',
    borderColor: 'rgba(37,211,102,0.25)',
  },
  copyButtonText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  copyButtonTextCopied: { color: '#25d366' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 6 },
})
