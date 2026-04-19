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
  const recognitionRef = useRef<any>(null);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [transcriptHistory, setTranscriptHistory] = useState<{text: string; timestamp: string}[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isInsecureContext, setIsInsecureContext] = useState(false);

  // Timer for call duration
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => setElapsedTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Check for secure context and mediaDevices support
  useEffect(() => {
    if (!navigator.mediaDevices || !window.isSecureContext) {
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
      try { recognitionRef.current.stop(); } catch (_) {}
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
          try { recognition.start(); } catch (_) {}
        }, 1000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still transcribing
      if (recognitionRef.current) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
  }, []);

  const cleanup = useCallback(() => {
    stopTranscription();
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
  }, [supabase, stopTranscription]);

  const startCall = async () => {
    try {
      if (!navigator.mediaDevices) {
        throw new Error('Camera/Microphone access is blocked by your browser (Insecure Context). Please use HTTPS or follow the Chrome Flag instructions.');
      }
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
          <h1 className="text-white font-headline font-bold text-xl tracking-tight">Consult Room</h1>
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
            <button
              onClick={startCall}
              disabled={isInsecureContext && !navigator.mediaDevices}
              className="px-12 py-5 primary-gradient text-white text-lg font-bold rounded-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4 mx-auto disabled:opacity-50 disabled:grayscale"
            >
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
              {isInsecureContext && !navigator.mediaDevices ? 'Access Blocked' : 'Join Secure Call'}
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
              Return to Telemedicine
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
            onClick={() => {
              if (showCaptions) {
                setShowCaptions(false);
                stopTranscription();
              } else {
                setShowCaptions(true);
                startTranscription();
              }
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              showCaptions ? 'bg-primary text-white' : 'bg-white/10 text-white hover:bg-white/20'
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
