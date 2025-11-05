import React, { useRef, useEffect } from 'react';

const AudioStream = ({ stream, isMuted }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.srcObject = stream;
        }
    }, [stream]);

    return <audio ref={audioRef} autoPlay playsInline muted={isMuted} />;
};

const GlobalAudioStreams = ({ remoteStreams, isGlobalMuted }) => {
    // remoteStreams is an object: { userId: { stream, isMuted } }
    // Add a guard clause to handle null or undefined remoteStreams
    const streams = Object.entries(remoteStreams || {});

    return (
        <div className="global-audio-streams" style={{ display: 'none' }}>
            {streams.map(([userId, streamInfo]) => {
                if (!streamInfo || !streamInfo.stream) {
                    return null;
                }
                // streamInfo.isMuted is the individual mute status from the sender
                // isGlobalMuted is the local user's choice to mute all incoming audio
                const isEffectivelyMuted = isGlobalMuted || streamInfo.isMuted;

                return (
                    <AudioStream
                        key={userId}
                        stream={streamInfo.stream}
                        isMuted={isEffectivelyMuted}
                    />
                );
            })}
        </div>
    );
};

export default GlobalAudioStreams;