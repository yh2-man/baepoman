import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocketClient } from '../hooks/useWebSocketClient';
import { useNotification } from './NotificationContext';
import PropTypes from 'prop-types';

export const AuthContext = createContext(null);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [currentRoom, setCurrentRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rooms, setRooms] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isSocketAuthenticated, setIsSocketAuthenticated] = useState(false); // New state
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { isConnected, sendMessage, addMessageListener, removeMessageListener, disconnect, connect } = useWebSocketClient('ws://localhost:3001');
    const keepLoggedInRef = useRef(true);

    // Effect to handle socket connection status changes
    useEffect(() => {
        if (!isConnected) {
            setIsSocketAuthenticated(false);
        }
    }, [isConnected]);

    // Effect 1: Bootstrap auth
    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                const storedToken = await window.electron.store.get('token');
                if (storedToken) {
                    setToken(storedToken);
                    connect();
                } else {
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to bootstrap auth:", error);
                setLoading(false);
            }
        };
        bootstrapAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect 2: Authenticate when ready
    useEffect(() => {
        if (token && isConnected && !isSocketAuthenticated) {
            sendMessage({ type: 'reauthenticate', payload: { token } });
        }
    }, [token, isConnected, isSocketAuthenticated, sendMessage]);

    // Effect 3: Manages general WebSocket message listeners
    useEffect(() => {
        if (!isConnected) return;

        const handleGenericMessage = (type) => (data) => addNotification(data.message, type);

        const handleLoginSuccess = async (data) => {
            addNotification('로그인 성공!', 'success');
            setUser(data.user);
            setToken(data.token);
            setIsSocketAuthenticated(true); // Set auth state
            if (keepLoggedInRef.current) {
                await window.electron.store.set('token', data.token);
            }
            // Navigation is now handled by the component that calls login
        };

        const handleReauthSuccess = async (data) => {
            const response = await fetch('http://localhost:3001/api/me', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setIsSocketAuthenticated(true); // Set auth state
            } else {
                await window.electron.store.delete('token');
                setUser(null);
                setToken(null);
                setIsSocketAuthenticated(false);
            }
            setLoading(false);
        };
        
        const handleUpdateProfileSuccess = (data) => {
            addNotification(data.message, 'success');
            if (data.user) {
                setUser(prev => ({ ...prev, ...data.user }));
            }
        };

        const listeners = {
            'error': handleGenericMessage('error'), // Generic error handler
            'login-success': handleLoginSuccess,
            'reauthentication-success': handleReauthSuccess, // New handler
            'login-failure': handleGenericMessage('error'),
            'signup-failure': handleGenericMessage('error'),
            'signup-needs-verification': handleGenericMessage('info'),
            'email-verification-success': handleGenericMessage('success'),
            'email-verification-failure': handleGenericMessage('error'),
            'update-profile-success': handleUpdateProfileSuccess,
            'update-profile-failure': handleGenericMessage('error'),
        };

        Object.entries(listeners).forEach(([type, handler]) => addMessageListener(type, handler));
        return () => Object.entries(listeners).forEach(([type, handler]) => removeMessageListener(type, handler));
    }, [isConnected, addMessageListener, removeMessageListener, navigate, addNotification, token]);

    // Effect 4: Manages lobby and room-related WebSocket listeners
    useEffect(() => {
        if (!isSocketAuthenticated) return; // Only listen if authenticated

        const handleRoomsList = (roomList) => {
            const formattedRooms = roomList.map(room => ({
                ...room,
                roomId: room.id,
                roomName: room.name,
                category: room.categoryName,
            }));
            setRooms(formattedRooms);
        };

        const handleRoomCreated = (newRoom) => {
            if (newRoom.isPrivate || newRoom.roomType !== 'group') return;
            const formattedNewRoom = {
                ...newRoom,
                roomId: newRoom.id,
                roomName: newRoom.name,
                category: newRoom.categoryName,
            };
            setRooms(prevRooms => [formattedNewRoom, ...prevRooms.filter(r => r.id !== newRoom.id)]);
        };

        const handleRoomDeleted = ({ roomId }) => {
            const numericRoomId = parseInt(roomId, 10);
            setRooms(prevRooms => prevRooms.filter(room => room.roomId !== numericRoomId));
        };

        const handleRoomUpdated = (payload) => {
            console.log('[AuthContext] Received room-updated event:', payload); // DEBUG LOG
            const { roomId, participantCount, hostId, hostName, roomType, isPrivate } = payload;
            const numericRoomId = parseInt(roomId, 10);
            setRooms(prevRooms =>
                prevRooms.map(room =>
                    room.roomId === numericRoomId ? { ...room, participantCount, hostId, hostName, roomType, isPrivate } : room
                )
            );
        };
        
        const handleCategoriesList = (categoryList) => setCategories(categoryList);
        
        const listeners = {
            'rooms-list': handleRoomsList,
            'room-created': handleRoomCreated,
            'room-deleted': handleRoomDeleted,
            'room-updated': handleRoomUpdated,
            'categories-list': handleCategoriesList,
        };

        Object.entries(listeners).forEach(([type, handler]) => addMessageListener(type, handler));
        return () => Object.entries(listeners).forEach(([type, handler]) => removeMessageListener(type, handler));
    }, [isSocketAuthenticated, addMessageListener, removeMessageListener]);

    const loginAndSetPersistence = useCallback((email, password, keepLoggedIn) => {
        keepLoggedInRef.current = keepLoggedIn;
        connect();
        setTimeout(() => sendMessage({ type: 'login', payload: { email, password } }), 100);
    }, [sendMessage, connect]);

    const signup = useCallback((username, email, password) => {
        connect(); 
        setTimeout(() => {
            sendMessage({ type: 'signup', payload: { username, email, password } });
        }, 100);
    }, [sendMessage, connect]);

    const verifyEmail = useCallback((email, code) => {
        sendMessage({ type: 'verify-email', payload: { email, code } });
    }, [sendMessage]);

    const logout = useCallback(async () => {
        if (disconnect) disconnect();
        await window.electron.store.delete('token');
        setUser(null);
        setToken(null);
        setCurrentRoom(null);
        setRooms([]);
        setCategories([]);
        setIsSocketAuthenticated(false); // Reset on logout
        navigate('/');
    }, [navigate, disconnect]);

    const updateUser = useCallback((updatedFields) => {
        setUser(prev => {
            return { ...prev, ...updatedFields };
        });
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        loading,
        currentRoom,
        setCurrentRoom,
        isConnected,
        isSocketAuthenticated, // Expose new state
        sendMessage,
        addMessageListener,
        removeMessageListener,
        logout,
        updateUser,
        loginAndSetPersistence, // Expose the new login function
        signup, // Expose signup
        verifyEmail, // Expose verifyEmail
        disconnect,
        connect,
        rooms,
        categories,
    }), [user, token, loading, currentRoom, isConnected, isSocketAuthenticated, sendMessage, addMessageListener, removeMessageListener, logout, updateUser, loginAndSetPersistence, disconnect, connect, rooms, categories]);

    if (loading && !token) { // Adjust loading condition
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};