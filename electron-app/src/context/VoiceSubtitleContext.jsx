import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

const VoiceSubtitleContext = createContext(null);

export function useVoiceSubtitle() {
    return useContext(VoiceSubtitleContext);
}

export function VoiceSubtitleProvider({ children }) {
    const [showVoiceSubtitleChat, setShowVoiceSubtitleChat] = useState(false);

    const toggleVoiceSubtitleChat = useCallback(() => {
        setShowVoiceSubtitleChat(prev => !prev);
    }, []);

    const value = useMemo(() => ({
        showVoiceSubtitleChat,
        toggleVoiceSubtitleChat,
    }), [showVoiceSubtitleChat, toggleVoiceSubtitleChat]);

    return (
        <VoiceSubtitleContext.Provider value={value}>
            {children}
        </VoiceSubtitleContext.Provider>
    );
}

VoiceSubtitleProvider.propTypes = {
  children: PropTypes.node.isRequired,
};