import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProfiles } from '../../context/ProfileContext';
import Input from '../common/Input';
import Button from '../common/Button';
import './ChatPanel.css';

const ChatPanel = ({ roomId, messages, onSendMessage }) => {
    const { user } = useAuth();
    const { profiles, getProfile } = useProfiles();
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (messageInput.trim() && user && roomId) {
            onSendMessage(messageInput);
            setMessageInput('');
        }
    };

    const renderMessage = (msg) => {
        const isMyMessage = msg.userId === user.id;
        const profile = profiles[msg.userId];
        const avatarUrl = profile?.profile_image_url
            ? `http://localhost:3001${profile.profile_image_url}`
            : null;

        return (
            <div key={msg.id} className={`chat-message ${isMyMessage ? 'my-message' : 'other-message'}`}>
                <div className="message-avatar">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={msg.username} className="avatar-img" />
                    ) : (
                        <div className="avatar-placeholder">{msg.username.charAt(0)}</div>
                    )}
                </div>
                <div className="message-content">
                    <div className="message-header">
                        <span className="message-username">{msg.username}</span>
                        <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="message-text">{msg.message}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="chat-panel">
            <div className="chat-messages custom-scrollbar">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSend}>
                <Input
                    type="text"
                    placeholder="메시지를 입력하세요..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                />
                <Button type="submit" size="small">➤</Button>
            </form>
        </div>
    );
};

export default ChatPanel;
