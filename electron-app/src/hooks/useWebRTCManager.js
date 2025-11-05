import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection } from '../core/Connection';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function useWebRTCManager({ user, currentRoom, localStream, sendMessage, addMessageListener, removeMessageListener, setCurrentRoom }) {
    const [remoteStreams, setRemoteStreams] = useState({}); // Stores { userId: { stream: MediaStream, isMuted: boolean } }
    const peerConnections = useRef({}); // For everyone: maps userId -> Connection object
    const isHost = currentRoom?.hostId === user?.id;

    // This ref will hold the audio tracks from each user, keyed by userId
    // The host uses this to forward tracks to new peers.
    const userTracks = useRef(new Map()); // Stores { userId: { track: MediaStreamTrack, stream: MediaStream } }
    const streamIdToUserIdMapping = useRef({}); // Stores { streamId: userId } for participant to map incoming streams
    const [_, set_] = useState(0); // Dummy state to force re-render when streamIdToUserIdMapping.current changes

    const cleanupConnections = useCallback(() => {
        console.log('Cleaning up all peer connections...');
        Object.values(peerConnections.current).forEach(conn => conn.close());
        peerConnections.current = {};
        userTracks.current.clear();
        setRemoteStreams({});
        streamIdToUserIdMapping.current = {}; // Clear mapping on cleanup
        set_(prev => prev + 1); // Trigger re-render
    }, []);

    // Effect to re-evaluate remoteStreams when streamIdToUserIdMapping updates
    useEffect(() => {
        setRemoteStreams(prevRemoteStreams => {
            let updated = false;
            const newRemoteStreams = { ...prevRemoteStreams };
            for (const streamId in newRemoteStreams) {
                // If the key is a streamId (not a userId yet) and we now have a mapping for it
                if (streamIdToUserIdMapping.current[streamId] && String(streamId) === String(newRemoteStreams[streamId].stream.id)) {
                    const userId = streamIdToUserIdMapping.current[streamId];
                    newRemoteStreams[userId] = newRemoteStreams[streamId];
                    delete newRemoteStreams[streamId];
                    updated = true;
                }
            }
            return updated ? newRemoteStreams : prevRemoteStreams;
        });
    }, [streamIdToUserIdMapping.current]); // Depend on the ref's current value to trigger effect

    // Generic handler for when a track is received from any peer connection
    const onTrack = useCallback((event, remoteUserId) => {
        console.log(`Received track from user ${remoteUserId}`);
        const remoteStream = event.streams[0];
        if (remoteStream) {
            setRemoteStreams(prev => {
                // Avoid re-adding the same stream
                if (prev[remoteUserId] && prev[remoteUserId].stream.id === remoteStream.id) {
                    return prev;
                }
                return { ...prev, [remoteUserId]: { stream: remoteStream, isMuted: false } }; // Initialize isMuted to false
            });
        }
    }, []);

    // --- HOST-SPECIFIC LOGIC ---
    const handleNewPeerForHost = useCallback((payload) => {
        const remoteUserId = payload.user.id;
        if (String(remoteUserId) === String(user.id) || !localStream) return;
        if (peerConnections.current[remoteUserId]) return;

        console.log(`Host: Handling new peer ${remoteUserId}`);
        const conn = new Connection(user.id, remoteUserId, sendMessage, ICE_SERVERS);
        peerConnections.current[remoteUserId] = conn;

        // 1. Add host's own track to the new connection
        const hostTrack = localStream.getAudioTracks()[0];
        if (hostTrack) {
            conn.addTrack(hostTrack, localStream);
        }

        // 2. Add tracks from all *other* existing peers to this new connection
        userTracks.current.forEach((trackInfo, userId) => {
            if (String(userId) !== String(remoteUserId)) {
                console.log(`Host: Adding existing track from user ${userId} to new peer ${remoteUserId}`);
                conn.addTrack(trackInfo.track, trackInfo.stream); // Pass both track and stream
            }
        });

        // 3. When the host receives the new peer's track...
        conn.peerConnection.ontrack = (event) => {
            const remoteTrack = event.track;
            const remoteStream = event.streams[0]; // Get the stream
            console.log(`Host: Received track from new peer ${remoteUserId}`);
            
            // a. Store the new track and its stream
            userTracks.current.set(remoteUserId, { track: remoteTrack, stream: remoteStream });

            // b. Forward this new track to all *other* connected peers
            Object.entries(peerConnections.current).forEach(([peerId, peerConn]) => {
                if (String(peerId) !== String(remoteUserId)) {
                    console.log(`Host: Forwarding new track from ${remoteUserId} to existing peer ${peerId}`);
                    peerConn.addTrack(remoteTrack, remoteStream); // Pass both track and stream

                    // Re-negotiation is needed to send the new track to existing peers
                    console.log(`Host: Re-negotiating with peer ${peerId} to send the new track.`);
                    peerConn.createOffer();
                }
            });

            // c. The host itself does NOT play remote streams via this mechanism
            // The host's UI can optionally show voice activity, so we still add it to a state
            setRemoteStreams(prev => ({ ...prev, [remoteUserId]: { stream: event.streams[0], isMuted: false } }));

            // Send the stream ID to user ID map to the new peer *after* receiving their track
            const streamIdToUserIdMap = {};
            userTracks.current.forEach((trackInfo, userId) => {
                if (String(userId) !== String(remoteUserId)) { // Exclude the current remoteUser as they just joined
                    streamIdToUserIdMap[trackInfo.stream.id] = userId;
                }
            });
            // Also include the newly received track from remoteUserId
            const newlyReceivedStream = userTracks.current.get(remoteUserId)?.stream;
            if (newlyReceivedStream) {
                streamIdToUserIdMap[newlyReceivedStream.id] = remoteUserId;
            }

            // Also include the host's own stream ID
            if (localStream) {
                streamIdToUserIdMap[localStream.id] = user.id;
            }

            console.log(`Host: Sending stream-id-map to ${remoteUserId}:`, JSON.stringify(streamIdToUserIdMap, null, 2));
            sendMessage({
                type: 'stream-id-map',
                recipientId: remoteUserId,
                payload: streamIdToUserIdMap,
            });
        };

        conn.createOffer();

    }, [user?.id, localStream, sendMessage]);


    // --- PARTICIPANT-SPECIFIC LOGIC ---
    const handleOfferForParticipant = useCallback(async (payload) => {
        const hostId = payload.senderId;
        if (!localStream) return;

        let conn = peerConnections.current[hostId];

        if (conn) {
            // Connection already exists, this is a re-negotiation offer.
            console.log(`Participant: Handling re-negotiation offer from host ${hostId}`);
        } else {
            // This is an initial offer to establish a new connection.
            console.log(`Participant: Handling initial offer from host ${hostId}`);
            conn = new Connection(user.id, hostId, sendMessage, ICE_SERVERS);
            peerConnections.current[hostId] = conn;

            // Participant sends their own audio to the host
            localStream.getTracks().forEach(track => conn.addTrack(track, localStream));

            // Participant receives tracks from the host (which are other users' tracks)
            conn.peerConnection.ontrack = (event) => {
                const newStream = event.streams[0];
                if (newStream) {
                    console.log(`Participant: Received new stream with ID: ${newStream.id}`);
                    const userId = streamIdToUserIdMapping.current[newStream.id];
                    if (userId) {
                        console.log(`Participant: Mapped stream ID ${newStream.id} to userId ${userId}. Updating remoteStreams.`);
                        setRemoteStreams(prev => ({ ...prev, [userId]: { stream: newStream, isMuted: false } }));
                    } else {
                        console.warn(`Participant: Received stream with unknown ID: ${newStream.id}. Cannot map to userId. Current mapping:`, JSON.stringify(streamIdToUserIdMapping.current, null, 2));
                        // Fallback: if userId is not found, use stream.id as a temporary key
                        setRemoteStreams(prev => ({ ...prev, [newStream.id]: { stream: newStream, isMuted: false } }));
                    }
                }
            };
        }

        // For both initial and re-negotiation offers, we need to handle the received SDP.
        await conn.handleOffer(payload.sdp);

    }, [user?.id, localStream, sendMessage]);

    // --- COMMON EVENT LISTENERS ---
    useEffect(() => {
        if (!user) return; // Only depend on user for initial setup

        console.log("useWebRTCManager: Setting up message listeners."); // Added log

        const handleAnswer = (payload) => peerConnections.current[payload.senderId]?.handleAnswer(payload.sdp);
        const handleIceCandidate = (payload) => peerConnections.current[payload.senderId]?.handleIceCandidate(payload.candidate);
        const handleStreamIdMap = (payload) => {
            console.log("Participant: Received stream-id-map payload:", payload);
            streamIdToUserIdMapping.current = { ...streamIdToUserIdMapping.current, ...payload };
            console.log("Participant: Updated streamIdToUserIdMapping:", streamIdToUserIdMapping.current);
            set_(prev => prev + 1); // Trigger re-render
        };
        
        const handleUserLeft = (payload) => {
            const { userId } = payload;
            if (peerConnections.current[userId]) {
                peerConnections.current[userId].close();
                delete peerConnections.current[userId];
            }
            if (userTracks.current.has(userId)) {
                userTracks.current.delete(userId);
            }
            setRemoteStreams(prev => {
                const { [userId]: _, ...rest } = prev;
                // This needs to be smarter if keys are stream IDs
                // For now, we'll clear everything on user-left for simplicity on client side
                return rest;
            });
        };
        
        const handleHostChanged = (p) => {
            console.log("Host changed, cleaning up connections and re-evaluating role.");
            cleanupConnections();
            setCurrentRoom(prev => (prev ? { ...prev, hostId: p.newHostId } : null));
            // The role (isHost) will be re-evaluated on the next render, and the correct
            // listeners ('user-joined' or 'offer') will be attached.
        };

        const handleRoomInfo = (payload) => {
            console.log("Received room-info:", payload.room);
            setCurrentRoom(payload.room);
        };

        const handleMuteStatusChanged = (payload) => {
            console.log(`Mute status changed for user ${payload.userId}: ${payload.isMuted}`);
            setRemoteStreams(prev => ({
                ...prev,
                [payload.userId]: prev[payload.userId] ? { ...prev[payload.userId], isMuted: payload.isMuted } : { stream: null, isMuted: payload.isMuted } // Handle case where stream might not be there yet
            }));
        };

        addMessageListener('answer', handleAnswer);
        addMessageListener('ice-candidate', handleIceCandidate);
        addMessageListener('stream-id-map', handleStreamIdMap);
        addMessageListener('user-left', handleUserLeft);
        addMessageListener('host-changed', handleHostChanged);
        addMessageListener('room-info', handleRoomInfo);
        addMessageListener('mute-status-changed', handleMuteStatusChanged);

        // Role-specific listeners
        // These should only be set up if currentRoom is available to determine isHost
        if (currentRoom) { // <--- Added condition here
            if (isHost) {
                console.log("Role: Host. Listening for 'user-joined'.");
                addMessageListener('user-joined', handleNewPeerForHost);
            } else {
                console.log("Role: Participant. Listening for 'offer'.");
                addMessageListener('offer', handleOfferForParticipant);
            }
        }

        return () => {
            console.log("useWebRTCManager: Cleaning up message listeners."); // Added log
            removeMessageListener('answer', handleAnswer);
            removeMessageListener('ice-candidate', handleIceCandidate);
            removeMessageListener('stream-id-map', handleStreamIdMap);
            removeMessageListener('user-left', handleUserLeft);
            removeMessageListener('host-changed', handleHostChanged);
            removeMessageListener('room-info', handleRoomInfo);
            removeMessageListener('mute-status-changed', handleMuteStatusChanged);
            // Only remove role-specific listeners if they were added
            if (currentRoom) {
                if (isHost) {
                    removeMessageListener('user-joined', handleNewPeerForHost);
                } else {
                    removeMessageListener('offer', handleOfferForParticipant);
                }
            }
        };
    }, [
        user,
        currentRoom,
        isHost,
        addMessageListener,
        removeMessageListener,
        handleNewPeerForHost,
        handleOfferForParticipant,
        cleanupConnections,
        setCurrentRoom,
        streamIdToUserIdMapping
    ]);

    const setLocalAudioMuted = useCallback((muted) => {
        if (!localStream) return;
        const localTrack = localStream.getAudioTracks()[0];
        if (localTrack) {
            localTrack.enabled = !muted;
        }
        // Inform peers for UI update
        sendMessage({
            type: 'mute-status-changed',
            payload: { userId: user.id, isMuted: muted }
        });
    }, [localStream, user?.id, sendMessage]);

    return { remoteStreams, cleanupConnections, setLocalAudioMuted };
}
