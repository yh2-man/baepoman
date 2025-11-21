import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useChat(roomId) {
    const [chatMessages, setChatMessages] = useState([]);
    const { user, sendMessage, addMessageListener, removeMessageListener } = useAuth();

    useEffect(() => {
        if (!user || !roomId) return;

        // Request chat history on mount
        sendMessage({ type: 'get-chat-history', payload: { roomId } });

        const handleNewMessage = (payload) => {
            // Only add message if it belongs to the current room
            if (payload.roomId === roomId) {
                setChatMessages(prev => [...prev, payload]);
            }
        };

        const handleChatHistory = (payload) => {
            if (payload.roomId === roomId) {
                setChatMessages(payload.messages || []);
            }
        };

        const handleMessageDeleted = (payload) => {
            if (payload.roomId === roomId) {
                setChatMessages(prev =>
                    prev.map(msg =>
                        msg.id === payload.messageId
                            ? { ...msg, deleted_at: new Date().toISOString(), content: '삭제된 메시지입니다.' }
                            : msg
                    )
                );
            }
        };

        addMessageListener('new-message', handleNewMessage);
        addMessageListener('chat-history', handleChatHistory);
        addMessageListener('message-deleted', handleMessageDeleted);

        return () => {
            removeMessageListener('new-message', handleNewMessage);
            removeMessageListener('chat-history', handleChatHistory);
            removeMessageListener('message-deleted', handleMessageDeleted);
        };
    }, [user, roomId, sendMessage, addMessageListener, removeMessageListener]);

    const handleSendMessage = (content) => {
        if (user && roomId && content.trim()) {
            sendMessage({ type: 'chat-message', payload: { roomId, userId: user.id, content } });
        }
    };

    const handleDeleteMessage = (messageId) => {
        if (user && roomId && messageId) {
            sendMessage({ type: 'delete-message', payload: { messageId } });
        }
    };

    return { chatMessages, handleSendMessage, handleDeleteMessage };
}
