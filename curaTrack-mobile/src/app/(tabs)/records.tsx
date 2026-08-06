import { useState, useCallback } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/use-theme';
import { apiUpload } from '@/lib/api';
import type { Medication, IngestionResponse } from '@/lib/types';

export default function RecordsScreen() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'medications' | 'prescriptions' | 'labs'>('medications');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const tabs = [
    { key: 'medications', label: 'Medications' },
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'labs', label: 'Lab Reports' },
  ] as const;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Fetch medications from backend if available
    setRefreshing(false);
  }, []);

  const handleUploadDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'document.jpg',
      } as any);

      const response = await apiUpload<IngestionResponse>('/api/ingest-document', formData);

      if (response.data?.medications?.length) {
        setMedications(prev => [
          ...prev,
          ...response.data.medications.map(m => ({ ...m, status: 'UPCOMING' as const })),
        ]);
        Alert.alert(
          'Document Processed',
          `Found ${response.data.medications.length} medication(s). Please review.`
        );
      } else {
        Alert.alert('Document Processed', 'No medications found. Raw text extracted.');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCaptureDocument = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to scan documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: 'scan.jpg',
      } as any);

      const response = await apiUpload<IngestionResponse>('/api/ingest-document', formData);

      if (response.data?.medications?.length) {
        setMedications(prev => [
          ...prev,
          ...response.data.medications.map(m => ({ ...m, status: 'UPCOMING' as const })),
        ]);
        Alert.alert('Scan Complete', `Found ${response.data.medications.length} medication(s).`);
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleMedStatus = (index: number) => {
    setMedications(prev =>
      prev.map((med, i) => {
        if (i !== index) return med;
        const next =
          med.status === 'TAKEN' ? 'MISSED' : med.status === 'MISSED' ? 'UPCOMING' : 'TAKEN';
        return { ...med, status: next as Medication['status'] };
      })
    );
  };

  const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
    TAKEN: { bg: '#DCFCE7', text: '#15803D', icon: '✅' },
    MISSED: { bg: '#FEE2E2', text: '#DC2626', icon: '❌' },
    UPCOMING: { bg: '#FEF3C7', text: '#B45309', icon: '⏰' },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Health Records</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: theme.primary }]}
            onPress={handleCaptureDocument}
            disabled={uploading}
          >
            <Text style={styles.uploadBtnText}>📷 Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: theme.secondary }]}
            onPress={handleUploadDocument}
            disabled={uploading}
          >
            <Text style={styles.uploadBtnText}>📁 Upload</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: theme.surface },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme.primary : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {uploading && (
        <View style={[styles.uploadingBanner, { backgroundColor: theme.primaryLight }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.uploadingText, { color: theme.primary }]}>
            Processing document with OCR + AI...
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'medications' && (
          <>
            {medications.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                <Text style={styles.emptyIcon}>💊</Text>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No medications yet</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Upload a prescription or scan a document to get started.
                </Text>
              </View>
            ) : (
              <View style={styles.medList}>
                {medications.map((med, idx) => {
                  const sc = statusColors[med.status];
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.medCard, { backgroundColor: theme.card }]}
                      onPress={() => toggleMedStatus(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.medStatusIcon, { backgroundColor: sc.bg }]}>
                        <Text>{sc.icon}</Text>
                      </View>
                      <View style={styles.medInfo}>
                        <Text style={[styles.medName, { color: theme.text }]}>{med.name}</Text>
                        <Text style={[styles.medDosage, { color: theme.textSecondary }]}>
                          {med.dosage} · {med.frequency}
                        </Text>
                        {med.time && (
                          <Text style={[styles.medTime, { color: theme.textSecondary }]}>
                            ⏰ {med.time}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.medBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.medBadgeText, { color: sc.text }]}>{med.status}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {activeTab === 'prescriptions' && (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No prescriptions yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Upload a prescription document to see it here.
            </Text>
          </View>
        )}

        {activeTab === 'labs' && (
          <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
            <Text style={styles.emptyIcon}>🔬</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No lab reports yet</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Upload lab results to track your health markers.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  uploadBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  uploadBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, padding: 4, borderRadius: 14, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  uploadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 12 },
  uploadingText: { fontSize: 13, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  emptyState: { alignItems: 'center', padding: 40, borderRadius: 20, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  medList: { gap: 10 },
  medCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  medStatusIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, gap: 2 },
  medName: { fontSize: 15, fontWeight: '700' },
  medDosage: { fontSize: 12, fontWeight: '500' },
  medTime: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  medBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  medBadgeText: { fontSize: 10, fontWeight: '800' },
});
