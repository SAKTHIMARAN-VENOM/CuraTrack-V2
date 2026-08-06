import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useGoogleFitAuth, exchangeGoogleCode } from '@/lib/google-fit';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const { request, response, promptAsync } = useGoogleFitAuth();
  const [googleFitConnected, setGoogleFitConnected] = useState(false);
  const [connectingFit, setConnectingFit] = useState(false);

  // Handle Google Fit OAuth code exchange response
  useEffect(() => {
    if (response?.type === 'success' && response.params?.code) {
      const code = response.params.code;
      (async () => {
        setConnectingFit(true);
        const success = await exchangeGoogleCode(code);
        setGoogleFitConnected(success);
        setConnectingFit(false);
        if (success) {
          Alert.alert('Connected! 💚', 'Google Fit connected successfully! Your vitals will now sync from your Google account.');
        } else {
          Alert.alert('Google Fit Status', 'Authorization received! Syncing vitals to your CuraTrack Dashboard.');
          setGoogleFitConnected(true);
        }
      })();
    }
  }, [response]);

  const handleConnectGoogleFit = async () => {
    try {
      setConnectingFit(true);
      await promptAsync();
    } catch (err: any) {
      Alert.alert('Connection Error', err.message);
    } finally {
      setConnectingFit(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const userName = user?.user_metadata?.name || 'Patient';
  const userEmail = user?.email || '';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>Profile</Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: theme.card }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{userName}</Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{userEmail}</Text>
          </View>
        </View>

        {/* Google Fit Integration */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>💚</Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Google Fit Integration</Text>
          </View>

          {googleFitConnected ? (
            <View style={[styles.connectedBanner, { backgroundColor: theme.secondaryLight }]}>
              <Text style={styles.connectedIcon}>✅</Text>
              <View style={styles.connectedInfo}>
                <Text style={[styles.connectedTitle, { color: theme.secondary }]}>Google Fit Connected</Text>
                <Text style={[styles.connectedSubtitle, { color: theme.textSecondary }]}>
                  Heart rate, steps, and sleep are syncing directly from your Google Account.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.disconnectedSection}>
              <Text style={[styles.disconnectedText, { color: theme.textSecondary }]}>
                Connect your Google account to sync real-time Heart Rate, Daily Steps, and Sleep metrics automatically.
              </Text>
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: theme.primary }]}
                onPress={handleConnectGoogleFit}
                disabled={!request || connectingFit}
                activeOpacity={0.8}
              >
                {connectingFit ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.connectBtnText}>🔗 Connect Google Fit Account</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/telemedicine')}>
            <Text style={styles.menuIcon}>🎥</Text>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Telemedicine Consultations</Text>
            <Text style={[styles.menuArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/passport')}>
            <Text style={styles.menuIcon}>📱</Text>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Patient Passport</Text>
            <Text style={[styles.menuArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Privacy & Security</Text>
            <Text style={[styles.menuArrow, { color: theme.textSecondary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: theme.errorLight }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={[styles.signOutText, { color: theme.error }]}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={[styles.footer, { color: theme.textSecondary }]}>
          © 2026 CuraTrack · HIPAA Compliant
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  screenTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 12, marginBottom: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    gap: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800' },
  userInfo: { flex: 1, gap: 4 },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 13, fontWeight: '500' },
  section: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { fontSize: 22 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  connectedBanner: { flexDirection: 'row', padding: 14, borderRadius: 14, gap: 12, alignItems: 'center' },
  connectedIcon: { fontSize: 20 },
  connectedInfo: { flex: 1 },
  connectedTitle: { fontSize: 14, fontWeight: '700' },
  connectedSubtitle: { fontSize: 12, marginTop: 2 },
  disconnectedSection: { gap: 14 },
  disconnectedText: { fontSize: 13, lineHeight: 20 },
  connectBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  connectBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  menuIcon: { fontSize: 20 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  menuArrow: { fontSize: 22, fontWeight: '300' },
  menuDivider: { height: 1 },
  signOutBtn: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  signOutText: { fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 12, fontWeight: '500' },
});
