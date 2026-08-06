'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelay',
      credential: 'openrelay',
    },
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10,
};

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const rawRoomId = (params?.roomId as string) || 'demo';
  const roomId = rawRoomId.split('?')[0];
  const [isDoctorRole, setIsDoctorRole] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.replace(/^\?+/, '?');
      return new URLSearchParams(search).get('role') === 'doctor' || window.location.href.includes('role=doctor');
    }
    return false;
  });
  const isOfferer = !isDoctorRole; // Patient is ALWAYS Offerer, Doctor is ALWAYS Answerer

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function verifyUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          const isDoc = prof?.role === 'doctor' || user.user_metadata?.role === 'doctor' || user.email?.toLowerCase().includes('doctor') || user.email?.toLowerCase().includes('dr.');
          if (isDoc) {
            setIsDoctorRole(true);
          }
        }
      } catch (e) {
        console.warn("Error verifying user role in call:", e);
      }
    }
    verifyUserRole();
  }, [supabase]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const myPeerIdRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2)
  );
  const recognitionRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<{ text: string; timestamp: string }[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);
  const [remoteUserName, setRemoteUserName] = useState<string>(isDoctorRole ? 'Patient' : 'Doctor');

  useEffect(() => {
    async function fetchRemoteUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const currentUserId = user?.id;

        const { data: appt } = await supabase
          .from('appointments')
          .select('client_id, doctor_id')
          .eq('room_id', roomId)
          .single();

        if (appt) {
          let targetId = isDoctorRole ? appt.client_id : appt.doctor_id;
          if (targetId === currentUserId) {
            targetId = isDoctorRole ? appt.doctor_id : appt.client_id;
          }

          if (targetId && targetId !== currentUserId) {
            const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', targetId).single();
            if (prof?.name) {
              setRemoteUserName(prof.name);
            } else if (prof?.email) {
              setRemoteUserName(prof.email.split('@')[0]);
            } else {
              setRemoteUserName(isDoctorRole ? 'Patient' : 'Doctor');
            }
          } else {
            setRemoteUserName(isDoctorRole ? 'Patient' : 'Doctor');
          }
        } else {
          setRemoteUserName(isDoctorRole ? 'Patient' : 'Doctor');
        }
      } catch (err) {
        console.warn('Could not fetch remote user details:', err);
      }
    }
    fetchRemoteUser();
  }, [roomId, isDoctorRole, supabase]);

  // Timer for call duration
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Sync video element srcObjects whenever callStatus changes or DOM mounts
  useEffect(() => {
    if (localStreamRef.current && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    if (remoteStreamRef.current && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
        console.log('[WebRTC Sync] Attaching remoteStreamRef to remoteVideoRef element');
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
      remoteVideoRef.current
        .play()
        .then(() => console.log('[WebRTC Sync] Remote video playback active'))
        .catch((err) => console.warn('[WebRTC Sync] Remote video play deferred/waiting:', err));
    }
  }, [callStatus]);

  // Auto-redirect http to https for Ngrok and remote tunnels (browsers require HTTPS for camera)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname.includes('ngrok')) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
    if (typeof window !== 'undefined' && (!navigator.mediaDevices || !window.isSecureContext)) {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setIsInsecureContext(true);
      }
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) { }
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  const startTranscription = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalText.trim()) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setTranscriptHistory(prev => [...prev, { text: finalText.trim(), timestamp }]);
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsTranscribing(false);
        return;
      }
      // Auto-restart on transient errors
      if (event.error !== 'aborted') {
        setTimeout(() => {
          try { recognition.start(); } catch (_) { }
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still transcribing
      if (recognitionRef.current) {
        try { recognition.start(); } catch (_) { }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
  }, []);

  const cleanup = useCallback(() => {
    stopTranscription();
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    pendingCandidatesRef.current = [];
  }, [supabase, stopTranscription]);

  // Helper to drain ICE candidates after setRemoteDescription succeeds
  const drainPendingIceCandidates = async (pc: RTCPeerConnection) => {
    if (pendingCandidatesRef.current.length > 0) {
      console.log(`[WebRTC] Draining ${pendingCandidatesRef.current.length} pending ICE candidate(s)...`);
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] ICE: Connected candidate added from queue');
        } catch (err) {
          console.warn('[WebRTC] Failed to add queued ICE candidate:', err);
        }
      }
      pendingCandidatesRef.current = [];
    }
  };

  const createOffer = async (
    pc: RTCPeerConnection,
    channel: ReturnType<typeof supabase.channel>
  ) => {
    // Guard createOffer with: if (pc.signalingState !== "stable") return;
    if (pc.signalingState !== 'stable') {
      console.log(`[WebRTC] createOffer skipped because signalingState is ${pc.signalingState}`);
      return;
    }
    try {
      console.log('[WebRTC] Patient: Creating Offer...');
      const offer = await pc.createOffer();
      if (pc.signalingState !== 'stable') return;

      console.log('[WebRTC] Setting local description for Offer...');
      await pc.setLocalDescription(offer);

      console.log('[Signaling] Patient: Sending Offer SDP');
      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { senderId: myPeerIdRef.current, sdp: pc.localDescription },
      });
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
    }
  };

  const startCall = async () => {
    setError(null);
    try {
      if (typeof window !== 'undefined' && !navigator.mediaDevices) {
        throw new Error('Camera/Microphone access is blocked by your browser. Make sure you are using HTTPS (https://).');
      }

      console.log(`[WebRTC Initialization] Role: ${isOfferer ? 'Patient (Offerer)' : 'Doctor (Answerer)'}`);

      // 1. Get local media
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (mediaErr: any) {
        console.warn('getUserMedia audio+video failed, trying audio only', mediaErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (_) {
          throw new Error('Could not access Camera/Microphone. Please allow permissions in your browser bar.');
        }
      }

      localStreamRef.current = stream;
      
      // Initialize single persistent remote MediaStream
      remoteStreamRef.current = new MediaStream();

      // Set status to connecting (will switch to connected when RTCPeerConnection connects)
      setCallStatus('connecting');

      // 2. Create PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Connection State monitoring
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state changed: ${pc.connectionState}`);
        console.log(`[WebRTC] ICE Connection state: ${pc.iceConnectionState}`);
        console.log(`[WebRTC] Signaling state: ${pc.signalingState}`);

        if (pc.connectionState === 'connected') {
          console.log('[WebRTC] Connection: Connected!');
          setCallStatus('connected');
        } else if (pc.connectionState === 'failed') {
          console.warn('[WebRTC] Connection failed. Attempting automatic ICE restart...');
          try {
            if (pc.restartIce) pc.restartIce();
          } catch (e) {
            console.warn('ICE restart error:', e);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE State changed: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('[WebRTC] ICE: Connected');
          setCallStatus('connected');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.warn('[WebRTC] ICE state failed/disconnected. Attempting candidate re-gathering...');
          try {
            if (pc.restartIce) pc.restartIce();
          } catch (e) {
            console.warn('ICE restart error:', e);
          }
        }
      };

      pc.onsignalingstatechange = () => {
        console.log(`[WebRTC] Signaling State: ${pc.signalingState}`);
      };

      // Add local tracks
      if (stream) {
        stream.getTracks().forEach((track) => {
          console.log(`[WebRTC] Adding local track: ${track.kind} (id: ${track.id})`);
          console.log(`Sending: ${track.kind}`);
          pc.addTrack(track, stream!);
        });
      }

      // Handle remote tracks on persistent remote MediaStream
      pc.ontrack = (event) => {
        console.log('========== REMOTE TRACK ==========');
        console.log('[WebRTC] Remote track received:', event.track.kind, 'id:', event.track.id);
        console.log('[WebRTC] Streams:', event.streams);
        console.log('[WebRTC] Track object:', event.track);

        if (remoteStreamRef.current) {
          const trackExists = remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id);
          if (!trackExists) {
            remoteStreamRef.current.addTrack(event.track);
            console.log('[WebRTC] Track added to persistent remoteStreamRef');
          }
        }

        if (remoteVideoRef.current && remoteStreamRef.current) {
          if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
          }
          remoteVideoRef.current
            .play()
            .then(() => console.log('[WebRTC] Remote video playback started'))
            .catch((err) => console.error('[WebRTC] Error calling remoteVideo.play():', err));
        }
      };

      // 3. Setup Supabase Realtime signaling channel
      try {
        const channel = supabase.channel(`call-${roomId}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            console.log('[WebRTC] Outgoing ICE Candidate:', event.candidate.candidate);
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { senderId: myPeerIdRef.current, candidate: event.candidate.toJSON() },
            });
          }
        };

        // Broadcast: Peer Join
        channel.on('broadcast', { event: 'join' }, async ({ payload }) => {
          if (payload?.senderId === myPeerIdRef.current) return;
          console.log(`[Signaling] Peer joined (${payload?.senderId}). My Role: ${isOfferer ? 'Patient (Offerer)' : 'Doctor (Answerer)'}`);
          
          // Patient re-sends or creates offer when Doctor joins
          if (isOfferer && peerConnectionRef.current) {
            const pc = peerConnectionRef.current;
            if (pc.localDescription) {
              console.log('[Signaling] Doctor joined! Patient re-broadcasting existing local Offer SDP to Doctor...');
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { senderId: myPeerIdRef.current, sdp: pc.localDescription },
              });
            } else if (pc.signalingState === 'stable') {
              console.log('[Signaling] Doctor joined! Patient creating Offer SDP...');
              await createOffer(pc, channel);
            }
          }
        });

        // Broadcast: Offer (Doctor handles this)
        channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (payload?.senderId === myPeerIdRef.current) return;
          console.log('[Signaling] Doctor: Offer Received from Patient!');
          if (!peerConnectionRef.current) return;

          const pc = peerConnectionRef.current;
          if (pc.signalingState !== 'stable') {
            console.warn(`[Signaling] Doctor: Offer received while signalingState is ${pc.signalingState}, skipping.`);
            return;
          }

          try {
            console.log('[WebRTC] Doctor: Applying Remote Offer SDP...');
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            console.log('[WebRTC] Doctor: Remote Description Applied. SignalingState:', pc.signalingState);

            if ((pc.signalingState as string) !== 'have-remote-offer') {
              console.warn(`[WebRTC] Doctor: Expected signalingState 'have-remote-offer', got '${pc.signalingState}'. Skipping answer.`);
              return;
            }

            console.log('[WebRTC] Doctor: Creating Answer...');
            const answer = await pc.createAnswer();
            
            if ((pc.signalingState as string) !== 'have-remote-offer') {
              console.warn(`[WebRTC] Doctor: Cannot setLocalDescription because signalingState changed to '${pc.signalingState}'.`);
              return;
            }

            console.log('[WebRTC] Doctor: Setting Local Description for Answer...');
            await pc.setLocalDescription(answer);
            console.log('[WebRTC] Doctor: Local Answer Description Set. SignalingState:', pc.signalingState);

            await drainPendingIceCandidates(pc);

            console.log('[Signaling] Doctor: Sending Answer SDP');
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { senderId: myPeerIdRef.current, sdp: answer },
            });
          } catch (err) {
            console.warn('[Signaling] Doctor: Handled offer error:', err);
          }
        });

        // Broadcast: Answer (Patient handles this)
        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload?.senderId === myPeerIdRef.current) return;
          console.log('[Signaling] Patient: Answer Received from Doctor!');
          if (!peerConnectionRef.current) return;

          const pc = peerConnectionRef.current;
          if (pc.signalingState !== 'have-local-offer') {
            console.warn(`[Signaling] Patient: Ignored answer because signalingState is ${pc.signalingState} (expected have-local-offer)`);
            return;
          }

          try {
            console.log('[WebRTC] Patient: Applying Remote Answer SDP...');
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            console.log('[WebRTC] Patient: Remote Answer Applied. SignalingState:', pc.signalingState);

            await drainPendingIceCandidates(pc);
          } catch (err) {
            console.error('[Signaling] Patient: Failed to handle remote answer:', err);
          }
        });

        // Broadcast: ICE Candidate
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload?.senderId === myPeerIdRef.current) return;
          console.log('[Signaling] Received Incoming ICE Candidate:', payload.candidate?.candidate);
          if (!peerConnectionRef.current) return;

          const pc = peerConnectionRef.current;
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
              console.log('[WebRTC] ICE: Connected candidate added');
            } catch (err) {
              console.warn('[WebRTC] Failed to add ICE candidate:', err);
            }
          } else {
            console.log('[WebRTC] Candidate received before remoteDescription set. Storing in pending queue.');
            pendingCandidatesRef.current.push(payload.candidate);
          }
        });

        // Broadcast: Call Ended
        channel.on('broadcast', { event: 'call-ended' }, () => {
          console.log('[Signaling] Call ended signal received from peer.');
          setCallStatus('ended');
          cleanup();
        });

        // Gate signaling on RealtimeStatus === 'SUBSCRIBED'
        console.log(`[Signaling] Subscribing to Supabase channel topic: ${channel.topic}`);
        channel.subscribe((status, err) => {
          console.log(`[Signaling] RealtimeStatus for ${channel.topic}: ${status}`);
          if (err) {
            console.warn('[Signaling] Realtime subscription error:', err);
          }

          if (status === 'SUBSCRIBED') {
            console.log(`[Signaling] Channel ${channel.topic} fully SUBSCRIBED.`);

            // Broadcast join once fully subscribed
            console.log(`[Signaling] Broadcasting "join" as ${isOfferer ? 'Patient' : 'Doctor'} to channel ${channel.topic}`);
            channel.send({
              type: 'broadcast',
              event: 'join',
              payload: { senderId: myPeerIdRef.current, ts: Date.now() },
            });

            // Deterministic Offer triggering: ONLY Patient creates/sends offer when SUBSCRIBED
            if (isOfferer) {
              setTimeout(async () => {
                if (peerConnectionRef.current) {
                  const pc = peerConnectionRef.current;
                  if (pc.localDescription) {
                    console.log('[Signaling] Patient re-sending existing Offer SDP upon subscription...');
                    channel.send({
                      type: 'broadcast',
                      event: 'offer',
                      payload: { senderId: myPeerIdRef.current, sdp: pc.localDescription },
                    });
                  } else if (pc.signalingState === 'stable') {
                    console.log('[Signaling] Patient creating initial Offer after subscription...');
                    await createOffer(pc, channel);
                  }
                }
              }, 400);
            } else {
              console.log('[Signaling] Doctor fully SUBSCRIBED, waiting for Patient Offer...');
            }
          }
        });

      } catch (signalingErr) {
        console.warn('Realtime channel signaling setup warning:', signalingErr);
      }

    } catch (err: any) {
      console.error('Call error:', err);
      setError(err.message || 'Failed to start call. Please check camera/microphone permissions.');
      setCallStatus('idle');
    }
  };


  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted((prev) => !prev);
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoOff((prev) => !prev);
  };

  const endCall = () => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }
    setCallStatus('ended');
    cleanup();
  };

  const leaveRoom = () => {
    cleanup();
    if (isDoctorRole) {
      router.push('/doctor');
    } else {
      router.push('/telemedicine');
    }
  };

  const downloadTranscript = () => {
    if (transcriptHistory.length === 0) return;

    const content = transcriptHistory
      .map(entry => `[${entry.timestamp}] ${entry.text}`)
      .join('\n');

    const blob = new Blob([`CuraTrack Consultation Transcript\nRoom: ${roomId}\nDate: ${new Date().toLocaleDateString()}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${roomId.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-secondary/15 rounded-full blur-[120px]" />
      </div>

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-8 z-20">
        <div className="flex items-center gap-4">
          <button onClick={leaveRoom} className="p-2 rounded-xl text-white/40 hover:text-primary hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-white font-headline font-bold text-xl tracking-tight">
            Consult Room · {remoteUserName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 shadow-sm rounded-full">
              <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <span className="text-white text-sm font-mono font-bold tracking-tight">{formatTime(elapsedTime)}</span>
            </div>
          )}
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-primary text-sm font-bold">Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div className="relative z-10 w-full max-w-5xl flex-1 flex items-center justify-center py-20">
        {callStatus === 'idle' ? (
          /* Pre-call screen */
          <div className="text-center space-y-10 max-w-lg w-full">
            <div className="w-32 h-32 mx-auto rounded-[2.5rem] primary-gradient flex items-center justify-center shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>video_camera_front</span>
            </div>
            <div>
              <h2 className="text-white text-4xl font-headline font-extrabold tracking-tight mb-4">Start Consultation</h2>
              <p className="text-white/60 max-w-md mx-auto leading-relaxed">Prepare for your secure session. Camera and microphone permissions are required.</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl text-xs font-bold text-white/40">
                <span className="material-symbols-outlined text-sm">vpn_key</span>
                Room ID: {roomId.slice(0, 8)}
              </div>
            </div>
            {isInsecureContext && (
              <div className="bg-amber-950/40 border border-amber-500/30 p-6 rounded-3xl text-left max-w-md mx-auto mb-6">
                <div className="flex items-center gap-2 text-amber-200 font-bold mb-2">
                  <span className="material-symbols-outlined">security</span>
                  <h4>Browser Security Block</h4>
                </div>
                <p className="text-amber-200/70 text-xs leading-relaxed mb-4">
                  Browsers disable camera/mic access on local IPs (e.g., 10.151.93.61) unless over HTTPS. To test this on your network:
                </p>
                <ol className="text-[11px] space-y-2 text-amber-200/80 list-decimal pl-4">
                  <li>Go to <code className="bg-white/10 px-1 rounded text-amber-100">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                  <li>Enable the flag and add <code className="bg-white/10 px-1 rounded text-amber-100">http://{window.location.host}</code> to the list.</li>
                  <li>Relaunch Chrome and refresh this page.</li>
                </ol>
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-950/60 border border-red-500/40 text-red-200 rounded-2xl text-xs font-bold max-w-md mx-auto text-center shadow-lg">
                ⚠️ {error}
              </div>
            )}
            <button
              onClick={startCall}
              className="px-12 py-5 primary-gradient text-white text-lg font-bold rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4 mx-auto"
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
              Join Secure Call
            </button>
          </div>
        ) : callStatus === 'ended' ? (
          /* Post-call screen */
          <div className="text-center space-y-8 max-w-lg w-full">
            <div className="w-24 h-24 mx-auto rounded-[2rem] bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            </div>
            <div>
              <h2 className="text-white text-3xl font-headline font-bold mb-3">Call Completed</h2>
              <p className="text-white/60 leading-relaxed">Your consultation has ended securely. Duration: <span className="text-primary font-bold">{formatTime(elapsedTime)}</span></p>
            </div>

            {/* Full Transcript */}
            {transcriptHistory.length > 0 && (
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 text-left max-h-60 overflow-y-auto shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">subtitles</span>
                    <h3 className="text-sm font-bold text-white">Call Transcript</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadTranscript}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-primary transition-colors"
                      title="Download as Text"
                    >
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-primary transition-colors"
                      title="Export as PDF"
                    >
                      <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                    </button>
                  </div>
                </div>
                <div className="space-y-2" id="printable-transcript">
                  {transcriptHistory.map((entry, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <span className="text-[10px] font-mono text-white/40 whitespace-nowrap pt-0.5">{entry.timestamp}</span>
                      <p className="text-white/80 leading-relaxed">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={leaveRoom}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all shadow-sm"
            >
              {isDoctorRole ? 'Return to Doctor Portal' : 'Return to Telemedicine'}
            </button>
          </div>
        ) : (
          /* Active call — video feeds */
          <>
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh]">
              {/* Remote video (large) */}
              <div className="relative bg-[#1a1d27] rounded-3xl overflow-hidden aspect-video flex items-center justify-center">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {callStatus === 'connecting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1d27]">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-white/50 text-sm">Waiting for other participant...</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 backdrop-blur rounded-lg">
                  <span className="text-white/80 text-xs font-bold">{remoteUserName}</span>
                </div>
              </div>

              {/* Local video (small) */}
              <div className="relative bg-[#1a1d27] rounded-3xl overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'invisible' : ''}`}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1d27]">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white/40 text-2xl">videocam_off</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/50 backdrop-blur rounded-lg">
                  <span className="text-white/80 text-xs font-bold">You</span>
                </div>
              </div>
            </div>

            {/* Transcript overlay */}
            {showCaptions && (currentTranscript || transcriptHistory.length > 0) && (
              <div className="w-full max-w-5xl mt-4">
                <div
                  ref={transcriptContainerRef}
                  className="bg-black/70 backdrop-blur-md rounded-2xl px-6 py-4 max-h-32 overflow-y-auto"
                >
                  {transcriptHistory.slice(-3).map((entry, idx) => (
                    <p key={idx} className="text-white/70 text-sm leading-relaxed">{entry.text}</p>
                  ))}
                  {currentTranscript && (
                    <p className="text-white text-sm leading-relaxed italic">{currentTranscript}...</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom control bar */}
      {(callStatus === 'connecting' || callStatus === 'connected') && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 p-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            <span className="material-symbols-outlined">{isMuted ? 'mic_off' : 'mic'}</span>
          </button>
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
          >
            <span className="material-symbols-outlined">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
          </button>
          <button
            onClick={() => {
              if (showCaptions) {
                setShowCaptions(false);
                stopTranscription();
              } else {
                setShowCaptions(true);
                startTranscription();
              }
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${showCaptions ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            title="Toggle Captions"
          >
            <span className="material-symbols-outlined">{showCaptions ? 'subtitles' : 'subtitles_off'}</span>
          </button>
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all hover:scale-110"
          >
            <span className="material-symbols-outlined">call_end</span>
          </button>
        </div>
      )}
    </div>
  );
}
