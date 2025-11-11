import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioSettings } from '../context/AudioSettingsContext';
import { NoiseSuppressorWorklet_Name } from "@timephy/rnnoise-wasm";
import NoiseSuppressorWorklet from "@timephy/rnnoise-wasm/NoiseSuppressorWorklet?worker&url";

export const useAudioProcessor = () => {
    const { micVolume } = useAudioSettings();
    const [processedStream, setProcessedStream] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const audioContextRef = useRef(null);
    const rawStreamRef = useRef(null);
    const sourceNodeRef = useRef(null);
    const gainNodeRef = useRef(null);
    const workletNodeRef = useRef(null);
    const destinationNodeRef = useRef(null);

    // Effect to update gain node when micVolume changes
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = micVolume;
        }
    }, [micVolume]);

    const startProcessing = useCallback(async (rawStream) => {
        if (!rawStream || isProcessing) return;

        try {
            rawStreamRef.current = rawStream;

            // 1. Setup AudioContext and RNNoise Worklet (one-time setup)
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                const newAudioContext = new AudioContext();
                await newAudioContext.audioWorklet.addModule(NoiseSuppressorWorklet);
                audioContextRef.current = newAudioContext;
            }
            
            // 2. Create audio processing pipeline
            const source = audioContextRef.current.createMediaStreamSource(rawStream);
            const gainNode = audioContextRef.current.createGain();
            gainNode.gain.value = micVolume; // Set initial volume
            const noiseSuppressionNode = new AudioWorkletNode(audioContextRef.current, NoiseSuppressorWorklet_Name, {
                channelCount: 1,
                channelCountMode: 'explicit',
            });
            const destination = audioContextRef.current.createMediaStreamDestination();
            
            // 3. Connect nodes
            source.connect(gainNode).connect(noiseSuppressionNode).connect(destination);

            // 4. Store nodes and stream for later cleanup
            sourceNodeRef.current = source;
            gainNodeRef.current = gainNode;
            workletNodeRef.current = noiseSuppressionNode;
            destinationNodeRef.current = destination;

            // 5. The 'destination.stream' is the clean, noise-suppressed stream
            setProcessedStream(destination.stream);
            setIsProcessing(true);

            return destination.stream;

        } catch (error) {
            console.error('Error setting up audio processing pipeline:', error);
            // In case of error, clean up any partial setup
            await stopProcessing();
            return null;
        }
    }, [isProcessing, micVolume]); // Added micVolume to dependency array

    const stopProcessing = useCallback(async () => {
        if (!isProcessing && !rawStreamRef.current) return;

        console.log("Stopping audio processing pipeline...");

        // Disconnect nodes
        sourceNodeRef.current?.disconnect();
        gainNodeRef.current?.disconnect();
        workletNodeRef.current?.disconnect();

        // Stop all tracks of the original raw stream to release the microphone
        rawStreamRef.current?.getTracks().forEach(track => track.stop());

        // Stop tracks of the processed stream
        processedStream?.getTracks().forEach(track => track.stop());

        // Close the AudioContext
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
        }

        // Reset refs and state
        rawStreamRef.current = null;
        sourceNodeRef.current = null;
        gainNodeRef.current = null;
        workletNodeRef.current = null;
        destinationNodeRef.current = null;
        audioContextRef.current = null;
        setProcessedStream(null);
        setIsProcessing(false);
    }, [isProcessing, processedStream]);

    return { startProcessing, stopProcessing, processedStream, isProcessing };
};
