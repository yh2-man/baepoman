import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection } from '../core/Connection';
import useVoiceActivity from './useVoiceActivity';

const ICE_SERVERS = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80",
        },
        {
            urls: "turn:standard.relay.metered.ca:80",
            username: "dc4fe6125e68aeb74c1f3ad8",
            credential: "arAWC4/g1XAWIARy",
        },
        {
            urls: "turn:standard.relay.metered.ca:80?transport=tcp",
            username: "dc4fe6125e68aeb74c1f3ad8",
            credential: "arAWC4/g1XAWIARy",
        },
        {
            urls: "turn:standard.relay.metered.ca:443",
            username: "dc4fe6125e68aeb74c1f3ad8",
            credential: "arAWC4/g1XAWIARy",
        },
        {
            urls: "turns:standard.relay.metered.ca:443?transport=tcp",
            username: "dc4fe6125e68aeb74c1f3ad8",
            credential: "arAWC4/g1XAWIARy",
        },
    ],
};

export function useWebRTCManager({ user, currentRoom, localStream, sendMessage, addMessageListener, removeMessageListener, setCurrentRoom }) {
    const [participants, setParticipants] = useState({});
    const peerConnections = useRef({});
    const isHostRef = useRef(false);
    const userTracks = useRef(new Map());
    const streamIdToUserIdMapping = useRef({});

    const [peerVolumes, setPeerVolumes] = useState({});
    const audioElements = useRef({});

    // --- Start of Bug Fix ---
    // Use a ref to hold the local stream to stabilize useCallback dependencies
    const localStreamRef = useRef(localStream);
    useEffect(() => {
        localStreamRef.current = localStream;
    }, [localStream]);
    // --- End of Bug Fix ---

    const { isSpeaking: isLocalUserSpeaking } = useVoiceActivity(localStream, { threshold: 2, delay: 150 });

    const setAudioRef = useCallback((userId, element) => {
        if (element) {
            audioElements.current[userId] = element;
            // Set initial volume when element is registered
            const initialVolume = peerVolumes[userId] ?? 1;
            element.volume = initialVolume;
        } else {
            delete audioElements.current[userId];
        }
    }, [peerVolumes]);


    const setPeerVolume = useCallback((userId, volume) => {
        const newVolume = Math.max(0, Math.min(1, volume));
        setPeerVolumes(prev => ({ ...prev, [userId]: newVolume }));
        if (audioElements.current[userId]) {
            audioElements.current[userId].volume = newVolume;
        }
    }, []);

    useEffect(() => {
        Object.values(peerConnections.current).forEach(conn => {
            conn.sendData({
                type: 'speaking_status',
                payload: { isSpeaking: isLocalUserSpeaking },
            });
        });
    }, [isLocalUserSpeaking]);

    const handleDataMessage = useCallback((message, remoteUserId) => {
        const { type, payload } = message;
        if (type === 'speaking_status') {
            setParticipants(prev => {
                if (!prev[remoteUserId]) return prev;
                return {
                    ...prev,
                    [remoteUserId]: { ...prev[remoteUserId], isSpeaking: payload.isSpeaking },
                };
            });

            if (isHostRef.current) {
                Object.entries(peerConnections.current).forEach(([peerId, conn]) => {
                    if (String(peerId) !== String(remoteUserId)) {
                        conn.sendData({
                            type: 'speaking_status',
                            payload: { userId: remoteUserId, isSpeaking: payload.isSpeaking }
                        });
                    }
                });
            }
        }
    }, []);

    const handleParticipantDataMessage = useCallback((message, fallbackId) => {
        const { type, payload } = message;
        if (type === 'speaking_status') {
            const speakingUserId = payload.userId || fallbackId;
            const { isSpeaking } = payload;

            setParticipants(prev => {
                if (!prev[speakingUserId] || prev[speakingUserId].isSpeaking === isSpeaking) return prev;
                return {
                    ...prev,
                    [speakingUserId]: { ...prev[speakingUserId], isSpeaking: isSpeaking },
                };
            });
        }
    }, []);

    const cleanupPeerConnections = useCallback(() => {
        console.log('Cleaning up peer connections only...');
        Object.values(peerConnections.current).forEach(conn => conn.close());
        peerConnections.current = {};
        userTracks.current.clear();
        streamIdToUserIdMapping.current = {};
    }, []);

    const cleanupAndResetAll = useCallback(() => {
        console.log('Cleaning up all connections and resetting state...');
        cleanupPeerConnections();
        setParticipants({});
        setPeerVolumes({});
    }, [cleanupPeerConnections]);

    const handleNewPeerForHost = useCallback((payload) => {
        const remoteUser = payload.user;
        // Use ref for localStream
        if (String(remoteUser.id) === String(user.id) || !localStreamRef.current) return;
        if (peerConnections.current[remoteUser.id]) return;

        console.log(`Host: Handling new peer ${remoteUser.username} (${remoteUser.id})`);
        setParticipants(prev => ({ ...prev, [remoteUser.id]: { user: remoteUser, stream: null, isMuted: false, isSpeaking: false } }));
        setPeerVolumes(prev => ({ ...prev, [remoteUser.id]: prev[remoteUser.id] ?? 1 }));


        const onDataMessageForConn = (msg) => handleDataMessage(msg, remoteUser.id);
        const conn = new Connection(user.id, remoteUser.id, sendMessage, ICE_SERVERS, onDataMessageForConn);
        peerConnections.current[remoteUser.id] = conn;
        conn.createDataChannel('voice-activity');

        const hostTrack = localStreamRef.current.getAudioTracks()[0];
        if (hostTrack) conn.addTrack(hostTrack, localStreamRef.current);

        userTracks.current.forEach((trackInfo, userId) => {
            if (String(userId) !== String(remoteUser.id)) {
                conn.addTrack(trackInfo.track, trackInfo.stream);
            }
        });

        const streamIdToUserIdMap = {};
        userTracks.current.forEach((trackInfo, userId) => {
            streamIdToUserIdMap[trackInfo.stream.id] = userId;
        });
        if (localStreamRef.current) {
            streamIdToUserIdMap[localStreamRef.current.id] = user.id;
        }

        sendMessage({
            type: 'stream-id-map',
            payload: { targetUserId: remoteUser.id, ...streamIdToUserIdMap },
        });

        conn.peerConnection.ontrack = (event) => {
            const remoteTrack = event.track;
            const remoteStream = event.streams[0];
            console.log(`Host: Received track from new peer ${remoteUser.id}`);

            userTracks.current.set(remoteUser.id, { track: remoteTrack, stream: remoteStream });

            Object.entries(peerConnections.current).forEach(([peerId, peerConn]) => {
                if (String(peerId) !== String(remoteUser.id)) {
                    console.log(`Host: Relaying track from ${remoteUser.id} to ${peerId}.`);
                    const mapUpdate = { [remoteStream.id]: remoteUser.id };
                    sendMessage({
                        type: 'stream-id-map',
                        payload: { targetUserId: peerId, ...mapUpdate },
                    });
                    peerConn.addTrack(remoteTrack, remoteStream);
                    peerConn.createOffer();
                }
            });

            setParticipants(prev => ({
                ...prev,
                [remoteUser.id]: { ...prev[remoteUser.id], stream: remoteStream }
            }));
        };

        conn.createOffer();
    }, [user?.id, sendMessage, handleDataMessage]); // Removed localStream

    const handleNewPeerForParticipant = useCallback((payload) => {
        const remoteUser = payload.user;
        if (String(remoteUser.id) === String(user.id)) return;
        console.log(`Participant: Notified of new peer ${remoteUser.username} (${remoteUser.id})`);
        setParticipants(prev => ({ ...prev, [remoteUser.id]: { user: remoteUser, stream: null, isMuted: false, isSpeaking: false } }));
        setPeerVolumes(prev => ({ ...prev, [remoteUser.id]: prev[remoteUser.id] ?? 1 }));
    }, [user?.id]);

    const handleOfferForParticipant = useCallback(async (payload) => {
        const hostId = payload.senderId;
        // Use ref for localStream
        if (!localStreamRef.current) {
            console.error("handleOfferForParticipant called but localStream is not ready.");
            return;
        };

        let conn = peerConnections.current[hostId];
        if (!conn) {
            const onDataMessageForConn = (msg) => handleParticipantDataMessage(msg, hostId);
            conn = new Connection(user.id, hostId, sendMessage, ICE_SERVERS, onDataMessageForConn);
            peerConnections.current[hostId] = conn;
            localStreamRef.current.getTracks().forEach(track => conn.addTrack(track, localStreamRef.current));

            conn.peerConnection.ontrack = (event) => {
                const newStream = event.streams[0];
                if (newStream) {
                    const userId = streamIdToUserIdMapping.current[newStream.id];
                    if (userId) {
                        setParticipants(prev => ({
                            ...prev,
                            [userId]: { ...(prev[userId] || {}), stream: newStream }
                        }));
                    }
                }
            };
        }
        await conn.handleOffer(payload.sdp);
    }, [user?.id, sendMessage, handleParticipantDataMessage]); // Removed localStream

    useEffect(() => {
        if (!user) return;

        const handleAnswer = (p) => peerConnections.current[p.senderId]?.handleAnswer(p.sdp);
        const handleIceCandidate = (p) => peerConnections.current[p.senderId]?.handleIceCandidate(p.candidate);

        const handleStreamIdMap = (payload) => {
            const { senderId, targetUserId, ...mapData } = payload;
            streamIdToUserIdMapping.current = { ...streamIdToUserIdMapping.current, ...mapData };
        };

        const handlePeerDisconnected = (payload) => {
            const { userId } = payload;
            if (!userId || !peerConnections.current[userId]) return;

            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
            userTracks.current.delete(userId);

            setParticipants(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });
            setPeerVolumes(prev => {
                const newVolumes = { ...prev };
                delete newVolumes[userId];
                return newVolumes;
            });
        };

        const manageRoleSpecificListeners = (isNewHost) => {
            removeMessageListener('user-joined', handleNewPeerForHost);
            removeMessageListener('offer', handleOfferForParticipant);
            removeMessageListener('user-joined', handleNewPeerForParticipant);

            if (isNewHost) {
                addMessageListener('user-joined', handleNewPeerForHost);
            } else {
                addMessageListener('offer', handleOfferForParticipant);
                addMessageListener('user-joined', handleNewPeerForParticipant);
            }
        };

        const handleHostChanged = (p) => {
            const newHostId = p.newHostId;
            const amINewHost = String(user.id) === String(newHostId);
            isHostRef.current = amINewHost;

            if (!amINewHost) {
                console.log(`[Host Change] New host is ${newHostId}. Disconnecting from old peer.`);
                cleanupPeerConnections();
            }

            setCurrentRoom(prev => (prev ? { ...prev, hostId: newHostId } : null));
            manageRoleSpecificListeners(amINewHost);
        };

        const handleRoomInfo = (payload) => {
            if (!payload.room) return;
            setCurrentRoom(payload.room);

            const amIHost = payload.room.hostId === user.id;
            isHostRef.current = amIHost;
            manageRoleSpecificListeners(amIHost);

            const initialParticipants = {};
            const initialVolumes = {};
            if (payload.participants) {
                payload.participants.forEach(p => {
                    if (p.id !== user.id) {
                        initialParticipants[p.id] = { user: p, stream: null, isMuted: false, isSpeaking: false };
                        initialVolumes[p.id] = 1; // Default volume
                    }
                });
            }
            setParticipants(initialParticipants);
            setPeerVolumes(initialVolumes);
        };

        const handleMuteStatusChanged = (payload) => {
            setParticipants(prev => {
                if (!prev[payload.userId]) return prev;
                return {
                    ...prev,
                    [payload.userId]: { ...prev[payload.userId], isMuted: payload.isMuted }
                };
            });

            if (isHostRef.current) {
                Object.entries(peerConnections.current).forEach(([peerId, conn]) => {
                    if (payload.senderId && String(peerId) === String(payload.senderId)) return;
                    sendMessage({
                        type: 'mute-status-changed',
                        payload: { targetUserId: peerId, userId: payload.userId, isMuted: payload.isMuted }
                    });
                });
            }
        };

        addMessageListener('answer', handleAnswer);
        addMessageListener('ice-candidate', handleIceCandidate);
        addMessageListener('stream-id-map', handleStreamIdMap);
        addMessageListener('user-left', handlePeerDisconnected);
        addMessageListener('host-changed', handleHostChanged);
        addMessageListener('room-info', handleRoomInfo);
        addMessageListener('mute-status-changed', handleMuteStatusChanged);

        return () => {
            removeMessageListener('answer', handleAnswer);
            removeMessageListener('ice-candidate', handleIceCandidate);
            removeMessageListener('stream-id-map', handleStreamIdMap);
            removeMessageListener('user-left', handlePeerDisconnected);
            removeMessageListener('host-changed', handleHostChanged);
            removeMessageListener('room-info', handleRoomInfo);
            removeMessageListener('mute-status-changed', handleMuteStatusChanged);

            removeMessageListener('user-joined', handleNewPeerForHost);
            removeMessageListener('offer', handleOfferForParticipant);
            removeMessageListener('user-joined', handleNewPeerForParticipant);
        };
    }, [user, addMessageListener, removeMessageListener, cleanupPeerConnections, setCurrentRoom, handleNewPeerForHost, handleNewPeerForParticipant, handleDataMessage]);

    const setLocalAudioMuted = useCallback((muted) => {
        if (!localStreamRef.current) return;
        localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !muted);
        sendMessage({ type: 'mute-status-changed', payload: { userId: user.id, isMuted: muted } });
    }, [user?.id, sendMessage]);

    return { participants, cleanupAndResetAll, setLocalAudioMuted, isLocalUserSpeaking, peerVolumes, setPeerVolume, setAudioRef };
}
