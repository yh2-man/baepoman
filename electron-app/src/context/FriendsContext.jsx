import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext'; // Import useAuth
import PropTypes from 'prop-types';
import { NOTIFICATION_SOUND_SRC } from '../utils/notificationSound';

const FriendsContext = createContext();

export const useFriends = () => useContext(FriendsContext);

export const FriendsProvider = ({ children }) => {
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState({ incoming: [], outgoing: [] });
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [directMessages, setDirectMessages] = useState({}); // Store messages by friend ID
    const [unreadMessages, setUnreadMessages] = useState({}); // Store unread message counts by friend ID
    const [activeConversation, setActiveConversation] = useState(null); // ID of the friend in the active DM
    const [profiles, setProfiles] = useState({}); // Cache for user profiles { userId: profile }

    const { user, isConnected, isSocketAuthenticated, sendMessage, addMessageListener, removeMessageListener } = useAuth();

    // Ref to hold the current active conversation to avoid re-running the main effect
    const activeConversationRef = useRef(activeConversation);
    useEffect(() => {
        activeConversationRef.current = activeConversation;
    }, [activeConversation]);

    // Helper to update taskbar badge
    const updateTaskbarBadge = useCallback((unreadCounts) => {
        const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

        if (totalUnread === 0) {
            if (window.electron && window.electron.setUnreadBadge) {
                window.electron.setUnreadBadge({ count: 0, dataUrl: null });
            }
            return;
        }

        // Create a canvas to draw the badge
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Draw a red circle
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();

        // Draw the number
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = totalUnread > 99 ? '99+' : String(totalUnread);
        ctx.fillText(text, 16, 16);

        const dataUrl = canvas.toDataURL();
        if (window.electron && window.electron.setUnreadBadge) {
            window.electron.setUnreadBadge({ count: totalUnread, dataUrl });
        }
    }, []);

    // Listen for incoming profile data from the server
    useEffect(() => {
        if (!isSocketAuthenticated) return;

        const handleProfileData = (data) => {
            if (data.user) {
                setProfiles(prev => ({ ...prev, [data.user.id]: data.user }));
            }
        };

        addMessageListener('user-profile-data', handleProfileData);

        return () => {
            removeMessageListener('user-profile-data', handleProfileData);
        };
    }, [isSocketAuthenticated, addMessageListener, removeMessageListener]);

    // Function for components to request a user's profile
    const getProfile = useCallback((userId) => {
        if (!userId) return;
        if (!profiles[userId] && isSocketAuthenticated) {
            sendMessage({ type: 'get-user-profile', payload: { userId } });
        }
    }, [profiles, sendMessage, isSocketAuthenticated]);


    const getDmHistory = useCallback((friendId) => {
        if (isSocketAuthenticated) {
            sendMessage({ type: 'get-dm-history', payload: { friendId } });
        }
    }, [isSocketAuthenticated, sendMessage]);

    const setActiveConversationAndFetchHistory = useCallback((friendId) => {
        setActiveConversation(friendId);
        if (friendId) {
            getDmHistory(friendId);
        }
    }, [getDmHistory]);

    useEffect(() => {
        if (!isSocketAuthenticated || !user) return;

        const handleFriendsList = (data) => {
            setFriends(data.accepted || []);
            setPendingRequests(data.pending || { incoming: [], outgoing: [] });
            setBlockedUsers(data.blocked || []);
        };

        const handleFriendUpdate = (data) => {
            if (data.status === 'accepted') {
                const newFriend = data.user;
                setFriends(prev => [...prev, newFriend]);
                setPendingRequests(prev => ({
                    incoming: prev.incoming.filter(u => u.id !== newFriend.id),
                    outgoing: prev.outgoing.filter(u => u.id !== newFriend.id),
                }));
            }
        };

        const handleFriendRemoved = (data) => {
            const { removedFriendId } = data;
            setFriends(prev => prev.filter(f => f.id !== removedFriendId));
            setDirectMessages(prev => {
                const newDMs = { ...prev };
                delete newDMs[removedFriendId];
                return newDMs;
            });
            // Use the ref to get the current value without adding a dependency
            if (activeConversationRef.current === removedFriendId) {
                setActiveConversation(null);
            }
        };

        const handleFriendRequestReceived = (data) => {
            setPendingRequests(prev => ({
                ...prev,
                incoming: [...prev.incoming.filter(u => u.id !== data.id), data]
            }));
        };

        const handleDirectMessageReceived = (message) => {
            const { sender_id } = message;
            setDirectMessages(prev => ({
                ...prev,
                [sender_id]: [...(prev[sender_id] || []), message]
            }));

            // Play sound
            // To change the sound, replace the file at electron-app/public/sounds/notification.mp3
            const audio = new Audio('/sounds/notification.mp3');
            audio.play().catch(e => console.error("Error playing sound:", e));

            // Use the ref to get the current value without adding a dependency
            if (sender_id !== activeConversationRef.current) {
                setUnreadMessages(prev => {
                    const newUnread = {
                        ...prev,
                        [sender_id]: (prev[sender_id] || 0) + 1,
                    };
                    updateTaskbarBadge(newUnread);
                    return newUnread;
                });
            }
        };

        const handleUserProfileUpdated = (data) => {
            const { userId: updatedUserId, updatedProfile } = data;

            // Update friends list if the updated user is a friend
            setFriends(prevFriends => prevFriends.map(friend =>
                friend.id === updatedUserId ? { ...friend, ...updatedProfile } : friend
            ));

            // Update profiles cache
            setProfiles(prevProfiles => ({
                ...prevProfiles,
                [updatedUserId]: { ...prevProfiles[updatedUserId], ...updatedProfile }
            }));
        };

        const handleDirectMessageSent = (message) => {
            const { receiver_id } = message;
            setDirectMessages(prev => ({
                ...prev,
                [receiver_id]: [...(prev[receiver_id] || []), message]
            }));
        };

        const handleDmHistorySuccess = (data) => {
            const { friendId, messages } = data;
            setDirectMessages(prev => ({
                ...prev,
                [friendId]: messages,
            }));
        };

        const listeners = {
            'friends-list-success': handleFriendsList,
            'friend-update': handleFriendUpdate,
            'friend-removed': handleFriendRemoved,
            'friend-request-received': handleFriendRequestReceived,
            'direct-message-received': handleDirectMessageReceived,
            'direct-message-sent': handleDirectMessageSent,
            'dm-history-success': handleDmHistorySuccess,
            'user-profile-updated': handleUserProfileUpdated,
        };

        const handleFriendRequestDeclined = (payload) => {
            const { declinedUserId } = payload;
            const declinedIdNum = Number(declinedUserId);
            setPendingRequests(prev => ({
                ...prev,
                incoming: prev.incoming.filter(req => req.id !== declinedIdNum),
                outgoing: prev.outgoing.filter(req => req.id !== declinedIdNum),
            }));
        };
        listeners['friend-decline-success'] = handleFriendRequestDeclined;

        Object.entries(listeners).forEach(([type, handler]) => addMessageListener(type, handler));
        sendMessage({ type: 'get-friends-list' });

        return () => {
            Object.entries(listeners).forEach(([type, handler]) => removeMessageListener(type, handler));
        };
    }, [isSocketAuthenticated, user?.id, sendMessage, addMessageListener, removeMessageListener, updateTaskbarBadge]);

    const sendFriendRequest = useCallback((fullTag) => {
        sendMessage({ type: 'friend-request', payload: { fullTag } });
    }, [sendMessage]);

    const acceptFriendRequest = useCallback((requesterId) => {
        sendMessage({ type: 'accept-friend-request', payload: { requesterId } });
    }, [sendMessage]);

    const declineFriendRequest = useCallback((otherUserId) => {
        sendMessage({ type: 'decline-friend-request', payload: { otherUserId } });
    }, [sendMessage]);

    const removeFriend = useCallback((friendId) => {
        sendMessage({ type: 'remove-friend', payload: { friendId } });
    }, [sendMessage]);

    const sendDirectMessage = useCallback((receiverId, content) => {
        sendMessage({ type: 'direct-message', payload: { receiverId, content } });
    }, [sendMessage]);

    const markMessagesAsRead = useCallback((friendId) => {
        if (unreadMessages[friendId] > 0) {
            setUnreadMessages(prev => {
                const newUnread = { ...prev, [friendId]: 0 };
                updateTaskbarBadge(newUnread);
                return newUnread;
            });
        }
    }, [unreadMessages, updateTaskbarBadge]);

    const value = {
        friends,
        pendingRequests,
        blockedUsers,
        directMessages,
        unreadMessages,
        activeConversation,
        setActiveConversation: setActiveConversationAndFetchHistory,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        sendDirectMessage,
        markMessagesAsRead,
        profiles, // Expose profiles
        getProfile, // Expose getProfile
    };

    return (
        <FriendsContext.Provider value={value}>
            {children}
        </FriendsContext.Provider>
    );
};

FriendsProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
