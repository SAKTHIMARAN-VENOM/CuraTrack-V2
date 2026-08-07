import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

// Generate next 14 days for date selection
function getNextDays(count: number) {
  const days: { label: string; short: string; dateStr: string; date: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${weekday}, ${month} ${dayNum}`,
      short: `${weekday}\n${dayNum}`,
      dateStr: d.toISOString().split('T')[0],
      date: d,
    });
  }
  return days;
}

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
];

function parseTime(slot: string): { hours: number; minutes: number } {
  const [time, ampm] = slot.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  status: string;
  rating: string;
  roomId: string;
  avatar: string;
}

export default function TelemedicineHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [customRoomId, setCustomRoomId] = useState('');

  // Scheduling modal state
  const [scheduleDoctor, setScheduleDoctor] = useState<DoctorInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Patient appointments state
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);

  const nextDays = useMemo(() => getNextDays(14), []);

  const doctors: DoctorInfo[] = [
    {
      id: 'doc-david-ross',
      name: 'Dr. David Ross',
      specialty: 'Cardiology & Internal Medicine Specialist',
      experience: '15+ yrs exp',
      status: 'Available Now',
      rating: '4.9 ★',
      roomId: 'cardiology-room-101',
      avatar: '👨‍⚕️',
    },
  ];

  const fetchPatientAppointments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', user.id)
        .in('status', ['ringing', 'scheduled', 'active'])
        .order('scheduled_time', { ascending: true });

      if (appts) {
        const enriched = appts.map((a: any) => {
          const doc = doctors.find((d) => d.id === a.doctor_id);
          return {
            ...a,
            doctor_name: doc?.name || 'Dr. Medical Specialist',
            specialty: doc?.specialty || 'General Specialist',
            avatar: doc?.avatar || '👨‍⚕️',
          };
        });
        setPatientAppointments(enriched);
      }
    } catch (err) {
      console.warn('Error loading patient appointments:', err);
    }
  }, [doctors]);

  useEffect(() => {
    fetchPatientAppointments();

    const channel = supabase
      .channel('mobile_patient_appts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        () => {
          fetchPatientAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPatientAppointments]);

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

  const openScheduleModal = (doc: DoctorInfo) => {
    setScheduleDoctor(doc);
    setSelectedDate(nextDays[0]?.dateStr || '');
    setSelectedTime('');
    setScheduleNotes('');
  };

  const closeScheduleModal = () => {
    setScheduleDoctor(null);
    setSelectedDate('');
    setSelectedTime('');
    setScheduleNotes('');
  };

  const handleConfirmSchedule = async () => {
    if (!selectedDate || !selectedTime || !scheduleDoctor) {
      Alert.alert('Incomplete', 'Please select both a date and a time slot.');
      return;
    }

    setIsBooking(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not Logged In', 'Please sign in to schedule an appointment.');
        setIsBooking(false);
        return;
      }

      const { hours, minutes } = parseTime(selectedTime);
      const scheduledDate = new Date(selectedDate);
      scheduledDate.setHours(hours, minutes, 0, 0);

      const roomId = `sched-${scheduleDoctor.id}-${Date.now()}`;

      const { error } = await supabase.from('appointments').insert({
        client_id: user.id,
        doctor_id: scheduleDoctor.id,
        scheduled_time: scheduledDate.toISOString(),
        room_id: roomId,
        status: 'ringing',
      });

      if (error) {
        Alert.alert('Booking Error', error.message);
      } else {
        closeScheduleModal();
        fetchPatientAppointments();
        Alert.alert(
          '✅ Appointment Scheduled',
          `Your consultation with ${scheduleDoctor.name} is confirmed for ${selectedDate} at ${selectedTime}.\n\nRoom Code: ${roomId.slice(0, 16)}…`,
          [{ text: 'Got it' }]
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to schedule appointment.');
    } finally {
      setIsBooking(false);
    }
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

        {/* Scheduled Consultations for Patient */}
        {patientAppointments.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionHeader, { color: theme.text }]}>📅 Your Scheduled Consultations</Text>
            {patientAppointments.map((appt) => {
              const schedDate = appt.scheduled_time ? new Date(appt.scheduled_time) : null;
              const dateStr = schedDate ? schedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Scheduled';
              const timeStr = schedDate ? schedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
              const isCallActive = appt.status === 'active';

              return (
                <View key={appt.id} style={[styles.doctorCard, { backgroundColor: theme.surface, borderColor: theme.primary, borderWidth: 1.5 }]}>
                  <View style={styles.doctorHeader}>
                    <View style={[styles.avatarCircle, { backgroundColor: theme.primaryLight }]}>
                      <Text style={styles.avatarEmoji}>{appt.avatar}</Text>
                    </View>
                    <View style={styles.doctorMeta}>
                      <Text style={[styles.doctorName, { color: theme.text }]}>{appt.doctor_name}</Text>
                      <Text style={[styles.doctorSpecialty, { color: theme.textSecondary }]}>{appt.specialty}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary, marginTop: 4 }}>
                        {isCallActive ? '🟢 Active Call Room' : `🕒 ${dateStr} at ${timeStr}`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.callBtn, { backgroundColor: theme.primary }]}
                    onPress={() => handleStartCall(appt.room_id)}
                  >
                    <Text style={styles.callBtnIcon}>📹</Text>
                    <Text style={styles.callBtnText}>Join Video Call Room</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

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

            {/* Action buttons row */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.callBtn,
                  { flex: 1 },
                  doc.status === 'Available Now'
                    ? { backgroundColor: theme.primary }
                    : { backgroundColor: theme.border },
                ]}
                onPress={() => handleStartCall(doc.roomId)}
              >
                <Text style={styles.callBtnIcon}>📹</Text>
                <Text style={styles.callBtnText}>
                  {doc.status === 'Available Now' ? 'Instant Call' : 'Join Queue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scheduleBtn, { borderColor: theme.primary }]}
                onPress={() => openScheduleModal(doc)}
              >
                <Text style={styles.scheduleBtnIcon}>📅</Text>
                <Text style={[styles.scheduleBtnText, { color: theme.primary }]}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ──── SCHEDULING MODAL ──── */}
      <Modal
        visible={!!scheduleDoctor}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeScheduleModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={closeScheduleModal}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Appointment</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Doctor Info */}
            {scheduleDoctor && (
              <View style={[styles.modalDoctorCard, { backgroundColor: theme.surface }]}>
                <View style={[styles.modalAvatarCircle, { backgroundColor: theme.primaryLight }]}>
                  <Text style={{ fontSize: 28 }}>{scheduleDoctor.avatar}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalDoctorName, { color: theme.text }]}>{scheduleDoctor.name}</Text>
                  <Text style={[styles.modalDoctorSpec, { color: theme.textSecondary }]}>{scheduleDoctor.specialty}</Text>
                </View>
              </View>
            )}

            {/* Date Selection */}
            <Text style={[styles.sectionLabel, { color: theme.text }]}>📆 Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {nextDays.map((day) => (
                <TouchableOpacity
                  key={day.dateStr}
                  style={[
                    styles.datePill,
                    { borderColor: theme.border },
                    selectedDate === day.dateStr && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setSelectedDate(day.dateStr)}
                >
                  <Text
                    style={[
                      styles.datePillText,
                      { color: theme.textSecondary },
                      selectedDate === day.dateStr && { color: '#FFF' },
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selectedDate ? (
              <Text style={[styles.dateLabel, { color: theme.primary }]}>
                {nextDays.find(d => d.dateStr === selectedDate)?.label || selectedDate}
              </Text>
            ) : null}

            {/* Time Slot Grid */}
            <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 20 }]}>🕐 Select Time</Text>
            <View style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.timePill,
                    { borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    selectedTime === slot && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text
                    style={[
                      styles.timePillText,
                      { color: theme.text },
                      selectedTime === slot && { color: '#FFF', fontWeight: '800' },
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional Notes */}
            <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 20 }]}>📝 Reason (Optional)</Text>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border },
              ]}
              placeholder="e.g. Follow-up on blood test results"
              placeholderTextColor={theme.textSecondary}
              value={scheduleNotes}
              onChangeText={setScheduleNotes}
              multiline
              numberOfLines={3}
            />

            {/* Confirm Button */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: theme.primary },
                (!selectedDate || !selectedTime || isBooking) && { opacity: 0.5 },
              ]}
              onPress={handleConfirmSchedule}
              disabled={!selectedDate || !selectedTime || isBooking}
            >
              <Text style={styles.confirmBtnText}>
                {isBooking ? 'Booking…' : '✅ Confirm Appointment'}
              </Text>
            </TouchableOpacity>

            {/* Info note */}
            <View style={[styles.infoNote, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.infoNoteText, { color: theme.primary }]}>
                🔒 Your appointment will appear on the doctor's schedule. You'll receive a room code to join the call at the scheduled time.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
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
  scheduleBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  scheduleBtnIcon: { fontSize: 16 },
  scheduleBtnText: { fontSize: 14, fontWeight: '700' },

  // ─── Modal Styles ───
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 15, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    marginBottom: 24,
  },
  modalAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoctorName: { fontSize: 17, fontWeight: '700' },
  modalDoctorSpec: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  dateRow: { gap: 10, paddingBottom: 4 },
  datePill: {
    width: 60,
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillText: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 16 },
  dateLabel: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timePill: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
  },
  timePillText: { fontSize: 13, fontWeight: '600' },
  notesInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  infoNote: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
  },
  infoNoteText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
});
