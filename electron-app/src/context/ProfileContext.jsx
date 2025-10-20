import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import PropTypes from 'prop-types';

const ProfileContext = createContext(null);

export function useProfiles() {
    return useContext(ProfileContext);
}

export function ProfileProvider({ children }) {
    const { isConnected, sendMessage, addMessageListener, removeMessageListener } = useAuth();
    const [profiles, setProfiles] = useState({}); // Cache for user profiles { userId: profile }

    // Listen for incoming profile data from the server
    useEffect(() => {
        if (!isConnected) return;

        const handleProfileData = (data) => {
            if (data.user) {
                setProfiles(prev => ({ ...prev, [data.user.id]: data.user }));
            }
        };

        addMessageListener('user-profile-data', handleProfileData);

        return () => {
            removeMessageListener('user-profile-data', handleProfileData);
        };
    }, [isConnected, addMessageListener, removeMessageListener]);

    // Function for components to request a user's profile
    const getProfile = useCallback((userId) => {
        if (!userId) return;

        // If profile is not in cache and we haven't requested it recently, send a request
        // (A more robust implementation might track pending requests)
        if (!profiles[userId]) {
            sendMessage({ type: 'get-user-profile', payload: { userId } });
        }
    }, [profiles, sendMessage]);

    const value = {
        profiles,
        getProfile,
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
}

ProfileProvider.propTypes = {
    children: PropTypes.node.isRequired,
};