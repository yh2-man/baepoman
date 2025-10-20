import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../../context/WebRTCContext';
import { useAuth } from '../../context/AuthContext'; // To get user.id for local stream alt
import './GlobalAudioStreams.css';

const GlobalAudioStreams = () => {
    const { user } = useAuth();
    const { localStream, remoteStreams } = useWebRTC();
    const localAudioRef = useRef(null);

    // Effect to attach local stream to the local audio element
    useEffect(() => {
        if (localAudioRef.current && localStream) {
            localAudioRef.current.srcObject = localStream;
        }
    }, [localStream]);

    return (
        <div className="global-audio-streams-container">
            {/* Local User's Audio (muted to prevent self-echo) */}
            <audio ref={localAudioRef} autoPlay muted playsInline />

            {/* Remote Participants' Audio */}
            {Object.entries(remoteStreams).map(([userId, stream]) => (
                <RemoteAudioPlayer key={userId} userId={userId} stream={stream} />
            ))}
        </div>
    );
};

// Helper component for remote audio players
const RemoteAudioPlayer = ({ userId, stream }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline />;
};

export default GlobalAudioStreams;
