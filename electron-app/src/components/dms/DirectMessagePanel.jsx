import React, { useState, useEffect, useRef } from 'react';
import { useFriends } from '../../context/FriendsContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import ProfileAvatar from '../common/ProfileAvatar'; // Import ProfileAvatar
import '../room/ChatPanel.css'; // Import the unified CSS

const DirectMessagePanel = () => {
    const { activeConversation, directMessages, friends, sendDirectMessage, setActiveConversation } = useFriends();
    const { user } = useAuth();
    const [messageContent, setMessageContent] = useState('');
    const messagesEndRef = useRef(null);

    const friend = friends.find(f => f.id === activeConversation);
    const messages = directMessages[activeConversation] || [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!friend) {
        return (
            <div className="chat-panel placeholder">
                <p>친구를 선택하여 대화를 시작하세요.</p>
            </div>
        );
    }

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (messageContent.trim()) {
            sendDirectMessage(friend.id, messageContent);
            setMessageContent('');
        }
    };

    const renderMessage = (msg) => {
        const isMyMessage = msg.sender_id === user.id;
        const messageUser = isMyMessage ? user : friend;

        // The structure now mirrors ChatPanel.jsx
        return (
            <div key={msg.id} className={`chat-message ${isMyMessage ? 'my-message' : 'other-message'}`}>
                {/* For other's messages, avatar is outside */}
                {!isMyMessage && (
                    <div className="message-avatar">
                        <ProfileAvatar user={messageUser} size="small" />
                    </div>
                )}
                <div className="message-content">
                    <div className="message-header">
                        {/* For my messages, avatar is inside and first */}
                        {isMyMessage && (
                            <div className="message-avatar">
                                <ProfileAvatar user={messageUser} size="small" />
                            </div>
                        )}
                        <span className="message-username">{messageUser.username}</span>
                        <span className="message-timestamp">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div className="message-text">{msg.content}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="chat-panel">
            <header className="dm-chat-header">
                <span className="dm-header-username">@ {friend.username}</span>
                <Button onClick={() => setActiveConversation(null)} size="small" variant="secondary">닫기</Button>
            </header>
            <div className="chat-messages custom-scrollbar">
                {messages.map(renderMessage)}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSendMessage}>
                <Input
                    type="text"
                    placeholder={`@${friend.username}에게 메시지 보내기`}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                />
                <Button type="submit" size="small">➤</Button>
            </form>
        </div>
    );
};

export default DirectMessagePanel;
