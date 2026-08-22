/**
 * WebRTC Configuration and Helpers
 */

export const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
            ],
        },
    ],
};

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate';
    payload: any;
    from: string;
}

/**
 * Creates a new RTCPeerConnection with the standard configuration
 */
export const createPeerConnection = (
    onIceCandidate: (candidate: RTCIceCandidate) => void,
    onTrack: (stream: MediaStream) => void
) => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            onIceCandidate(event.candidate);
        }
    };

    pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
            onTrack(event.streams[0]);
        }
    };

    return pc;
};
