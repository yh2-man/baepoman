import { useState, useEffect, useRef } from 'react';

const useVoiceActivity = ({ stream, threshold = 20, interval = 100 }) => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const animationFrameRef = useRef();
    const isSpeakingRef = useRef(false);
    const speakingTimeoutRef = useRef(null); // Ref for the turn-off delay timer

    useEffect(() => {
        if (!stream || !stream.getAudioTracks().length || stream.getAudioTracks().every(t => !t.enabled)) {
            if (isSpeakingRef.current) {
                isSpeakingRef.current = false;
                setIsSpeaking(false);
            }
            return;
        }

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.1;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastCheck = Date.now();

        const checkVolume = () => {
            const now = Date.now();
            if (now - lastCheck > interval) {
                lastCheck = now;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

                if (average > threshold) {
                    // --- User is speaking ---
                    clearTimeout(speakingTimeoutRef.current);
                    speakingTimeoutRef.current = null;
                    if (!isSpeakingRef.current) {
                        isSpeakingRef.current = true;
                        setIsSpeaking(true);
                    }
                } else {
                    // --- User is not speaking ---
                    if (isSpeakingRef.current && !speakingTimeoutRef.current) {
                        speakingTimeoutRef.current = setTimeout(() => {
                            isSpeakingRef.current = false;
                            setIsSpeaking(false);
                            speakingTimeoutRef.current = null;
                        }, 100); // 100ms delay before turning off
                    }
                }
            }
            animationFrameRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            clearTimeout(speakingTimeoutRef.current); // Clear timeout on cleanup
            source.disconnect();
        };
    }, [stream, threshold, interval]);

    return isSpeaking;
};

export default useVoiceActivity;
