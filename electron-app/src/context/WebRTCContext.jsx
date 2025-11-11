import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAudioProcessor } from '../hooks/useAudioProcessor';
import { useWebRTCManager } from '../hooks/useWebRTCManager';
import PropTypes from 'prop-types';

const WebRTCContext = createContext(null);

export function useWebRTC() {
    return useContext(WebRTCContext);
}

export function WebRTCProvider({ children }) {
    const { user, sendMessage, addMessageListener, removeMessageListener, currentRoom, setCurrentRoom } = useAuth();
    const { startProcessing, stopProcessing, processedStream: localStream } = useAudioProcessor();
    const [activeRoomId, setActiveRoomId] = useState(null);
    const [isGlobalMuted, setIsGlobalMuted] = useState(false); // New state for global mute
    const [isMicActive, setIsMicActive] = useState(false);

    const { remoteStreams, cleanupConnections, setLocalAudioMuted } = useWebRTCManager({
        user,
        currentRoom,
        localStream,
        sendMessage,
        addMessageListener,
        removeMessageListener,
        setCurrentRoom,
    });

    const activateLocalStream = useCallback(async () => {
        if (localStream) return; // Already active
        try {
            const rawMicStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            await startProcessing(rawMicStream);
            setIsMicActive(true);
        } catch (error) {
            console.error('Error activating local stream:', error);
        }
    }, [localStream, startProcessing]);

    const leaveRoom = useCallback(async () => {
        if (!activeRoomId || !user) return;

        sendMessage({ type: 'leave-room', payload: { roomId: activeRoomId, userId: user.id } });
        
        cleanupConnections();
        await stopProcessing();
        setIsMicActive(false);

        setActiveRoomId(null);
        setCurrentRoom(null);
        setIsGlobalMuted(false); // Reset global mute on leaving room
    }, [activeRoomId, user, sendMessage, cleanupConnections, stopProcessing, setCurrentRoom]);

    const joinRoom = useCallback(async (newRoomId) => {
        if (!user) return;

        // If trying to join the same room we're already in, do nothing.
        if (activeRoomId === newRoomId) {
            return;
        }

        // If switching to a different room, leave the current one first.
        if (activeRoomId && activeRoomId !== newRoomId) {
            await leaveRoom();
        }

        try {
            await activateLocalStream();
            setActiveRoomId(newRoomId);
            sendMessage({ type: 'join-room', payload: { roomId: newRoomId, userId: user.id } });
        } catch (error) {
            console.error('Error joining room:', error);
        }
    }, [user, activeRoomId, leaveRoom, activateLocalStream, sendMessage]);

    const value = {
        joinRoom,
        leaveRoom,
        localStream,
        remoteStreams,
        setLocalAudioMuted,
        isGlobalMuted,
        setIsGlobalMuted,
        activateLocalStream,
        isMicActive,
    };

    return (
        <WebRTCContext.Provider value={value}>
            {children}
        </WebRTCContext.Provider>
    );
}

WebRTCProvider.propTypes = {
    children: PropTypes.node.isRequired,
};