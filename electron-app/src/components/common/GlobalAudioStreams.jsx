import React, { useRef, useEffect, useCallback } from 'react';
import { useWebRTC } from '../../context/WebRTCContext';

const AudioStream = ({ stream, isMuted, userId, setAudioRef }) => {
    const audioRef = useRef(null);

    const refCallback = useCallback(node => {
        audioRef.current = node;
        setAudioRef(userId, node); // node will be null on unmount
    }, [userId, setAudioRef]);

    useEffect(() => {
        if (audioRef.current && audioRef.current.srcObject !== stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    const audioProps = {
        ref: refCallback,
        autoPlay: true,
        playsInline: true,
    };

    if (isMuted) {
        audioProps.muted = true;
    }

    return <audio {...audioProps} />;
};

const GlobalAudioStreams = ({ participants, isGlobalMuted }) => {
    const { setAudioRef } = useWebRTC();
    const streams = Object.entries(participants || {});

    return (
        <div className="global-audio-streams" style={{ display: 'none' }}>
            {streams.map(([userId, participantInfo]) => {
                if (!participantInfo || !participantInfo.stream) {
                    return null;
                }
                const isEffectivelyMuted = isGlobalMuted || participantInfo.isMuted;

                return (
                    <AudioStream
                        key={userId}
                        userId={userId}
                        stream={participantInfo.stream}
                        isMuted={isEffectivelyMuted}
                        setAudioRef={setAudioRef}
                    />
                );
            })}
        </div>
    );
};

export default GlobalAudioStreams;