import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';
import type { GovernmentScheme } from '@/lib/types';

export default function BenefitsScreen() {
  const theme = useTheme();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchemes = useCallback(async () => {
    try {
      const res = await apiFetch<{ schemes: GovernmentScheme[] }>('/api/government-schemes');
      setSchemes(res.schemes || []);
    } catch (err) {
      console.error('Schemes fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void fetchSchemes();
  }, [fetchSchemes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchemes();
    setRefreshing(false);
  }, [fetchSchemes]);

  const handleCheckEligibility = async () => {
    try {
      const res = await apiFetch('/api/insurance/eligibility', {
        method: 'POST',
        body: JSON.stringify({
          patientId: 'demo-patient-001',
          serviceType: 'general-checkup',
          insuranceId: 'INS-123',
        }),
      });
      Alert.alert(
        'Eligibility Result',
        res.eligible
          ? `✅ You are eligible! Coverage: ${res.coveragePercentage || 80}%`
          : '❌ Not eligible for this service.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return { bg: '#DCFCE7', text: '#15803D' };
    if (pct >= 50) return { bg: '#FEF3C7', text: '#B45309' };
    return { bg: '#FEE2E2', text: '#DC2626' };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Benefits & Schemes</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          AI-matched coverage & government schemes
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Insurance Check */}
          <View style={[styles.insuranceCard, { backgroundColor: theme.primaryLight, borderColor: theme.primary + '30' }]}>
            <View style={styles.insuranceHeader}>
              <Text style={styles.insuranceIcon}>🏥</Text>
              <View style={styles.insuranceInfo}>
                <Text style={[styles.insuranceTitle, { color: theme.text }]}>Insurance Eligibility</Text>
                <Text style={[styles.insuranceSubtitle, { color: theme.textSecondary }]}>
                  Check your coverage for medical services
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.checkBtn, { backgroundColor: theme.primary }]}
              onPress={handleCheckEligibility}
              activeOpacity={0.8}
            >
              <Text style={styles.checkBtnText}>Check Eligibility</Text>
            </TouchableOpacity>
          </View>

          {/* Government Schemes */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🏛️ Government Schemes</Text>

          {schemes.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
              <Text style={styles.emptyIcon}>🏛️</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No schemes found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Schemes will be matched based on your health profile.
              </Text>
            </View>
          ) : (
            <View style={styles.schemesList}>
              {schemes.map((scheme, idx) => {
                const matchColor = getMatchColor(scheme.match_percentage);
                return (
                  <View key={idx} style={[styles.schemeCard, { backgroundColor: theme.card }]}>
                    <View style={styles.schemeHeader}>
                      <View style={styles.schemeInfo}>
                        <Text style={[styles.schemeName, { color: theme.text }]}>{scheme.name}</Text>
                        <View style={[styles.schemeTypeBadge, { backgroundColor: theme.backgroundElement }]}>
                          <Text style={[styles.schemeTypeText, { color: theme.textSecondary }]}>
                            {scheme.type}
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.matchBadge, { backgroundColor: matchColor.bg }]}>
                        <Text style={[styles.matchText, { color: matchColor.text }]}>
                          {scheme.match_percentage}%
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.schemeReason, { color: theme.textSecondary }]}>
                      {scheme.reason}
                    </Text>
                    <View style={[styles.schemeDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.schemeFooter}>
                      <Text style={[styles.schemeAmount, { color: theme.primary }]}>
                        {scheme.amount}
                      </Text>
                      <TouchableOpacity
                        style={[styles.applyBtn, { backgroundColor: theme.primary + '15' }]}
                        onPress={() => Alert.alert('Applied', `Claim submitted for ${scheme.name}`)}
                      >
                        <Text style={[styles.applyBtnText, { color: theme.primary }]}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  insuranceCard: { padding: 20, borderRadius: 20, marginBottom: 24, gap: 16, borderWidth: 1 },
  insuranceHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  insuranceIcon: { fontSize: 32 },
  insuranceInfo: { flex: 1 },
  insuranceTitle: { fontSize: 17, fontWeight: '700' },
  insuranceSubtitle: { fontSize: 12, marginTop: 2 },
  checkBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  checkBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  schemesList: { gap: 12 },
  schemeCard: { padding: 18, borderRadius: 18, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  schemeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  schemeInfo: { flex: 1, gap: 6 },
  schemeName: { fontSize: 15, fontWeight: '700' },
  schemeTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  schemeTypeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  matchBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  matchText: { fontSize: 14, fontWeight: '800' },
  schemeReason: { fontSize: 12, lineHeight: 18 },
  schemeDivider: { height: 1 },
  schemeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeAmount: { fontSize: 16, fontWeight: '800' },
  applyBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10 },
  applyBtnText: { fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 20, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
