import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Connection } from '../core/Connection.js';
import { useAudioProcessor } from '../hooks/useAudioProcessor'; // Import the new hook
import PropTypes from 'prop-types';

const WebRTCContext = createContext(null);

export function useWebRTC() {
    return useContext(WebRTCContext);
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function WebRTCProvider({ children }) {
    const { user, sendMessage, addMessageListener, removeMessageListener, setCurrentRoom } = useAuth();
    const { startProcessing, stopProcessing, processedStream } = useAudioProcessor(); // Use the hook

    // localStream is now the processedStream from our hook
    const localStream = processedStream;
    
    const [remoteStreams, setRemoteStreams] = useState({});
    const peerConnections = useRef({});
    const [isHost, setIsHost] = useState(false);
    const [roomId, setRoomId] = useState(null);

    const isHostRef = useRef(isHost);
    const localStreamRef = useRef(localStream);

    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

    const addRemoteStream = useCallback((userId, stream) => {
        setRemoteStreams(prev => ({ ...prev, [userId]: stream }));
    }, []);

    const removeRemoteStream = useCallback((userId) => {
        setRemoteStreams(prev => {
            const { [userId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    const cleanupConnection = useCallback((userId) => {
        if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
        }
        removeRemoteStream(userId);
    }, [removeRemoteStream]);

    const handleNewPeer = useCallback((payload) => {
        const remoteUserId = payload.user.id;
        if (remoteUserId === user.id || !isHostRef.current || !localStreamRef.current) return;

        if (peerConnections.current[remoteUserId]) return;
        
        const conn = new Connection(user.id, remoteUserId, sendMessage, ICE_SERVERS);
        peerConnections.current[remoteUserId] = conn;
        
        localStreamRef.current.getTracks().forEach(track => {
            conn.addTrack(track, localStreamRef.current);
        });

        conn.peerConnection.ontrack = (event) => {
            addRemoteStream(remoteUserId, event.streams[0]);
        };

        conn.createOffer();
    }, [user, sendMessage, addRemoteStream]);

    const handleOffer = useCallback(async (payload) => {
        const remoteUserId = payload.senderId;
        if (isHostRef.current || !localStreamRef.current) return;

        if (peerConnections.current[remoteUserId]) return;

        const conn = new Connection(user.id, remoteUserId, sendMessage, ICE_SERVERS);
        peerConnections.current[remoteUserId] = conn;

        localStreamRef.current.getTracks().forEach(track => {
            conn.addTrack(track, localStreamRef.current);
        });

        conn.peerConnection.ontrack = (event) => {
            addRemoteStream(remoteUserId, event.streams[0]);
        };

        await conn.handleOffer(payload.sdp);
    }, [user, sendMessage, addRemoteStream]);

    const handleHostChanged = useCallback((payload) => {
        Object.keys(peerConnections.current).forEach(userId => cleanupConnection(userId));
        setIsHost(payload.newHostId === user.id);
    }, [user, cleanupConnection]);

    useEffect(() => {
        if (!user) return;

        const handleAnswer = async (payload) => {
            const remoteUserId = payload.senderId;
            await peerConnections.current[remoteUserId]?.handleAnswer(payload.sdp);
        };

        const handleIceCandidate = async (payload) => {
            const remoteUserId = payload.senderId;
            await peerConnections.current[remoteUserId]?.handleIceCandidate(payload.candidate);
        };

        const handleUserLeft = (payload) => {
            cleanupConnection(payload.userId);
        };

        const handleRoomInfo = (payload) => {
            console.log('WebRTCContext: Received room-info, setting global currentRoom.');
            setCurrentRoom(payload.room);
            setIsHost(payload.room.hostId === user.id);
        };

        addMessageListener('room-info', handleRoomInfo);
        addMessageListener('user-joined', handleNewPeer);
        addMessageListener('user-left', handleUserLeft);
        addMessageListener('offer', handleOffer);
        addMessageListener('answer', handleAnswer);
        addMessageListener('ice-candidate', handleIceCandidate);
        addMessageListener('host-changed', handleHostChanged);

        return () => {
            removeMessageListener('room-info', handleRoomInfo);
            removeMessageListener('user-joined', handleNewPeer);
            removeMessageListener('user-left', handleUserLeft);
            removeMessageListener('offer', handleOffer);
            removeMessageListener('answer', handleAnswer);
            removeMessageListener('ice-candidate', handleIceCandidate);
            removeMessageListener('host-changed', handleHostChanged);
        };
    }, [user, sendMessage, cleanupConnection, addRemoteStream, setCurrentRoom, handleNewPeer, handleOffer, handleHostChanged]);

    const leaveRoom = useCallback(async () => {
        if (!roomId || !user) return;
        sendMessage({ type: 'leave-room', payload: { roomId, userId: user.id } });
        Object.keys(peerConnections.current).forEach(userId => cleanupConnection(userId));
        
        // Stop the audio processor, which handles all stream and context cleanup
        await stopProcessing();

        setRoomId(null);
        setIsHost(false);
        setCurrentRoom(null);
    }, [roomId, user, sendMessage, cleanupConnection, setCurrentRoom, stopProcessing]);

    const joinRoom = useCallback(async (newRoomId) => {
        if (!user) return;
        if (roomId && roomId !== newRoomId) await leaveRoom();

        try {
            // 1. Get raw audio stream from microphone
            const rawMicStream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            // 2. Start processing and get the clean stream
            await startProcessing(rawMicStream);

            // 3. Join the room
            setRoomId(newRoomId);
            sendMessage({ type: 'join-room', payload: { roomId: newRoomId, userId: user.id } });

        } catch (error) {
            console.error('Error joining room:', error);
        }
    }, [user, roomId, leaveRoom, sendMessage, startProcessing]);

    const setLocalAudioMuted = useCallback((muted) => {
        Object.values(peerConnections.current).forEach(conn => {
            conn.setAudioEnabled(!muted);
        });
    }, []);

    const value = { joinRoom, leaveRoom, localStream, remoteStreams, setLocalAudioMuted };

    return (
        <WebRTCContext.Provider value={value}>
            {children}
        </WebRTCContext.Provider>
    );
}

WebRTCProvider.propTypes = {
  children: PropTypes.node.isRequired,
};