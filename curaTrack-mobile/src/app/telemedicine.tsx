import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function TelemedicineHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [customRoomId, setCustomRoomId] = useState('');

  const doctors = [
    {
      id: 'doc-1',
      name: 'Dr. Sarah Jenkins',
      specialty: 'Cardiology & Internal Medicine',
      experience: '12+ yrs exp',
      status: 'Available Now',
      rating: '4.9 ★',
      roomId: 'cardiology-room-101',
      avatar: '👩‍⚕️',
    },
    {
      id: 'doc-2',
      name: 'Dr. Rajesh Kumar',
      specialty: 'Endocrinology & Diabetes Specialist',
      experience: '15+ yrs exp',
      status: 'Available Now',
      rating: '4.9 ★',
      roomId: 'endocrinology-room-202',
      avatar: '👨‍⚕️',
    },
    {
      id: 'doc-3',
      name: 'Dr. Ananya Sharma',
      specialty: 'General Pediatrics & Wellness',
      experience: '9+ yrs exp',
      status: 'In Consultation',
      rating: '4.8 ★',
      roomId: 'pediatrics-room-303',
      avatar: '👩‍⚕️',
    },
  ];

  const handleStartCall = (roomId: string) => {
    router.push({
      pathname: '/call/[roomId]',
      params: { roomId },
    });
  };

  const handleJoinCustomRoom = () => {
    if (!customRoomId.trim()) {
      Alert.alert('Room ID Required', 'Please enter a valid room ID or code to join.');
      return;
    }
    handleStartCall(customRoomId.trim());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backText, { color: theme.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Telemedicine 🎥</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Connect with certified doctors via secure end-to-end encrypted video
          </Text>
        </View>

        {/* Join Custom Room Card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🔑 Join Room with Code</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Enter the appointment code provided by your clinic:
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.roomInput,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="e.g. consult-4920"
              placeholderTextColor={theme.textSecondary}
              value={customRoomId}
              onChangeText={setCustomRoomId}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: theme.primary }]}
              onPress={handleJoinCustomRoom}
            >
              <Text style={styles.joinBtnText}>Join Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Available Doctors List */}
        <Text style={[styles.sectionHeader, { color: theme.text }]}>👨‍⚕️ Available Doctors</Text>

        {doctors.map((doc) => (
          <View key={doc.id} style={[styles.doctorCard, { backgroundColor: theme.surface }]}>
            <View style={styles.doctorHeader}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight }]}>
                <Text style={styles.avatarEmoji}>{doc.avatar}</Text>
              </View>
              <View style={styles.doctorMeta}>
                <Text style={[styles.doctorName, { color: theme.text }]}>{doc.name}</Text>
                <Text style={[styles.doctorSpecialty, { color: theme.textSecondary }]}>{doc.specialty}</Text>
                <View style={styles.badgeRow}>
                  <Text style={[styles.ratingBadge, { backgroundColor: '#FEF3C7', color: '#B45309' }]}>
                    {doc.rating}
                  </Text>
                  <Text style={[styles.expBadge, { color: theme.textSecondary }]}>{doc.experience}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.callBtn,
                doc.status === 'Available Now'
                  ? { backgroundColor: theme.primary }
                  : { backgroundColor: theme.border },
              ]}
              onPress={() => handleStartCall(doc.roomId)}
            >
              <Text style={styles.callBtnIcon}>📹</Text>
              <Text style={styles.callBtnText}>
                {doc.status === 'Available Now' ? 'Start Instant Video Consultation' : 'Join Queue'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, gap: 18 },
  header: { gap: 4 },
  backText: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '500' },
  card: {
    padding: 18,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  roomInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  joinBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  sectionHeader: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  doctorCard: {
    padding: 18,
    borderRadius: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  doctorHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 32 },
  doctorMeta: { flex: 1, gap: 3 },
  doctorName: { fontSize: 17, fontWeight: '700' },
  doctorSpecialty: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  ratingBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  expBadge: { fontSize: 12 },
  callBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnIcon: { fontSize: 18 },
  callBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
