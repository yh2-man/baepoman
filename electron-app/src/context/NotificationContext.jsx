import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const NotificationContext = createContext(null);

export function useNotification() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now().toString() + Math.random().toString(36).substring(2);
        const newNotification = { id, message, type };
        setNotifications((prev) => [...prev, newNotification]);

        setTimeout(() => {
            setNotifications((prev) => prev.filter((notif) => notif.id !== id));
        }, duration);
    }, []);

    const value = useMemo(() => ({
        notifications,
        addNotification,
    }), [notifications, addNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

// Added PropTypes
NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
