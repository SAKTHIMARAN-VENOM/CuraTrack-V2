import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';
import type { PassportResponse } from '@/lib/types';

const SCOPE_OPTIONS = [
  { key: 'medications', label: 'Medications', icon: '💊' },
  { key: 'allergies', label: 'Allergies', icon: '⚠️' },
  { key: 'conditions', label: 'Conditions', icon: '🩺' },
  { key: 'vitals', label: 'Vitals', icon: '❤️' },
  { key: 'lab_results', label: 'Lab Results', icon: '🔬' },
  { key: 'immunizations', label: 'Immunizations', icon: '💉' },
];

export default function PassportScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['medications', 'allergies']);
  const [generating, setGenerating] = useState(false);
  const [passport, setPassport] = useState<PassportResponse | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const toggleScope = (key: string) => {
    setSelectedScopes(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  };

  const handleGenerate = async () => {
    if (selectedScopes.length === 0) {
      Alert.alert('Error', 'Select at least one scope.');
      return;
    }

    setGenerating(true);
    try {
      const res = await apiFetch<PassportResponse>('/api/passport/generate', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id || 'demo-patient-001',
          userName: user?.user_metadata?.name || 'Patient',
          scope: selectedScopes,
        }),
      });
      setPassport(res);
      setCountdown(res.expiresInSeconds);

      // Start countdown
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setPassport(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGenerating(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!passport ? (
          <>
            {/* Info */}
            <View style={[styles.infoCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
              <Text style={styles.infoIcon}>🔐</Text>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Generate a secure, one-time-use QR code to share selected medical data.
                The QR expires after 5 minutes and can only be scanned once.
              </Text>
            </View>

            {/* Scope Selection */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Data to Share</Text>

            <View style={styles.scopeGrid}>
              {SCOPE_OPTIONS.map(scope => {
                const isSelected = selectedScopes.includes(scope.key);
                return (
                  <TouchableOpacity
                    key={scope.key}
                    style={[
                      styles.scopeCard,
                      {
                        backgroundColor: isSelected ? theme.primaryLight : theme.card,
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => toggleScope(scope.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.scopeIcon}>{scope.icon}</Text>
                    <Text
                      style={[
                        styles.scopeLabel,
                        { color: isSelected ? theme.primary : theme.text },
                      ]}
                    >
                      {scope.label}
                    </Text>
                    {isSelected && (
                      <View style={[styles.scopeCheck, { backgroundColor: theme.primary }]}>
                        <Text style={styles.scopeCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.generateBtn, { backgroundColor: theme.secondary, opacity: selectedScopes.length === 0 ? 0.5 : 1 }]}
              onPress={handleGenerate}
              disabled={generating || selectedScopes.length === 0}
              activeOpacity={0.8}
            >
              {generating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.generateBtnText}>📱 Generate Passport QR</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* QR Result */}
            <View style={[styles.qrCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.qrTitle, { color: theme.text }]}>Patient Passport</Text>
              <Text style={[styles.qrSubtitle, { color: theme.textSecondary }]}>
                One-time use · Scan to view medical data
              </Text>

              <View style={styles.qrContainer}>
                {passport.qrImage && (
                  <Image
                    source={{ uri: passport.qrImage }}
                    style={styles.qrImage}
                    contentFit="contain"
                  />
                )}
              </View>

              {/* Countdown */}
              {countdown !== null && (
                <View style={[styles.countdownBanner, { backgroundColor: countdown < 60 ? theme.errorLight : theme.secondaryLight }]}>
                  <Text style={[styles.countdownText, { color: countdown < 60 ? theme.error : theme.secondary }]}>
                    ⏱ Expires in {formatCountdown(countdown)}
                  </Text>
                </View>
              )}

              {/* Scope Tags */}
              <View style={styles.scopeTags}>
                {passport.scope.map(s => (
                  <View key={s} style={[styles.scopeTag, { backgroundColor: theme.backgroundElement }]}>
                    <Text style={[styles.scopeTagText, { color: theme.textSecondary }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Generate New */}
            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: theme.backgroundElement }]}
              onPress={() => { setPassport(null); setCountdown(null); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.newBtnText, { color: theme.text }]}>Generate New Passport</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 16, gap: 12, marginBottom: 24, borderWidth: 1 },
  infoIcon: { fontSize: 24 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  scopeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  scopeCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
  },
  scopeIcon: { fontSize: 20 },
  scopeLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  scopeCheck: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  scopeCheckText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  generateBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  qrCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  qrTitle: { fontSize: 22, fontWeight: '800' },
  qrSubtitle: { fontSize: 13, fontWeight: '500' },
  qrContainer: { padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginVertical: 12 },
  qrImage: { width: 220, height: 220 },
  countdownBanner: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center' },
  countdownText: { fontSize: 15, fontWeight: '700' },
  scopeTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 4 },
  scopeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  scopeTagText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  newBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  newBtnText: { fontSize: 15, fontWeight: '700' },
});
