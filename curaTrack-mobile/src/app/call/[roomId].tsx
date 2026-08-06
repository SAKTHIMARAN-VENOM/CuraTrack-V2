import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';

export default function TelemedicineCallScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Dr. Sarah Jenkins',
      text: 'Hello! I am reviewing your recent health vitals and blood pressure trends.',
      time: 'Just now',
    },
  ]);

  // Call duration counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Connect simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus('connected');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatLog((prev) => [...prev, { sender: 'You', text: chatMessage, time: now }]);
    setChatMessage('');

    // Doctor auto response
    setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'Dr. Sarah Jenkins',
          text: 'Got it. I am updating your health record notes right now.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    Alert.alert('Consultation Ended', 'Your session summary and prescription notes have been saved to your Records tab.', [
      { text: 'OK', onPress: () => router.replace('/(tabs)') },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0F172A' }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.doctorTitle}>Dr. Sarah Jenkins</Text>
          <Text style={styles.roomSubtitle}>Room: {roomId || 'General-Consult'}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.liveDot, { backgroundColor: callStatus === 'connected' ? '#22C55E' : '#EAB308' }]} />
          <Text style={styles.liveText}>
            {callStatus === 'connected' ? formatDuration(elapsedTime) : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Main Video View Container */}
      <View style={styles.videoContainer}>
        {/* Remote Doctor Feed */}
        <View style={[styles.remoteVideo, { backgroundColor: '#1E293B' }]}>
          {isVideoOff ? (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>👩‍⚕️</Text>
              <Text style={styles.avatarText}>Dr. Sarah Jenkins</Text>
            </View>
          ) : (
            <View style={styles.activeVideoFeed}>
              <Text style={styles.doctorEmojiLarge}>👩‍⚕️</Text>
              <Text style={styles.doctorOverlayName}>Dr. Sarah Jenkins (Cardiology)</Text>
            </View>
          )}

          {/* Self View (Picture-in-Picture) */}
          <View style={styles.pipContainer}>
            <Text style={styles.pipEmoji}>👤</Text>
            <Text style={styles.pipLabel}>You</Text>
          </View>

          {/* Live AI Subtitle Captions Banner */}
          {showCaptions && (
            <View style={styles.captionsBanner}>
              <Text style={styles.captionBadge}>AI Live Captions</Text>
              <Text style={styles.captionText}>
                "Your heart rate trend over the past 7 days looks stable at 72 bpm."
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Chat & Clinical Notes Panel */}
      <View style={styles.notesSection}>
        <Text style={styles.notesSectionTitle}>💬 In-Call Telehealth Notes</Text>
        <ScrollView style={styles.chatScrollView} contentContainerStyle={styles.chatContent}>
          {chatLog.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.chatBubble,
                item.sender === 'You'
                  ? { backgroundColor: theme.primary, alignSelf: 'flex-end' }
                  : { backgroundColor: '#334155', alignSelf: 'flex-start' },
              ]}
            >
              <Text style={styles.senderName}>{item.sender} • {item.time}</Text>
              <Text style={styles.chatText}>{item.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message or symptom..."
            placeholderTextColor="#94A3B8"
            value={chatMessage}
            onChangeText={setChatMessage}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.primary }]} onPress={handleSendMessage}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Call Action Bar */}
      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={[styles.actionBtn, isMuted && styles.actionBtnActive]}
          onPress={() => setIsMuted(!isMuted)}
        >
          <Text style={styles.actionIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
          <Text style={styles.actionLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, isVideoOff && styles.actionBtnActive]}
          onPress={() => setIsVideoOff(!isVideoOff)}
        >
          <Text style={styles.actionIcon}>{isVideoOff ? '📷' : '📹'}</Text>
          <Text style={styles.actionLabel}>{isVideoOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, showCaptions && styles.actionBtnActive]}
          onPress={() => setShowCaptions(!showCaptions)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionLabel}>CC</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Text style={styles.endCallIcon}>📞</Text>
          <Text style={styles.endCallText}>End</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: { padding: 4 },
  backText: { color: '#38BDF8', fontSize: 16, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  doctorTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  roomSubtitle: { color: '#94A3B8', fontSize: 12 },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  videoContainer: {
    height: 250,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  remoteVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeVideoFeed: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorEmojiLarge: { fontSize: 72 },
  doctorOverlayName: { color: '#94A3B8', fontSize: 13, marginTop: 8 },
  avatarPlaceholder: { alignItems: 'center' },
  avatarEmoji: { fontSize: 60 },
  avatarText: { color: '#94A3B8', marginTop: 6, fontSize: 14 },
  pipContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 70,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pipEmoji: { fontSize: 24 },
  pipLabel: { color: '#F8FAFC', fontSize: 10, fontWeight: '600', marginTop: 2 },
  captionsBanner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  captionBadge: { color: '#38BDF8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  captionText: { color: '#F8FAFC', fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  notesSection: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
  },
  notesSectionTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  chatScrollView: { flex: 1 },
  chatContent: { gap: 10 },
  chatBubble: {
    maxWidth: '85%',
    borderRadius: 12,
    padding: 10,
  },
  senderName: { color: '#94A3B8', fontSize: 10, fontWeight: '600', marginBottom: 2 },
  chatText: { color: '#F8FAFC', fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chatInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 13,
  },
  sendBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    width: 64,
  },
  actionBtnActive: { backgroundColor: '#334155' },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 4 },
  endCallBtn: {
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
  },
  endCallIcon: { fontSize: 18 },
  endCallText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
