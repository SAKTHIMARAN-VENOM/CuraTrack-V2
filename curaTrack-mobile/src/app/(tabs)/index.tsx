import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';
import { VitalCard } from '@/components/VitalCard';
import type { VitalsData, HealthInsight } from '@/lib/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [fitRes, insightsRes] = await Promise.allSettled([
        apiFetch<VitalsData>('/api/fit-data'),
        apiFetch<{ insights: HealthInsight[] }>('/api/health-insights'),
      ]);
      if (fitRes.status === 'fulfilled') setVitals(fitRes.value);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.insights || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const userName = user?.user_metadata?.name?.split(' ')[0] || 'there';
  const latestBpm =
    vitals?.heartRateData && vitals.heartRateData.length > 0
      ? vitals.heartRateData[vitals.heartRateData.length - 1].bpm
      : '--';
  const steps = vitals?.steps || 0;
  const stepsPercent = Math.min((steps / 10000) * 100, 100);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Syncing vitals...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>
              Welcome back, {userName}
            </Text>
            <Text style={[styles.subheading, { color: theme.textSecondary }]}>
              Your health overview for today
            </Text>
          </View>
        </View>

        {/* Vital Cards */}
        <View style={styles.vitalsRow}>
          <VitalCard
            icon="❤️"
            label="Heart Rate"
            value={String(latestBpm)}
            unit="bpm"
            accentColor={theme.error}
            accentBg={theme.errorLight}
            badge="Live"
          />
          <VitalCard
            icon="👣"
            label="Daily Steps"
            value={steps.toLocaleString()}
            accentColor={theme.secondary}
            accentBg={theme.secondaryLight}
            progress={stepsPercent}
          />
          <VitalCard
            icon="🌙"
            label="Sleep"
            value={vitals?.sleep?.formatted || '--'}
            accentColor={theme.primary}
            accentBg={theme.primaryLight}
          />
        </View>

        {/* AI Health Insights */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBg, { backgroundColor: theme.primaryLight }]}>
              <Text style={styles.sectionIcon}>✨</Text>
            </View>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                AI Health Insights
              </Text>
              <Text style={[styles.sectionPowered, { color: theme.textSecondary }]}>
                Powered by Llama 3.1
              </Text>
            </View>
          </View>

          {loadingInsights ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
          ) : insights.length > 0 ? (
            <View style={styles.insightsList}>
              {insights.map((item, idx) => {
                const colorMap = {
                  green: { bg: '#F0FDF4', text: '#15803D', badge: '#DCFCE7' },
                  amber: { bg: '#FFFBEB', text: '#B45309', badge: '#FEF3C7' },
                  red: { bg: '#FEF2F2', text: '#DC2626', badge: '#FEE2E2' },
                };
                const colors = colorMap[item.statusColor] || colorMap.green;

                return (
                  <View
                    key={idx}
                    style={[styles.insightCard, { backgroundColor: theme.backgroundElement }]}
                  >
                    <View style={[styles.insightIconBg, { backgroundColor: colors.bg }]}>
                      <Text style={styles.insightIcon}>
                        {item.icon === 'favorite' ? '❤️' : item.icon === 'steps' ? '👣' : '🧠'}
                      </Text>
                    </View>
                    <View style={styles.insightContent}>
                      <View style={styles.insightHeader}>
                        <Text style={[styles.insightCategory, { color: theme.text }]}>
                          {item.category}
                        </Text>
                        <View style={[styles.insightBadge, { backgroundColor: colors.badge }]}>
                          <Text style={[styles.insightBadgeText, { color: colors.text }]}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.insightText, { color: theme.textSecondary }]}>
                        {item.insight}
                      </Text>
                      <View style={[styles.tipBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Text style={[styles.tipLabel, { color: theme.textSecondary }]}>
                          💡 Recommendation
                        </Text>
                        <Text style={[styles.tipText, { color: theme.text }]}>{item.tip}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyInsights}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No insights available yet.
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.quickActionsTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.card, borderBottomColor: theme.primary }]}
              onPress={() => router.push('/passport')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: theme.primaryLight }]}>
                <Text style={styles.actionIcon}>📱</Text>
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Patient Passport</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                Generate QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.card, borderBottomColor: '#22C55E' }]}
              onPress={() => router.push('/telemedicine')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.actionIcon}>🎥</Text>
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Telemedicine</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                Virtual doctor consult
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.card, borderBottomColor: theme.secondary }]}
              onPress={() => router.push('/(tabs)/benefits')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBg, { backgroundColor: theme.secondaryLight }]}>
                <Text style={styles.actionIcon}>💰</Text>
              </View>
              <Text style={[styles.actionTitle, { color: theme.text }]}>Benefits</Text>
              <Text style={[styles.actionSubtitle, { color: theme.textSecondary }]}>
                Coverage & schemes
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '600' },
  header: { marginTop: 12, marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subheading: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  vitalsRow: { gap: 12, marginBottom: 20 },
  section: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sectionIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  sectionPowered: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  insightsList: { gap: 12 },
  insightCard: { flexDirection: 'row', padding: 16, borderRadius: 16, gap: 12 },
  insightIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightIcon: { fontSize: 20 },
  insightContent: { flex: 1 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  insightCategory: { fontSize: 14, fontWeight: '700' },
  insightBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  insightBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  insightText: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  tipBox: { padding: 10, borderRadius: 10, borderWidth: 1 },
  tipLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  tipText: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  emptyInsights: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { fontSize: 13 },
  quickActions: { marginBottom: 8 },
  quickActionsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: {
    flex: 1,
    padding: 18,
    borderRadius: 20,
    gap: 10,
    borderBottomWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionIcon: { fontSize: 20 },
  actionTitle: { fontSize: 14, fontWeight: '800' },
  actionSubtitle: { fontSize: 11, fontWeight: '500' },
});
