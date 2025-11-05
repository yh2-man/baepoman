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
    const [currentRoom, setCurrentRoom] = useState(null); // State for current room
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { addNotification } = useNotification();
    const { ws, isConnected, sendMessage, addMessageListener, removeMessageListener } = useWebSocketClient('ws://localhost:3001');
    const keepLoggedInRef = useRef(true); // Ref to store login persistence preference

    // Startup effect
    useEffect(() => {
        const bootstrapAuth = async () => {
            try {
                const storedToken = await window.electron.store.get('token');
                if (storedToken) {
                    const response = await fetch('http://localhost:3001/api/me', {
                        headers: { 'Authorization': `Bearer ${storedToken}` },
                    });
                    if (response.ok) {
                        const userData = await response.json();
                        setUser(userData);
                        setToken(storedToken);
                    } else {
                        await window.electron.store.delete('token');
                    }
                }
            } catch (error) {
                console.error("Failed to bootstrap auth:", error);
            }
            setLoading(false);
        };
        bootstrapAuth();
    }, []);

    // WebSocket message listeners effect
    useEffect(() => {
        if (!isConnected) return;

        const handleGenericMessage = (type) => (data) => {
            addNotification(data.message, type);
        };

        const handleLoginSuccess = async (data) => {
            addNotification('로그인 성공!', 'success');
            setUser(data.user);
            setToken(data.token);
            if (keepLoggedInRef.current) { // Check the ref before saving
                await window.electron.store.set('token', data.token);
            }
            navigate('/lobby');
        };

        const handleUpdateProfileSuccess = (data) => {
            addNotification(data.message, 'success');
            if (data.user) {
                setUser(prev => ({ ...prev, ...data.user }));
            }
        };

        const listeners = {
            'login-success': handleLoginSuccess,
            'login-failure': handleGenericMessage('error'),
            'signup-failure': handleGenericMessage('error'),
            'signup-needs-verification': handleGenericMessage('info'),
            'email-verification-success': handleGenericMessage('success'),
            'email-verification-failure': handleGenericMessage('error'),
            'update-profile-success': handleUpdateProfileSuccess,
            'update-profile-failure': handleGenericMessage('error'),
        };

        Object.entries(listeners).forEach(([type, handler]) => addMessageListener(type, handler));
        return () => {
            Object.entries(listeners).forEach(([type, handler]) => removeMessageListener(type, handler));
        };
    }, [isConnected, addMessageListener, removeMessageListener, navigate, addNotification]);

    const loginAndSetPersistence = useCallback((email, password, keepLoggedIn) => {
        keepLoggedInRef.current = keepLoggedIn;
        sendMessage({ type: 'login', payload: { email, password } });
    }, [sendMessage]);

    const logout = useCallback(async () => {
        await window.electron.store.delete('token');
        setUser(null);
        setToken(null);
        navigate('/');
    }, [navigate]);

    const updateUser = useCallback((updatedFields) => {
        setUser(prev => ({ ...prev, ...updatedFields }));
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        currentRoom, // Expose currentRoom
        setCurrentRoom, // Expose setCurrentRoom
        ws,
        isConnected,
        sendMessage,
        addMessageListener,
        removeMessageListener,
        logout,
        updateUser,
        loginAndSetPersistence, // Expose the new login function
    }), [user, token, currentRoom, isConnected]);

    if (loading) {
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