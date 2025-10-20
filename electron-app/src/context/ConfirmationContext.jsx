import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmationModal from '../components/common/ConfirmationModal';
import PropTypes from 'prop-types';

const ConfirmationContext = createContext(null);

export function useConfirmation() {
    return useContext(ConfirmationContext);
}

export function ConfirmationProvider({ children }) {
    const [modalState, setModalState] = useState({
        isOpen: false,
        message: '',
        onConfirm: () => {},
    });

    const confirmAction = useCallback((message, onConfirm) => {
        setModalState({
            isOpen: true,
            message,
            onConfirm: () => {
                onConfirm();
                setModalState({ isOpen: false, message: '', onConfirm: () => {} });
            },
        });
    }, []);

    const handleCancel = () => {
        setModalState({ isOpen: false, message: '', onConfirm: () => {} });
    };

    return (
        <ConfirmationContext.Provider value={{ confirmAction }}>
            {children}
            <ConfirmationModal
                isOpen={modalState.isOpen}
                message={modalState.message}
                onConfirm={modalState.onConfirm}
                onCancel={handleCancel}
            />
        </ConfirmationContext.Provider>
    );
}

ConfirmationProvider.propTypes = {
    children: PropTypes.node.isRequired,
};
