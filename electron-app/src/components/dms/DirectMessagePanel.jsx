import React, { useState, useEffect, useRef } from 'react';
import { useFriends } from '../../context/FriendsContext';
import { useAuth } from '../../context/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import './DirectMessagePanel.css';

const DirectMessagePanel = () => {
    const { activeConversation, directMessages, friends, sendDirectMessage, setActiveConversation } = useFriends();
    const { user } = useAuth();
    const [messageContent, setMessageContent] = useState('');
    const messagesEndRef = useRef(null);

    const friend = friends.find(f => f.id === activeConversation);
    const messages = directMessages[activeConversation] || [];

    useEffect(() => {
        // Scroll to the bottom of the message list whenever new messages are added
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!friend) {
        return (
            <div className="dm-panel placeholder">
                <p>Select a friend to start a conversation.</p>
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

    return (
        <main className="dm-panel">
            <header className="dm-header">
                <div className="dm-header-info">
                    <span className="dm-header-username">{friend.username}</span>
                    <span className="dm-header-tag">#{friend.tag}</span>
                </div>
                <Button onClick={() => setActiveConversation(null)} variant="secondary">Close</Button>
            </header>

            <div className="dm-messages-container custom-scrollbar">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-wrapper ${msg.sender_id === user.id ? 'sent' : 'received'}`}>
                        <div className="message-bubble">
                            <p className="message-content">{msg.content}</p>
                            <span className="message-timestamp">
                                {new Date(msg.created_at).toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <footer className="dm-footer">
                <form onSubmit={handleSendMessage} className="dm-input-form">
                    <Input
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder={`Message @${friend.username}`}
                        fullWidth
                    />
                    <Button type="submit">Send</Button>
                </form>
            </footer>
        </main>
    );
};

export default DirectMessagePanel;
