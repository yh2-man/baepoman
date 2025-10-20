import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../context/WebRTCContext'; // Import useWebRTC
import Button from '../common/Button';
import './ActiveCallCard.css';

const ActiveCallCard = () => {
    const { currentRoom } = useAuth();
    const { leaveRoom } = useWebRTC(); // Get leaveRoom from context
    const navigate = useNavigate();

    if (!currentRoom) {
        return null;
    }

    const handleHangUp = () => {
        leaveRoom(); // Simply call the global leaveRoom function
    };

    const handleReturnToRoom = () => {
        navigate(`/room/${currentRoom.id}`);
    };

    return (
        <div className="active-call-card">
            <div className="card-content">
                <span className="live-indicator">●</span>
                <div className="room-info">
                    <span className="card-title">현재 통화 중</span>
                    <span className="room-name">{currentRoom.name}</span>
                </div>
            </div>
            <div className="card-actions">
                <Button onClick={handleReturnToRoom} variant="secondary">돌아가기</Button>
                <Button onClick={handleHangUp} variant="danger">끊기</Button>
            </div>
        </div>
    );
};

export default ActiveCallCard;