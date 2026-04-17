'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended';

export default function CallPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const supabase = useMemo(() => createClient(), []);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasJoinedRef = useRef(false);

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Timer for call duration
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

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

  const cleanup = useCallback(() => {
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
  }, [supabase]);

  const startCall = async () => {
    try {
      setCallStatus('connecting');
      setError(null);

      // 1. Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Create PeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallStatus('connected');
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallStatus('connected');
        }
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setCallStatus('ended');
        }
      };

      // 3. Setup Supabase Realtime signaling channel
      const channel = supabase.channel(`call-${roomId}`, {
        config: { broadcast: { self: false } },
      });
      channelRef.current = channel;

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate.toJSON() },
          });
        }
      };

      channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (!peerConnectionRef.current) return;
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Flush any pending ICE candidates
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { sdp: answer },
        });
      });

      channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (!peerConnectionRef.current) return;
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.sdp)
        );
        // Flush any pending ICE candidates
        for (const c of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];
      });

      channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (!peerConnectionRef.current) return;
        const pc = peerConnectionRef.current;
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
      });

      channel.on('broadcast', { event: 'call-ended' }, () => {
        setCallStatus('ended');
        cleanup();
      });

      await channel.subscribe();

      // 4. Small delay then check presence — first joiner creates offer  
      //    We use a broadcast "join" event to negotiate who makes the offer.
      //    The second person to join sees the first person's join and waits for the offer.
      channel.send({
        type: 'broadcast',
        event: 'join',
        payload: { ts: Date.now() },
      });

      channel.on('broadcast', { event: 'join' }, async () => {
        // When we see someone else join, we (re)create an offer if we haven't already
        if (hasJoinedRef.current) return;
        hasJoinedRef.current = true;
        await createOffer(pc, channel);
      });

      // If no one else is in the room yet, wait. Once someone joins they'll 
      // trigger the 'join' event and we'll make the offer.
      // But also, after a short delay, try creating an offer anyway (in case
      // the other person joined before us).
      setTimeout(async () => {
        if (!hasJoinedRef.current && peerConnectionRef.current) {
          hasJoinedRef.current = true;
          await createOffer(pc, channel);
        }
      }, 2000);

    } catch (err: any) {
      console.error('Call error:', err);
      setError(err.message || 'Failed to start call. Please allow camera/microphone access.');
      setCallStatus('idle');
    }
  };

  const createOffer = async (
    pc: RTCPeerConnection,
    channel: ReturnType<typeof supabase.channel>
  ) => {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: { sdp: offer },
    });
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
    router.push('/telemedicine');
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      {/* Header bar */}
      <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <button onClick={leaveRoom} className="text-white/60 hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-white font-headline font-bold text-lg">CuraTrack Consult</h1>
        </div>
        <div className="flex items-center gap-3">
          {callStatus === 'connected' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-white/80 text-sm font-mono font-bold">{formatTime(elapsedTime)}</span>
            </div>
          )}
          {callStatus === 'connecting' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-amber-300 text-sm font-bold">Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Video grid */}
      <div className="relative z-10 w-full max-w-5xl flex-1 flex items-center justify-center py-20">
        {callStatus === 'idle' ? (
          /* Pre-call screen */
          <div className="text-center space-y-8">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>video_camera_front</span>
            </div>
            <div>
              <h2 className="text-white text-3xl font-headline font-bold mb-2">Ready to join?</h2>
              <p className="text-white/50 max-w-md mx-auto">Room: <span className="font-mono text-white/70">{roomId.slice(0, 8)}...</span></p>
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-6 py-3 rounded-2xl text-sm max-w-md mx-auto">
                {error}
              </div>
            )}
            <button
              onClick={startCall}
              className="px-10 py-4 bg-gradient-to-r from-primary to-[#2c7d99] text-white text-lg font-bold rounded-2xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto"
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
              Start Meeting
            </button>
          </div>
        ) : callStatus === 'ended' ? (
          /* Post-call screen */
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/60 text-3xl">call_end</span>
            </div>
            <h2 className="text-white text-2xl font-headline font-bold">Call Ended</h2>
            <p className="text-white/50">Duration: {formatTime(elapsedTime)}</p>
            <button
              onClick={leaveRoom}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all"
            >
              Return to Telemedicine
            </button>
          </div>
        ) : (
          /* Active call — video feeds */
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
                <span className="text-white/80 text-xs font-bold">Remote</span>
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
        )}
      </div>

      {/* Bottom control bar */}
      {(callStatus === 'connecting' || callStatus === 'connected') && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 p-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/10">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="material-symbols-outlined">{isMuted ? 'mic_off' : 'mic'}</span>
          </button>
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="material-symbols-outlined">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
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
