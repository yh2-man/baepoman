import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioMixer = () => {
    const audioContextRef = useRef(null);
    const destinationNodeRef = useRef(null);
    const sourceNodesRef = useRef(new Map()); // Map<MediaStreamTrack, MediaStreamAudioSourceNode>
    const [mixedStream, setMixedStream] = useState(null);

    // Initialize the audio context and destination stream
    const initialize = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const context = new AudioContext();
            const destination = context.createMediaStreamDestination();
            
            audioContextRef.current = context;
            destinationNodeRef.current = destination;
            setMixedStream(destination.stream);
        }
    }, []);

    // Initialize on first mount to ensure the context and stream are ready
    useEffect(() => {
        initialize();
    }, [initialize]);

    const addTrackToMixer = useCallback((track) => {
        initialize(); // Ensure context is ready (harmless to call again)
        if (audioContextRef.current && track && !sourceNodesRef.current.has(track)) {
            const stream = new MediaStream([track]);
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(destinationNodeRef.current);
            sourceNodesRef.current.set(track, source);
        }
    }, [initialize]);

    const removeTrackFromMixer = useCallback((track) => {
        if (sourceNodesRef.current.has(track)) {
            const sourceNode = sourceNodesRef.current.get(track);
            sourceNode.disconnect();
            sourceNodesRef.current.delete(track);
        }
    }, []);

    const cleanup = useCallback(() => {
        if (audioContextRef.current) {
            sourceNodesRef.current.forEach(node => node.disconnect());
            sourceNodesRef.current.clear();
            audioContextRef.current.close().catch(() => {}); // Ignore errors on close
            audioContextRef.current = null;
            destinationNodeRef.current = null;
            setMixedStream(null);
        }
    }, []);

    return { mixedStream, addTrackToMixer, removeTrackFromMixer, cleanup };
};