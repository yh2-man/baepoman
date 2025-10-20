import React from 'react';
import Button from './Button';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="confirmation-modal-backdrop">
            <div className="confirmation-modal-content">
                <p>{message}</p>
                <div className="confirmation-modal-actions">
                    <Button onClick={onCancel} variant="secondary">취소</Button>
                    <Button onClick={onConfirm} variant="danger">확인</Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
