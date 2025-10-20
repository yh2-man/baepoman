import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { Connection } from '../core/Connection.js';
import PropTypes from 'prop-types';

const WebRTCContext = createContext(null);

export function useWebRTC() {
    return useContext(WebRTCContext);
}

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

export function WebRTCProvider({ children }) {
    const { user, sendMessage, addMessageListener, removeMessageListener, setCurrentRoom } = useAuth();
    
    const [localStream, setLocalStream] = useState(null);
    const [remoteStreams, setRemoteStreams] = useState({});
    const peerConnections = useRef({});
    const [isHost, setIsHost] = useState(false);
    const [roomId, setRoomId] = useState(null);

    // Use refs to hold state values for use in callbacks without re-triggering effects
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

        if (peerConnections.current[remoteUserId]) {
            return;
        }
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
        if (isHostRef.current || !localStreamRef.current) {
            return;
        }

        if (peerConnections.current[remoteUserId]) {
            return;
        }
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
        console.log(`[DEBUG] Host changed to: ${payload.newHostId}`);
        // Clean up all existing peer connections
        Object.keys(peerConnections.current).forEach(userId => cleanupConnection(userId));
        // Update host status
        setIsHost(payload.newHostId === user.id);
        // The server will re-send 'user-joined' messages to trigger new connections
    }, [user, cleanupConnection]);

    // Main signaling and WebRTC setup effect
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

    const leaveRoom = useCallback(() => {
        if (!roomId || !user) return;
        sendMessage({ type: 'leave-room', payload: { roomId, userId: user.id } });
        Object.keys(peerConnections.current).forEach(userId => cleanupConnection(userId));
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setRoomId(null);
        setIsHost(false);
        setCurrentRoom(null);
    }, [roomId, user, localStream, sendMessage, cleanupConnection, setCurrentRoom]);

    const joinRoom = useCallback(async (newRoomId) => {
        if (!user) return;
        if (roomId && roomId !== newRoomId) leaveRoom();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });
            setLocalStream(stream);
            setRoomId(newRoomId);
            sendMessage({ type: 'join-room', payload: { roomId: newRoomId, userId: user.id } });
        } catch (error) {
            console.error('Error getting user media:', error);
        }
    }, [user, roomId, leaveRoom, sendMessage]);

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