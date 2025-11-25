import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFriends } from '../../context/FriendsContext';
import Input from '../common/Input';
import Button from '../common/Button';
import ProfileAvatar from '../common/ProfileAvatar';
import './ChatPanel.css';

const ChatPanel = ({ roomId, messages, onSendMessage, onDeleteMessage }) => {
    const { user } = useAuth();
    const { profiles, getProfile } = useFriends();
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
        const profile = profiles[msg.userId] || {
            id: msg.userId,
            username: msg.username,
            profile_image_url: msg.profile_image_url
        };

        // If message is soft-deleted, render a placeholder
        if (msg.deletedAt) {
            return (
                <div key={msg.id} className="chat-message deleted-message">
                    <div className="message-content">
                        <div className="message-text">삭제된 메시지입니다.</div>
                    </div>
                </div>
            );
        }

        if (isMyMessage) {
            return (
                <div key={msg.id} className="chat-message my-message">
                    <div className="message-content">
                        <div className="message-header">
                            <button onClick={() => onDeleteMessage(msg.id)} className="delete-message-btn">
                                삭제
                            </button>
                            <div className="message-avatar">
                                <ProfileAvatar user={user} size="small" />
                            </div>
                            <span className="message-username">{user.username}</span>
                            <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="message-text">{msg.content}</div>
                    </div>
                </div>
            );
        }

        // Render for other users
        return (
            <div key={msg.id} className="chat-message other-message">
                <div className="message-avatar">
                    <ProfileAvatar user={profile} size="small" />
                </div>
                <div className="message-content">
                    <div className="message-header">
                        <span className="message-username">{msg.username}</span>
                        <span className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="message-text">{msg.content}</div>
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
