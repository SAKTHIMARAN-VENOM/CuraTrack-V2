import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { apiFetch } from '@/lib/api';
import type { NewsArticle } from '@/lib/types';

export default function AlertsScreen() {
  const theme = useTheme();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const res = await apiFetch<{ articles: NewsArticle[] }>('/api/health-news');
      setArticles(res.articles || []);
    } catch (err) {
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void fetchNews();
  }, [fetchNews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  }, [fetchNews]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Health Alerts</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Latest health news & risk alerts
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
          {/* Risk Alert Banner */}
          <View style={[styles.riskBanner, { backgroundColor: theme.errorLight, borderColor: theme.error + '30' }]}>
            <Text style={styles.riskIcon}>⚠️</Text>
            <View style={styles.riskContent}>
              <Text style={[styles.riskTitle, { color: theme.error }]}>Health Risk Monitor</Text>
              <Text style={[styles.riskText, { color: theme.textSecondary }]}>
                Risk alerts are generated based on your vitals and medical history.
              </Text>
            </View>
          </View>

          {/* News Section */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📰 Health News</Text>

          {articles.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
              <Text style={styles.emptyIcon}>📰</Text>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No news available</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Pull to refresh for the latest health news.
              </Text>
            </View>
          ) : (
            <View style={styles.newsList}>
              {articles.map((article, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.newsCard, { backgroundColor: theme.card }]}
                  onPress={() => article.url && Linking.openURL(article.url)}
                  activeOpacity={0.7}
                >
                  {article.image && (
                    <Image
                      source={{ uri: article.image }}
                      style={styles.newsImage}
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                  <View style={styles.newsContent}>
                    <Text style={[styles.newsTitle, { color: theme.text }]} numberOfLines={2}>
                      {article.title}
                    </Text>
                    <Text style={[styles.newsDescription, { color: theme.textSecondary }]} numberOfLines={3}>
                      {article.description}
                    </Text>
                    <Text style={[styles.newsDate, { color: theme.textSecondary }]}>
                      {formatDate(article.publishedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
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
  riskBanner: { flexDirection: 'row', padding: 16, borderRadius: 16, gap: 12, marginBottom: 20, borderWidth: 1 },
  riskIcon: { fontSize: 24 },
  riskContent: { flex: 1 },
  riskTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  riskText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  newsList: { gap: 14 },
  newsCard: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  newsImage: { width: '100%', height: 180, backgroundColor: '#E5E7EB' },
  newsContent: { padding: 16, gap: 6 },
  newsTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  newsDescription: { fontSize: 13, lineHeight: 20 },
  newsDate: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 20, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
